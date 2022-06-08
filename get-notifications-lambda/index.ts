import * as λ from 'aws-lambda';
import { AppSyncResolverHandler } from 'aws-lambda';
import * as α from './appsync';
import { S3, DynamoDB } from 'aws-sdk';

const s3 = new S3();
const ddb = new DynamoDB.DocumentClient();
const threadDbTableName: string = process.env.threadDb!;

export async function main(event: AppSyncResolverHandler<α.QueryGetNotificationsArgs, Array<α.Notification>>, context: λ.Context): Promise<any> {
    console.log({
        level: "debug",
        event,
    });

    let { startNotificationIndex, endNotificationIndex, threadId }: α.QueryGetNotificationsArgs = event.arguments;

    let params: DynamoDB.DocumentClient.BatchGetItemInput = {
        RequestItems: {
            [threadDbTableName]: {
                Keys: range(startNotificationIndex + 1, endNotificationIndex + 1).map(notificationIndex => {
                    return { threadId, notificationIndex }
                })
            }
        }
    };
    let response: DynamoDB.DocumentClient.BatchGetItemOutput = await ddb.batchGet(params).promise();
    console.log({
        level: "debug",
        params,
        response,
    });
}

function range(start: number, end: number): Array<number> {
    let result = [];
    for (let i = start; i < end; i++) {
        result.push(i);
    }
    return result;
}