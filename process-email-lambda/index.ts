import { Context, S3Event } from 'aws-lambda';
import { S3, DynamoDB } from 'aws-sdk';
import { GithubEmailNotification, ThreadRecord, updateThreadRecord, NotificationRecord, tokenize } from 'enimerosi-ts-lib/src'; // "/src"??

const ddb = new DynamoDB.DocumentClient();
const s3 = new S3({});
const threadDbTableName: string = process.env.threadDb!;
const notificationsDbTableName: string = process.env.notificationsDb!;

export async function main(event: S3Event, context: Context): Promise<any> {
    console.log({
        level: "debug",
        event,
    });

    for (let record of event.Records) {
        let bucket = record.s3.bucket.name;
        let messageId = record.s3.object.key;
        console.log({
            level: "debug",
            note: "email retreived",
            messageId,
            bucket,
        });
        try {
            let messageContents = await s3.getObject({ Bucket: bucket, Key: messageId }).promise();
            let body = messageContents.Body!.toString();
            let notification = await GithubEmailNotification.fromMailText(body);
            let token = tokenize(messageId);
            console.log({
                level: "debug",
                note: "email parsed",
                notification,
            });
            let counter = 0;
            while (true) {
                let dbThread = await fetchDbThread(notification);
                let newDbThread = updateThreadRecord(dbThread, notification);
                let newDbNotification: NotificationRecord = {
                    threadId: notification.threadId.idString,
                    notificationIndex: newDbThread.numNotifications - 1,
                    notificationType: "email",
                    bucket,
                    key: messageId,
                };
                if (await tryStoreDbThreadAndNotification(token, dbThread, newDbThread, newDbNotification)) {
                    break;
                } else {
                    counter += 1;

                    // wait a (very) little bit to avoid too much contention
                    await sleep(Math.random() * 250);
                }

                if (counter > 32) {
                    // after 32 tries, we give up
                    throw new Error("too many transaction failures")
                }
            }
        } catch (e) {
            console.log({
                level: "error",
                note: "encountered error processing message, giving up",
                messageId,
                bucket,
                error: e,
            });
        }
    }

    return {};
};

export async function fetchDbThread(notification: GithubEmailNotification): Promise<ThreadRecord | undefined> {
    let parameters = {
        TableName: threadDbTableName,
        Key: { threadId: notification.threadId.idString },
    };
    console.log({
        level: "debug",
        note: "fetching thread from dynamodb",
        parameters,
    });
    let response = await ddb.get(parameters).promise();
    if (response.Item === null) {
        return undefined;
    }
    let json = response.Item;
    return json as ThreadRecord; // ??
}

export async function tryStoreDbThreadAndNotification(token: string, oldDbThread: ThreadRecord | undefined, newDbThread: ThreadRecord, newDbNotification: NotificationRecord): Promise<boolean> {
    console.log({
        level: "debug",
        note: "tryStoreDbThreadAndNotification() invoked",
        token,
        oldDbThread,
        newDbThread,
        newDbNotification,
        threadDbTableName,
    });

    let ddb = new DynamoDB.DocumentClient();

    let putNewThread: DynamoDB.DocumentClient.TransactWriteItem = (oldDbThread === undefined
        ? {
            Put: {
                Item: newDbThread,
                TableName: threadDbTableName,
                ConditionExpression: "attribute_not_exists(numNotifications)",
            }
        }
        : {
            Put: {
                Item: newDbThread,
                TableName: threadDbTableName,
                ConditionExpression: "numNotifications = :numNotifications",
                ExpressionAttributeValues: { ":numNotifications": oldDbThread.numNotifications },
            }
        }
    );

    let parameters: DynamoDB.DocumentClient.TransactWriteItemsInput = {
        TransactItems: [
            putNewThread,
            {
                Put: {
                    Item: newDbNotification,
                    TableName: notificationsDbTableName,
                    ConditionExpression: "attribute_not_exists(notificationIndex)",
                }
            },
        ],

        ClientRequestToken: token,
    };
    try {
        console.log({
            level: "debug",
            note: "submitting dynamodb transaction",
            parameters: JSON.stringify(parameters, undefined, 2),
        });
        let result = await ddb.transactWrite(parameters).promise();
        console.log({
            level: "debug",
            note: "transaction succeeded",
            parameters: JSON.stringify(parameters, undefined, 2),
            result: JSON.stringify(result, undefined, 2),
        });
        return true;
    } catch (error) {
        // Presumably a transaction failure -- I don't know how to check more precisely that this is what it is,
        // could of course also be a network failure of some other kind or something. Maybe it doesn't matter.
        console.log({
            level: "debug",
            note: "transaction failed",
            parameters: JSON.stringify(parameters, undefined, 2),
            error,
        });
        return false;
    }
}

function sleep(ms: number) {
    // from https://stackoverflow.com/a/39914235
    return new Promise(resolve => setTimeout(resolve, ms));
}