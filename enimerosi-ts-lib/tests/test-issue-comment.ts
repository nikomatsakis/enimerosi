import { readFile } from "node:fs/promises";
import { GithubEmailNotification } from "../src/emailNotification";
import { join } from "node:path";

test('Email 1', async () => {
    let emailText = await readFile(join(__dirname, "/test-issue-comment.eml"), { encoding: "utf8" });
    let notification = await GithubEmailNotification.fromMailText(emailText);
    expect(notification.threadId.idString).toBe('rust-lang/compiler-team/issues/512');
    expect(notification.mentions.length).toBe(1);
    expect(notification.mentions[0].name).toBe("rustbot");
    expect(notification.mentions[0].url.toString()).toBe("https://github.com/rustbot");
});