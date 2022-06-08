// In the database, everything is keyed by (string, number).
//
// The 0th record is the `ThreadRecord`. 

/// The *primary* record for a thread records metadata about the thread.
export interface ThreadRecord {
    /// Thread-id from `ThreadId.toString()`.
    threadId: string;

    /// The 0th index is the "thread record".
    notificationIndex: 0;

    /// Begins at 0, incremented by 1 for each new notification we receive.
    maxNotificationIndex: NotificationIndex;

    /// If set, equal to the highest index of a comment authored by me.
    lastCommented?: NotificationIndex;

    /// Equal to an array of github names (`username` or `org/team`) that I have mentioned.
    mentionedByMe: Array<string>;

    /// If set, equal to the highest index of a comment that mentioned me.
    lastMentioned?: NotificationIndex;

    /// If set, equal to the highest index of a comment that mentioned a team that I am on.
    teamLastMentioned?: NotificationIndex;

    /// If set, equal to the highest index of a comment by someone that I have mentioned
    /// (maybe they are responding to me).
    lastResponded?: NotificationIndex;
}

export type NotificationIndex = number;

/// The *second* records for a thread records metadata about each notification.
export interface NotificationRecord {
    /// Thread-id from `ThreadId.toString()`.
    threadId: string;

    /// Index must be some number in `1 ..= maxNotificationIndex` (where `maxNotificationIndex` comes from the `ThreadRecord`).
    notificationIndex: number;

    /// For now, the only kind of notifications we receive are github emails.
    /// This could change.
    notificationType: "email";

    /// Name of s3 bucket where email is stored
    bucket: string;

    /// Key of email within the s3 bucket
    key: string;
}
