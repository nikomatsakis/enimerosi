import * as html from "node-html-parser";
import * as mailparser from "mailparser";
import { GithubNotification, Reason } from "./notification";
import assert from "node:assert";
import { Mention, UserMention, TeamMention } from "./mention";
import { ThreadId, parseGithubEmailInReplyTo } from "./thread";

/// A notification derived from a Github email.
export class GithubEmailNotification implements GithubNotification {
    parsedMail: mailparser.ParsedMail;
    htmlBody: html.HTMLElement;

    constructor(parsedMail: mailparser.ParsedMail, htmlBody: html.HTMLElement) {
        this.parsedMail = parsedMail;
        this.htmlBody = htmlBody;
    }

    static async fromMailText(text: string): Promise<GithubEmailNotification> {
        let parsedMail = await mailparser.simpleParser(text);
        if (parsedMail.html === false) {
            throw new Error("HTML body expected in github notification");
        }

        let htmlBody = await html.parse(parsedMail.html);
        return new GithubEmailNotification(parsedMail, htmlBody);
    }

    get recipient(): string {
        return this.parsedMail.headers.get("X-GitHub-Recipient")!.toString();
    }

    get sender(): string {
        return this.parsedMail.headers.get("X-GitHub-Sender")!.toString();
    }

    get reason(): Reason {
        // we ought to fetch this from the `X-GitHub-Reason` header but 
        // it's a pain in the neck to validate that the string is what we expect, see
        //
        // https://stackoverflow.com/questions/36836011/checking-validity-of-string-literal-union-type-at-runtime
        //
        // So for now just return "unknown".
        return "unknown";
    }

    get mentions(): Array<Mention> {
        // github encodes user mentions as `<a class="user-mention" href="https://github.com/username" ....>`
        let userElements = this.htmlBody.querySelectorAll("a.user-mention");
        let userMentions: Array<Mention> = userElements.map(userElement => {
            let href = userElement.getAttribute("href");
            assert(href !== undefined);
            return new UserMention(new URL(href));
        });

        // github encodes team mentions as `<a class="user-mention" href="https://github.com/username" ....>`
        let teamElements = this.htmlBody.querySelectorAll("a.team-mention");
        let teamMentions: Array<Mention> = teamElements.map(teamElement => {
            let href = teamElement.getAttribute("href");
            assert(href !== undefined);
            return new TeamMention(new URL(href));
        });

        let mentions = [userMentions, teamMentions].flatMap(m => m);
        return mentions;
    }

    get threadId(): ThreadId {
        let replyTo = this.parsedMail.inReplyTo;
        assert(replyTo !== undefined);
        return parseGithubEmailInReplyTo(replyTo.toString());
    }
}