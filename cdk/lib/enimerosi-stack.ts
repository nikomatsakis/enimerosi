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
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

export class EnimerosiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // This bucket stores the full text of every email.
    const emailsBucket = new s3.Bucket(this, 'EmailsBucket');

    // DynamoDB database for storing notification metadata
    // extracted about each notifiation (via the lambda below).
    const threadDb = new dynamodb.Table(this, 'ThreadDb', {
      partitionKey: { name: 'thread', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'index', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // Each message that is delivered will be stored into S3. S3 then
    // invokes this lambda.
    const fn = new NodejsFunction(this, 'ProcessEmail', {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'main',
      entry: path.join(__dirname, `/../process-email-lambda/index.ts`),
      environment: {
        "threadDb": threadDb.tableName,
      },
      bundling: {
        minify: true,
        externalModules: ['aws-sdk'],
      },
      tracing: lambda.Tracing.ACTIVE,
    });
    emailsBucket.grantRead(fn);
    threadDb.grantReadWriteData(fn);
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
            })
          ],
        }
      ],
    });
  }
}
