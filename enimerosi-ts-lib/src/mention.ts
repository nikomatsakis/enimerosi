import assert from "node:assert";

export interface Mention {
    /// Either a username like `nikomatsakis` or a team name like `rust-lang/compiler-team`
    get name(): string;

    /// Something like `https://github.com/nikomatsakis`
    get url(): URL;

    /// Check if this is a mention of a team
    get isTeam(): boolean;
}

export class UserMention implements Mention {
    name: string;
    url: URL;

    constructor(url: URL) {
        assert(url.host == "github.com");
        this.url = url;
        this.name = url.pathname.slice(1); // go from "/foo" to "foo"
    }

    get isTeam(): boolean {
        return false;
    }
}

const teamRegex = /orgs\/(.*)\/teams\/(.*)/;

export class TeamMention implements Mention {
    org: string;
    team: string;
    url: URL;

    constructor(url: URL) {
        assert(url.host == "github.com");
        this.url = url;
        let r = teamRegex.exec(url.pathname);
        assert(r !== null);
        this.org = r[1];
        this.team = r[2];
    }

    get name(): string {
        return `${this.org}/${this.team}`;
    }

    get isTeam(): boolean {
        return true;
    }
}