import * as λ from 'aws-lambda';
import { S3, DynamoDB } from 'aws-sdk';
import { ThreadRecord, updateThreadRecordLastViewed } from 'enimerosi-ts-lib/src'; // "/src"??

const ddb = new DynamoDB.DocumentClient();
const threadDbTableName: string = process.env.threadDb!;

interface AllThreadsResult {
    threads: Array<ThreadRecord>,
    nextPage?: string
}

export async function getAllThreadsInDb(
    startKey?: string,
): Promise<AllThreadsResult> {
    console.log({
        level: "debug",
        message: "allThreads invoked",
    });

    let scanInput: DynamoDB.DocumentClient.ScanInput = {
        TableName: threadDbTableName,
        ExclusiveStartKey: startKey === undefined ? undefined : JSON.parse(startKey),
    };
    console.log({
        level: "debug",
        scanInput: JSON.stringify(scanInput, undefined, 2),
    });
    let scanOutput: DynamoDB.DocumentClient.ScanOutput = await ddb.scan(scanInput).promise();
    console.log({
        level: "debug",
        scanOutput: JSON.stringify(scanOutput, undefined, 2),
    });
    let result: AllThreadsResult = {
        threads: scanOutput.Items! as Array<ThreadRecord>,
    };

    if (scanOutput.LastEvaluatedKey) {
        result.nextPage = JSON.stringify(scanOutput.LastEvaluatedKey);
    }

    console.log({
        level: "debug",
        result: JSON.stringify(result, undefined, 2),
    });

    return result;
}

export async function getThreadDataInDb(
    threadId: string
): Promise<ThreadRecord | undefined> {
    let getInput: DynamoDB.DocumentClient.GetItemInput = {
        TableName: threadDbTableName,
        Key: { threadId },

    };
    let getOutput: DynamoDB.DocumentClient.GetItemOutput = await ddb.get(getInput).promise();
    if (getOutput.Item === null)
        return undefined;
    return getOutput.Item as ThreadRecord;
}

export async function updateLastViewedInDb(
    threadId: string
) {
    console.log({
        level: "debug",
        note: "updateLastViewedInDb",
        threadId,
    });

    for (let retry = 0; retry < 32; retry++) {
        let oldThreadData = await getThreadDataInDb(threadId);
        console.log({
            level: "debug",
            note: "updateLastViewedInDb",
            threadId,
            oldThreadData,
        });
        if (oldThreadData === undefined) {
            return;
        }

        let newThreadData = updateThreadRecordLastViewed(oldThreadData);
        if (await tryStoreDbThread(oldThreadData, newThreadData)) {
            return;
        }
    }

    throw new Error("too many transaction failures")
}

async function tryStoreDbThread(
    oldThreadData: ThreadRecord,
    newThreadData: ThreadRecord,
): Promise<boolean> {
    console.log({
        level: "debug",
        note: "tryStoreDbThread",
        oldThreadData: JSON.stringify(oldThreadData, undefined, 2),
        newThreadData: JSON.stringify(newThreadData, undefined, 2),
    });
    let parameters: DynamoDB.DocumentClient.TransactWriteItemsInput = {
        TransactItems: [
            {
                Put: {
                    Item: newThreadData,
                    TableName: threadDbTableName,
                    ConditionExpression: "numNotifications = :numNotifications and lastViewed = :lastViewed",
                    ExpressionAttributeValues: {
                        ":numNotifications": oldThreadData.numNotifications,
                        ":lastViewed": oldThreadData.lastViewed,
                    },
                }
            },
        ],
    };
    try {
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