import * as html from "node-html-parser";
import * as mailparser from "mailparser";
import { GithubNotification, Reason, parseReason } from "./notification";
import assert from "node:assert";
import { Mention, UserMention, TeamMention } from "./mention";
import { ThreadId, parseGithubEmailMessageId } from "./thread";

/// A notification derived from a Github email.
export class GithubEmailNotification implements GithubNotification {
    /// parsed version of the mail
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
        return this.parsedMail.headers.get("x-github-recipient")!.toString();
    }

    get sender(): string {
        return this.parsedMail.headers.get("x-github-sender")!.toString();
    }

    get reason(): Reason {
        let reason = this.parsedMail.headers.get("x-github-reason")!.toString()
        return parseReason(reason);
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
        let messageId = this.parsedMail.messageId;
        assert(messageId !== undefined);
        return parseGithubEmailMessageId(messageId.toString());
    }
}