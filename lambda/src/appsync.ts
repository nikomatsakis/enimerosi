import * as λ from 'aws-lambda';
import { AppSyncResolverHandler } from 'aws-lambda';
import * as γ from './generated/graphql';
import { fetch_notifications } from './notifications';

export { appsync_notifications_event };

async function appsync_notifications_event(event: AppSyncResolverHandler<γ.QueryGetNotificationsArgs, Array<γ.Notification>>, context: λ.Context): Promise<Array<γ.Notification>> {
    console.log({
        level: "debug",
        event,
    });

    let { startNotificationIndex, endNotificationIndex, threadId }: γ.QueryGetNotificationsArgs = event.arguments;
    return await fetch_notifications(threadId, startNotificationIndex, endNotificationIndex);
}