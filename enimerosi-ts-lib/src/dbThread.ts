import * as db from "./db";
import { GithubNotification } from "./notification";
import assert from "node:assert";

/// Given the old thread-record from the database (or undefined if none exists), 
/// and a new incoming notification, returns a new thread record.
///
/// This new thread-record and the notification record for `notification` should be 
/// inserted into the database atomically. The index for `notification` is the `maxNotificationIndex`
/// field in the new thread record.
///
/// Has no side-effects, so if insertion fails (contention), then can be re-run with the new
/// thread-record.
export function updateThreadRecord(oldThreadRecord: db.ThreadRecord | undefined, notification: GithubNotification): db.ThreadRecord {
    if (oldThreadRecord === undefined) {
        oldThreadRecord = createNewThreadRecord(notification);
    }
    assert(oldThreadRecord.threadId === notification.threadId.idString);

    let newThreadRecord = cloneThreadRecord(oldThreadRecord);
    newThreadRecord.maxNotificationIndex += 1;

    let notificationIndex = newThreadRecord.maxNotificationIndex;

    if (notification.recipient == notification.sender) {
        updateThreadRecordWithMyNotification(notification, newThreadRecord, notificationIndex);
    } else {
        updateThreadRecordWithOtherNotification(notification, newThreadRecord, notificationIndex);
    }

    return newThreadRecord;
}

function cloneThreadRecord(threadRecord: db.ThreadRecord): db.ThreadRecord {
    return JSON.parse(JSON.stringify(threadRecord));
}

/// Update the thread record with a message from me.
function updateThreadRecordWithMyNotification(notification: GithubNotification, newThreadRecord: db.ThreadRecord, notificationIndex: number) {
    for (let mention of notification.mentions) {
        let mentionName = mention.name;
        if (newThreadRecord.mentionedByMe.indexOf(mentionName) == -1) {
            newThreadRecord.mentionedByMe.push(mentionName);
        }
    }

    // Update the record of when I last commented.
    newThreadRecord.lastCommented = notificationIndex;
}

/// Update the thread record with a message from someone else.
function updateThreadRecordWithOtherNotification(notification: GithubNotification, newThreadRecord: db.ThreadRecord, notificationIndex: number) {
    let myName = notification.recipient;

    // Is the sender someone who I have mentioned on this thread? If so, maybe
    // they are responding to me.
    let mentionedByMe = newThreadRecord.mentionedByMe.indexOf(notification.sender) != -1;
    if (mentionedByMe) {
        newThreadRecord.lastResponded = notificationIndex;
    }

    // Was I (or a team that I am on) mentioned by this message?
    for (let mention of notification.mentions) {
        if (mention.name === myName) {
            newThreadRecord.lastMentioned = notificationIndex;
        }

        if (mention.isTeam) {
            // Ideally, we would check if I am a member of this team, but I'm too lazy,
            // so just check if this message has a `team_mention` setting, which is a
            // decent heuristic for the moment.
            if (notification.reason === "team_mention") {
                newThreadRecord.teamLastMentioned = notificationIndex;
            }
        }
    }
}

function createNewThreadRecord(notification: GithubNotification): db.ThreadRecord {
    return {
        threadId: notification.threadId.idString,
        maxNotificationIndex: 0,
        mentionedByMe: [],
    };
}

