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

    expect(t2.threadId).toBe("salsa-rs/salsa/pull/302");
    expect(t2.maxIndex).toBe(2);
});
