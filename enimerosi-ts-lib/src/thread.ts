import assert from "node:assert";

export interface ThreadId {
    /// Returns a string that completely describes the thread-id
    get idString(): string;
}

/// A typical github thread-id that identifies either a pull request or an issue. Left open-ended in case we add more.
export class GithubThreadId implements ThreadId {
    org: string;
    repo: string;
    kind: ThreadKind;
    id: number;

    constructor(org: string, repo: string, kind: ThreadKind, id: number) {
        this.org = org;
        this.repo = repo;
        this.kind = kind;
        this.id = id;
    }

    get idString(): string {
        return `${this.org}/${this.repo}/${this.kind}/${this.id}`;
    }
}

type ThreadKind = "issues" | "pull";

/// Given the contents of the `In-Reply-To` header, return a thread-id.
export function parseGithubEmailMessageId(messageId: string): ThreadId {
    // Example: `<rust-lang/compiler-team/issues/512/1141006298@github.com>`
    let issuesRegex = /<([^/]*)\/([^/]*)\/issues\/([0-9]*)(\/[^@]*)?@github.com>/;
    let match = issuesRegex.exec(messageId);
    if (match !== null) {
        let org = match[1];
        let repo = match[2];
        let id = parseInt(match[3]);
        return new GithubThreadId(org, repo, "issues", id);
    }

    // Example: `Message-ID: <salsa-rs/salsa/pull/302@github.com>`
    // Example: `Message-ID: <salsa-rs/salsa/pull/302/c1141882412@github.com>`
    let pullRegex = /<([^/]*)\/([^/]*)\/pull\/([0-9]*)(\/[^@]*)?@github.com>/;
    match = pullRegex.exec(messageId);
    if (match !== null) {
        let org = match[1];
        let repo = match[2];
        let id = parseInt(match[3]);
        return new GithubThreadId(org, repo, "pull", id);
    }


    throw new Error(`Unrecognized Message-ID string: \`${messageId}\``);
}

