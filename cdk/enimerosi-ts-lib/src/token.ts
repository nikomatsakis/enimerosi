import { createHash } from "node:crypto";

/// Given a string `s`, hashes it and returns the first 36 characters,
/// suitable for use as a dynamodb-reuse token.
export function tokenize(s: string) {
    let hash = createHash("sha256");
    hash.update(s);
    let hashString = hash.digest('base64');
    return hashString.slice(0, 36);
}