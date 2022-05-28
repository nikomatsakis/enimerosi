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
        console.log(`Email received from '${record.ses.mail.source}' with subject '${record.ses.mail.commonHeaders.subject}'`);
        let messageId = record.ses.mail.messageId;
        let params = { Bucket: emailsBucket, Key: messageId };
        console.log(`Params = ${JSON.stringify(params)}`);
        let messageContents = await s3.getObject(params).promise();
        console.log(`Body has ${messageContents.Body!.toString().length} bytes`);
        let body = messageContents.Body!.toString();
        let parsedMail = await simpleParser(body);
        console.log(`Parsed Mail: ${JSON.stringify(parsedMail)}`);
    }

    return {};
};