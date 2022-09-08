import * as λ from 'aws-lambda';
import { APIGatewayEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import { S3, DynamoDB } from 'aws-sdk';
import { GithubEmailNotification, NotificationRecord } from 'enimerosi-ts-lib/src';
import { fetch_notifications } from './notifications';
import { allThreads } from './threads';

export { api_gateway_event };

const s3 = new S3();
const ddb = new DynamoDB.DocumentClient();
const threadDbTableName: string = process.env.threadDb!;
const notificationsDbTableName: string = process.env.notificationsDb!;

// Request via API gateway for `/threads` or `/threads/threadId`
async function api_gateway_event(
    event: APIGatewayEvent,
    context: Context
): Promise<APIGatewayProxyResult> {
    console.log({
        level: "debug",
        event,
    });
    switch (event.resource) {
        case "/threads": return getThreads(event, context);
        case "/threads/{startKey}": return getThreads(event, context);
        case "/thread/{thread}": return getThread(event, context);
        case "/notifications/{thread}/{start}/{end}": return getNotifications(event, context);
        default: throw new Error(`unrecognized resource ${event.resource}`);
    }
}

async function getThreads(
    event: APIGatewayEvent,
    context: Context
): Promise<APIGatewayProxyResult> {
    interface Parameters {
        startKey?: string
    }

    // If the user writes `/threads`, then `pathParameters` is null.
    let startKey = (event.pathParameters === null
        ? undefined
        : event.pathParameters.startKey);

    let responseBody = await allThreads(startKey);

    console.log({
        level: "debug",
        responseBody: JSON.stringify(responseBody, undefined, 2)
    });

    return {
        statusCode: 200,
        body: JSON.stringify(responseBody)
    };
}

async function getThread(
    event: APIGatewayEvent,
    context: Context
): Promise<APIGatewayProxyResult> {
    interface ThreadParameters {
        thread: string
    }

    let { thread } = <ThreadParameters><any>event.pathParameters;

    let responseBody = {
        thread
    };

    return {
        statusCode: 200,
        body: JSON.stringify(responseBody)
    };
}

async function getNotifications(
    event: APIGatewayEvent,
    context: Context
): Promise<APIGatewayProxyResult> {
    interface NotificationsParameters {
        thread: string,
        start: string,
        end: string,
    }

    let parameters: NotificationsParameters = <any>event.pathParameters;
    let thread = decodeURIComponent(parameters.thread);
    let start = Number.parseInt(parameters.start);
    let end = Number.parseInt(parameters.end);
    let notifications = await fetch_notifications(thread, start, end);

    return {
        statusCode: 200,
        body: JSON.stringify(notifications)
    };
}