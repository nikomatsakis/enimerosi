import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sns_subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as ses_actions from 'aws-cdk-lib/aws-ses-actions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RustFunction, Settings } from 'rust.aws-cdk-lambda';

export class EnimerosiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    Settings.WORKSPACE_DIR = path.join(__dirname, '/..');

    // This bucket stores the full text of every email.
    const emailsBucket = new s3.Bucket(this, 'EmailsBucket');

    // Each message that is delivered will be stored into S3 and then
    // a notification is sent to `emailsTopic`. This lambda is subscribed.
    const fn = new RustFunction(this, 'ProcessEmail', {
      directory: path.join(__dirname, `/../process-email-lambda-rs`),
    });
    emailsBucket.grantRead(fn);
    emailsBucket.addObjectCreatedNotification(new s3n.LambdaDestination(fn));

    // Simple Email Service that receives notifications from github,
    // stores them in S3, and then invokes the lambda above.
    //
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
              objectKeyPrefix: '',
            }),
          ],
        }
      ],
    });
  }
}
