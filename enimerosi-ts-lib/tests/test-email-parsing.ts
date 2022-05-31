import { readFile } from "node:fs/promises";
import { GithubEmailNotification } from "../src/emailNotification";
import { join } from "node:path";

test('Email 1: thread-id', async () => {
    let emailText = await readFile(join(__dirname, "/test-issue-comment.eml"), { encoding: "utf8" });
    let notification = await GithubEmailNotification.fromMailText(emailText);
    expect(notification.threadId.idString).toBe('rust-lang/compiler-team/issues/512');
});

test('Email 1: mentions', async () => {
    let emailText = await readFile(join(__dirname, "/test-issue-comment.eml"), { encoding: "utf8" });
    let notification = await GithubEmailNotification.fromMailText(emailText);
    expect(notification.mentions.length).toBe(1);
    expect(notification.mentions[0].name).toBe("rustbot");
    expect(notification.mentions[0].url.toString()).toBe("https://github.com/rustbot");
});

test('Email 2: thread-id', async () => {
    let emailText = await readFile(join(__dirname, "/test-pr-team-mention.eml"), { encoding: "utf8" });
    let notification = await GithubEmailNotification.fromMailText(emailText);
    expect(notification.threadId.idString).toBe('rust-lang/rust/pull/76158');
});

test('Email 2: mentions', async () => {
    let emailText = await readFile(join(__dirname, "/test-pr-team-mention.eml"), { encoding: "utf8" });
    let notification = await GithubEmailNotification.fromMailText(emailText);
    let names = notification.mentions.map(m => m.name);
    expect(JSON.stringify(names)).toBe(`["petrochenkov","bors","rust-lang/compiler"]`);
    let urls = notification.mentions.map(m => m.url);
    expect(JSON.stringify(urls)).toBe(`["https://github.com/petrochenkov","https://github.com/bors","https://github.com/orgs/rust-lang/teams/compiler"]`);
});