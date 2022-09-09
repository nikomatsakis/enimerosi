import * as λ from 'aws-lambda';
import { APIGatewayEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import { S3, DynamoDB } from 'aws-sdk';
import { GithubEmailNotification, NotificationRecord } from 'enimerosi-ts-lib/src';
import { fetch_notifications, notificationViewUrl } from './notifications';
import { allThreads, getThreadData } from './threads';

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
        case "/view/{thread}/{index}": return viewNotification(event, context);
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

    let parameters = <ThreadParameters><any>event.pathParameters;
    let thread = decodeURIComponent(parameters.thread);

    let responseBody = await getThreadData(thread);

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

async function viewNotification(
    event: APIGatewayEvent,
    context: Context
): Promise<APIGatewayProxyResult> {
    interface Parameters {
        thread: string,
        index: string,
    }

    let parameters: Parameters = <any>event.pathParameters;
    let thread = decodeURIComponent(parameters.thread);
    let index = Number.parseInt(parameters.index);
    let url = await notificationViewUrl(thread, index);
    if (url === undefined) {
        throw new Error("no link data for that notification");
    }
    return {
        statusCode: 302,
        headers: {
            location: url,
        },
        body: `<body>Redirecting to <a href="${url}">${thread}</a></body>`
    };
}