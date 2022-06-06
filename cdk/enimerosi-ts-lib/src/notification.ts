import { Mention } from "./mention";
import { ThreadId } from "./thread";

export interface GithubNotification {
    /// Github username of the recipient of this notification.
    ///
    /// e.g. `nikomatsakis`
    get recipient(): string;

    /// Github username of the actor that took the action that triggered this notification.
    ///
    /// e.g. `nikomatsakis`
    get sender(): string;

    /// Reason for this notification
    get reason(): Reason;

    /// All mentions in the body of this notification.
    get mentions(): Array<Mention>;

    /// The thread-id identifies 
    get threadId(): ThreadId;

    linkData: LinkData | undefined;
}

export interface LinkData {
    description: string;
    viewAction: ViewAction | undefined;
}

export interface ViewAction {
    target: string;
    url: string;
    name: string;
}

/// Reasons that notifications are given.
export type Reason = (
    "assign" | // You were assigned to an issue or pull request.
    "author" | // You created an issue or pull request.
    "ci_activity" | // A GitHub Actions workflow run that you triggered was completed.
    "comment" | // You commented on an issue or pull request.
    "manual" | // There was an update to an issue or pull request you manually subscribed to.
    "mention" | // You were mentioned on an issue or pull request.
    "push" | // Someone committed to a pull request you're subscribed to.
    "review_requested" | // You or a team you're a member of was requested to review a pull request.
    "security_alert" | // GitHub detected a vulnerability in a repository you receive alerts for.
    "state_change" | // An issue or pull request you're subscribed to was either closed or opened.
    "subscribed" | // There was an update in a repository you're watching.
    "team_mention" | // A team you belong to was mentioned on an issue or pull request.
    "your_activity" | // you did something
    "unknown" // Unknown reason
);

export function parseReason(reason: string): Reason {
    if (reason === "assign") { return "assign"; }
    if (reason === "author") { return "author"; }
    if (reason === "ci_activity") { return "ci_activity"; }
    if (reason === "comment") { return "comment"; }
    if (reason === "manual") { return "manual"; }
    if (reason === "mention") { return "mention"; }
    if (reason === "push") { return "push"; }
    if (reason === "review_requested") { return "review_requested"; }
    if (reason === "security_alert") { return "security_alert"; }
    if (reason === "state_change") { return "state_change"; }
    if (reason === "subscribed") { return "subscribed"; }
    if (reason === "team_mention") { return "team_mention"; }
    if (reason === "your_activity") { return "your_activity"; }
    return "unknown";
}