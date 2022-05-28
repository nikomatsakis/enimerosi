import { Context, SESEvent } from 'aws-lambda';

export async function main(event: SESEvent, context: Context): Promise<any> {
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);
    console.log(`Context: ${JSON.stringify(context, null, 2)}`);
    return {};
};