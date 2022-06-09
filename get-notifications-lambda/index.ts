import * as λ from 'aws-lambda';
import { AppSyncResolverHandler } from 'aws-lambda';
import * as α from './appsync';
import { S3, DynamoDB } from 'aws-sdk';
import { GithubEmailNotification, NotificationRecord } from 'enimerosi-ts-lib/src';
import { BucketNotificationDestinationType } from 'aws-cdk-lib/aws-s3';

const s3 = new S3();
const ddb = new DynamoDB.DocumentClient();
const threadDbTableName: string = process.env.threadDb!;
const notificationsDbTableName: string = process.env.notificationsDb!;

export async function main(event: AppSyncResolverHandler<α.QueryGetNotificationsArgs, Array<α.Notification>>, context: λ.Context): Promise<Array<α.Notification>> {
    console.log({
        level: "debug",
        event,
    });

    let { startNotificationIndex, endNotificationIndex, threadId }: α.QueryGetNotificationsArgs = event.arguments;

    let params: DynamoDB.DocumentClient.BatchGetItemInput = {
        RequestItems: {
            [notificationsDbTableName]: {
                Keys: range(startNotificationIndex, endNotificationIndex).map(notificationIndex => {
                    return { threadId, notificationIndex }
                })
            }
        }
    };
    console.log({
        level: "debug",
        params: JSON.stringify(params, undefined, 2),
    });
    let responses: DynamoDB.DocumentClient.BatchGetItemOutput = await ddb.batchGet(params).promise();
    console.log({
        level: "debug",
        params,
        responses: JSON.stringify(responses, undefined, 2),
    });
    let results = [];
    let dbRecords = responses.Responses![notificationsDbTableName] as Array<NotificationRecord>;
    for (let dbRecord of dbRecords) {
        let notification = await loadNotification(dbRecord);
        results.push({
            author: notification.sender,
            html: notification.html,
        });
    }
    console.log({
        level: "debug",
        results: JSON.stringify(results, undefined, 2),
    });
    return results;
}

function range(start: number, end: number): Array<number> {
    let result = [];
    for (let i = start; i < end; i++) {
        result.push(i);
    }
    return result;
}

async function loadNotification(dbRecord: NotificationRecord): Promise<GithubEmailNotification> {
    let messageContents = await s3.getObject({ Bucket: dbRecord.bucket, Key: dbRecord.key }).promise();
    let body = messageContents.Body!.toString();
    return await GithubEmailNotification.fromMailText(body);
}