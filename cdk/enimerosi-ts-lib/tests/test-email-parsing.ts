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

test('salsa-new-pr: thread-id', async () => {
    let emailText = await readFile(join(__dirname, "/salsa-new-pr.eml"), { encoding: "utf8" });
    let notification = await GithubEmailNotification.fromMailText(emailText);
    expect(notification.threadId.idString).toBe('salsa-rs/salsa/pull/302');
});

test('salsa-pr-comment: thread-id', async () => {
    let emailText = await readFile(join(__dirname, "/salsa-pr-comment.eml"), { encoding: "utf8" });
    let notification = await GithubEmailNotification.fromMailText(emailText);
    expect(notification.threadId.idString).toBe('salsa-rs/salsa/pull/302');
});

test('salsa-review-approved', async () => {
    let emailText = await readFile(join(__dirname, "/salsa-review-approved.eml"), { encoding: "utf8" });
    let notification = await GithubEmailNotification.fromMailText(emailText);
    expect(notification.threadId.idString).toBe('salsa-rs/salsa/pull/275');
    expect(notification.reason).toBe('your_activity');
    expect(notification.sender).toBe('nikomatsakis');
});

test('salsa-new-commits', async () => {
    let emailText = await readFile(join(__dirname, "/salsa-new-commits.eml"), { encoding: "utf8" });
    let notification = await GithubEmailNotification.fromMailText(emailText);
    expect(notification.threadId.idString).toBe('salsa-rs/salsa/pull/275');
    expect(notification.reason).toBe('push');
    expect(notification.sender).toBe('nikomatsakis');
    expect(JSON.stringify(notification.linkData, undefined, 2)).toBe(
        JSON.stringify({
            "description": "View this Pull Request on GitHub",
            "viewAction": {
                "target": "https://github.com/salsa-rs/salsa/pull/275/files/1e3c2f22aa8b3a1515cfe2e8ca6574713fe3abee..26e099eb12b2d0e3f583e245497e10369aaecb04",
                "url": "https://github.com/salsa-rs/salsa/pull/275/files/1e3c2f22aa8b3a1515cfe2e8ca6574713fe3abee..26e099eb12b2d0e3f583e245497e10369aaecb04",
                "name": "View Pull Request"
            }
        }, undefined, 2)
    );
});