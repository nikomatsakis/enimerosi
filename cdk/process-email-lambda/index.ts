import { Context, S3Event } from 'aws-lambda';
import { S3 } from 'aws-sdk';
import { String } from 'aws-sdk/clients/acm';
import { simpleParser } from 'mailparser';

export async function main(event: S3Event, context: Context): Promise<any> {
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);
    console.log(`Context: ${JSON.stringify(context, null, 2)}`);
    console.log(`Environment: ${JSON.stringify(process.env, null, 2)}`);

    let s3 = new S3({});

    for (let record of event.Records) {
        let bucket = record.s3.bucket.name;
        let messageId = record.s3.object.key;
        console.log(`Email \`${messageId}\` received from bucket \`${bucket}\``);
        try {
            let messageContents = await s3.getObject({ Bucket: bucket, Key: messageId }).promise();
            console.log(`Body has ${messageContents.Body!.toString().length} bytes`);
            let body = messageContents.Body!.toString();
            let parsedMail = await simpleParser(body);
            console.log(`Parsed Mail: ${JSON.stringify(parsedMail)}`);
        } catch (e) {
            console.log(`Fetching/parsing message encountered an error: ${JSON.stringify(e, null, 2)}`);
        }
    }

    return {};
};