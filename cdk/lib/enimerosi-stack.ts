import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sns_subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as ses_actions from 'aws-cdk-lib/aws-ses-actions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

export class EnimerosiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const emailsBucket = new s3.Bucket(this, 'EmailsBucket');
    // const emailsTopic = new sns.Topic(this, 'EmailsTopic');

    // Each message that is delivered will be stored into S3 and then
    // a notification is sent to `emailsTopic`. This lambda is subscribed.
    const fn = new NodejsFunction(this, 'ProcessEmail', {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'main',
      entry: path.join(__dirname, `/../process-email-lambda/index.ts`),
      bundling: {
        minify: true,
        externalModules: ['aws-sdk'],
      },
      tracing: lambda.Tracing.ACTIVE,
    });
    emailsBucket.grantRead(fn);
    // emailsTopic.addSubscription(new sns_subscriptions.LambdaSubscription(fn));

    // NB: Because of https://github.com/aws/aws-cdk/issues/10321,
    // you must manually set the rule to active. I am not smart
    // enough to figure out how to use an [AwsCustomResource],
    // but that would probably be the "right" solution.
    //
    // [AwsCustomResource]: https://docs.aws.amazon.com/cdk/api/latest/docs/custom-resources-readme.html#custom-resources-for-aws-apis
    new ses.ReceiptRuleSet(this, 'RuleSet', {
      rules: [
        {
          actions: [
            new ses_actions.S3({
              bucket: emailsBucket,
              objectKeyPrefix: 'emails/',
              // topic: emailsTopic,
            }),
            new ses_actions.Lambda({
              function: fn,
              invocationType: ses_actions.LambdaInvocationType.EVENT,
            })
          ],
        }
      ],
    });
  }
}
