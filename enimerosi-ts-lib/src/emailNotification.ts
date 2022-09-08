import * as html from "node-html-parser";
import * as mailparser from "mailparser";
import { GithubNotification, Reason, parseReason, LinkData, ViewAction } from "./notification";
import assert from "node:assert";
import { Mention, UserMention, TeamMention } from "./mention";
import { ThreadId, parseGithubEmailMessageId, GithubThreadId } from "./thread";
import sanitize from "sanitize-html";

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

    get threadId(): GithubThreadId {
        let messageId = this.parsedMail.messageId;
        assert(messageId !== undefined);
        return parseGithubEmailMessageId(messageId.toString());
    }

    get subject(): string {
        // github email subject lines look like:
        //
        // [rust-lang/rust] Commit to safety rules for dyn trait upcasting (Issue #101336)
        //
        // or
        //
        // Re: [rust-lang/rust] Commit to safety rules for dyn trait upcasting (Issue #101336)
        //
        // We want to strip out the `[rust-lang/rust]` part. We can get the name of org/repo
        // from the thread-id.
        let threadId = this.threadId;
        let tag = `[${threadId.org}/${threadId.repo}] `;
        let subject = this.parsedMail.subject || "";
        let position = subject.indexOf(tag);
        if (position >= 0) {
            return subject.slice(position + tag.length);
        } else {
            return subject;
        }

    }

    get linkData(): LinkData | undefined {
        let scripts = this.htmlBody.querySelectorAll("script");

        let description: string | undefined = undefined;
        let viewAction: ViewAction | undefined = undefined;

        for (let script of scripts) {
            let scriptType = script.getAttribute("type");
            if (scriptType !== "application/ld+json") { continue; }
            let jsons;
            try {
                jsons = JSON.parse(script.innerText);
            } catch (e) {
                continue;
            }
            for (let json of jsons) {
                if (json["@context"] !== "http://schema.org") { continue; }
                if (json["@type"] !== "EmailMessage") { continue; }
                let jdescription = json["description"];
                if (typeof jdescription === "string") {
                    description = jdescription;
                }
                let potentialAction = json["potentialAction"];
                if (potentialAction === undefined) { continue; }
                if (potentialAction["@type"] !== "ViewAction") { continue; }
                let target = potentialAction["target"];
                if (typeof target !== "string") { continue; }
                let url = potentialAction["url"];
                if (typeof url !== "string") { continue; }
                let name = potentialAction["name"];
                if (typeof name !== "string") { continue; }
                viewAction = { target, url, name };
            }
        }

        if (description === undefined)
            return undefined;

        return {
            description,
            viewAction,
        };
    }

    get html(): string {
        let html = this.parsedMail.html;
        if (typeof html === "string") {
            return sanitize(html);
        }
        return "";
    }
}