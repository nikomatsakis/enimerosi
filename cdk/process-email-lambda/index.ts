import { Context, SESEvent } from 'aws-lambda';
import { S3 } from 'aws-sdk';
import { String } from 'aws-sdk/clients/acm';
import { simpleParser } from 'mailparser';

export async function main(event: SESEvent, context: Context): Promise<any> {
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);
    console.log(`Context: ${JSON.stringify(context, null, 2)}`);
    console.log(`Environment: ${JSON.stringify(process.env, null, 2)}`);

    let emailsBucket: string = process.env.emailsBucket!;
    let region: string = process.env.region!;
    let s3 = new S3({
        region
    });

    for (let record of event.Records) {
        let messageId = record.ses.mail.messageId;
        console.log(`Email ${messageId} received from '${record.ses.mail.source}' with subject '${record.ses.mail.commonHeaders.subject}'`);
        try {
            let messageContents = await s3.getObject({ Bucket: emailsBucket, Key: messageId }).promise();
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