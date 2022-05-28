import { Context, SESEvent } from 'aws-lambda';

type SESCallback = (error?: string | Error, result?: any) => void;

export async function lambdaHandler(event: SESEvent, context: Context, callback: SESCallback) {
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);
    console.log(`Context: ${JSON.stringify(context, null, 2)}`);
    callback(null, null);
};