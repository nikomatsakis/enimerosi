import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as ses_actions from 'aws-cdk-lib/aws-ses-actions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';

export class EnimerosiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 'Bucket');

    const fn = new lambda.Function(this, 'ProcessEmail', {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../process-email-lambda')),
      tracing: lambda.Tracing.ACTIVE,
    });

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
            new ses_actions.Lambda({
              function: fn,
              invocationType: ses_actions.LambdaInvocationType.EVENT,
            }),
          ],
        }
      ],
    });
  }
}
