import * as db from "../src/db";
import * as dbThread from "../src/dbThread";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { GithubEmailNotification } from "../src/emailNotification";

test('Email: mentions', async () => {
    let newPrText = await readFile(join(__dirname, "/salsa-new-pr.eml"), { encoding: "utf8" });
    let newPrNotification = await GithubEmailNotification.fromMailText(newPrText);

    let t1 = dbThread.updateThreadRecord(undefined, newPrNotification);

    let prCommentText = await readFile(join(__dirname, "/salsa-pr-comment.eml"), { encoding: "utf8" });
    let prCommentNotification = await GithubEmailNotification.fromMailText(prCommentText);
    let t2 = dbThread.updateThreadRecord(t1, prCommentNotification);

    expect(t1.threadId).toBe("salsa-rs/salsa/pull/302");
    expect(t1.maxIndex).toBe(1);
    expect(t1.lastCommented).toBe(undefined);

    expect(t2.threadId).toBe("salsa-rs/salsa/pull/302");
    expect(t2.maxIndex).toBe(2);
    expect(t2.lastCommented).toBe(undefined);
});

test('Email: Review approved', async () => {
    let emailText = await readFile(join(__dirname, "/salsa-review-approved.eml"), { encoding: "utf8" });
    let emailNotification = await GithubEmailNotification.fromMailText(emailText);
    let t1 = dbThread.updateThreadRecord(undefined, emailNotification);

    emailText = await readFile(join(__dirname, "/salsa-new-commits.eml"), { encoding: "utf8" });
    emailNotification = await GithubEmailNotification.fromMailText(emailText);
    let t2 = dbThread.updateThreadRecord(t1, emailNotification);

    expect(t1.threadId).toBe("salsa-rs/salsa/pull/275");
    expect(t1.maxIndex).toBe(1);
    expect(t1.lastCommented).toBe(1);

    expect(t2.threadId).toBe("salsa-rs/salsa/pull/275");
    expect(t2.maxIndex).toBe(2);
    expect(t2.lastCommented).toBe(2);
});
