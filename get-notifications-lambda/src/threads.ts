import * as λ from 'aws-lambda';
import { APIGatewayEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import { S3, DynamoDB } from 'aws-sdk';
import { GithubEmailNotification, NotificationRecord } from 'enimerosi-ts-lib/src';

export { thread_gateway_event };

const s3 = new S3();
const ddb = new DynamoDB.DocumentClient();
const threadDbTableName: string = process.env.threadDb!;
const notificationsDbTableName: string = process.env.notificationsDb!;

async function thread_gateway_event(
    event: APIGatewayEvent,
    context: Context
): Promise<APIGatewayProxyResult> {
    console.log({
        level: "debug",
        event,
    });
    switch (event.resource) {
        case "/threads": return getThreads(event, context);
        case "/threads/{thread}": return getThread(event, context);
        default: throw new Error(`unrecognized resource ${event.resource}`);
    }
}

async function getThreads(
    event: APIGatewayEvent,
    context: Context
): Promise<APIGatewayProxyResult> {
    let responseBody = {
        message: "hi",
        input: event
    };

    return {
        statusCode: 200,
        body: JSON.stringify(responseBody)
    };
}

interface ThreadParameters {
    thread: string
}

async function getThread(
    event: APIGatewayEvent,
    context: Context
): Promise<APIGatewayProxyResult> {
    let { thread } = <ThreadParameters><any>event.pathParameters;

    let responseBody = {
        thread
    };

    return {
        statusCode: 200,
        body: JSON.stringify(responseBody)
    };
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