import * as λ from 'aws-lambda';
import * as γ from './generated/graphql';
import { S3, DynamoDB } from 'aws-sdk';

const ddb = new DynamoDB.DocumentClient();
const threadDbTableName: string = process.env.threadDb!;

interface AllThreadsResult {
    threads: Array<γ.Thread>,
    nextPage?: string
}

export async function allThreads(
    startKey?: string,
): Promise<AllThreadsResult> {
    console.log({
        level: "debug",
        message: "allThreads invoked",
    });

    let scanInput: DynamoDB.DocumentClient.ScanInput = {
        TableName: threadDbTableName,
        ExclusiveStartKey: startKey === undefined ? undefined : JSON.parse(startKey),
    };
    console.log({
        level: "debug",
        scanInput: JSON.stringify(scanInput, undefined, 2),
    });
    let scanOutput: DynamoDB.DocumentClient.ScanOutput = await ddb.scan(scanInput).promise();
    console.log({
        level: "debug",
        scanOutput: JSON.stringify(scanOutput, undefined, 2),
    });
    let result: AllThreadsResult = {
        threads: scanOutput.Items! as Array<γ.Thread>,
    };

    if (scanOutput.LastEvaluatedKey) {
        result.nextPage = JSON.stringify(scanOutput.LastEvaluatedKey);
    }

    console.log({
        level: "debug",
        result: JSON.stringify(result, undefined, 2),
    });

    return result;
}

export async function getThreadData(
    threadId: string
): Promise<γ.Thread> {
    console.log({
        level: "debug",
        message: "getThreadData",
        threadId,
    });

    let getInput: DynamoDB.DocumentClient.GetItemInput = {
        TableName: threadDbTableName,
        Key: { threadId },

    };
    console.log({
        level: "debug",
        scanInput: JSON.stringify(getInput, undefined, 2),
    });
    let getOutput: DynamoDB.DocumentClient.GetItemOutput = await ddb.get(getInput).promise();
    console.log({
        level: "debug",
        scanOutput: JSON.stringify(getOutput, undefined, 2),
    });
    return getOutput.Item as γ.Thread;
}