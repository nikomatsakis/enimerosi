import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sns_subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as ses_actions from 'aws-cdk-lib/aws-ses-actions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as appsync from '@aws-cdk/aws-appsync-alpha';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { CfnOutput } from 'aws-cdk-lib/core';

export class EnimerosiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // This bucket stores the full text of every email.
    const emailsBucket = new s3.Bucket(this, 'EmailsBucket');

    // DynamoDB database for storing notification metadata
    // extracted about each notifiation (via the lambda below).
    const threadDb = new dynamodb.Table(this, 'ThreadDb', {
      partitionKey: { name: 'threadId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // DynamoDB database for storing notification metadata
    // extracted about each notifiation (via the lambda below).
    const notificationsDb = new dynamodb.Table(this, 'NotificationsDb', {
      partitionKey: { name: 'threadId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'notificationIndex', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // Each message that is delivered will be stored into S3. S3 then
    // invokes this lambda.
    const processEmailLambda = new NodejsFunction(this, 'ProcessEmail', {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'main',
      entry: path.join(__dirname, `/../process-email-lambda/index.ts`),
      environment: {
        "threadDb": threadDb.tableName,
        "notificationsDb": notificationsDb.tableName,
      },
      bundling: {
        minify: true,
        externalModules: ['aws-sdk'],
      },
      timeout: Duration.seconds(10), // dynamodb requests can be time consuming
      tracing: lambda.Tracing.ACTIVE,
    });
    emailsBucket.grantRead(processEmailLambda);
    threadDb.grantReadWriteData(processEmailLambda);
    notificationsDb.grantReadWriteData(processEmailLambda);
    emailsBucket.addObjectCreatedNotification(new s3n.LambdaDestination(processEmailLambda));

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

    // Lambda that processes `getNotifications` queries from graphql
    const getNotificationLambda = new NodejsFunction(this, 'GetNotifications', {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'main',
      entry: path.join(__dirname, "/../get-notifications-lambda/index.ts"),
      environment: {
        "threadDb": threadDb.tableName,
        "notificationsDb": notificationsDb.tableName,
      },
      bundling: {
        minify: true,
        externalModules: ['aws-sdk'],
      },
      timeout: Duration.seconds(10), // dynamodb requests can be time consuming
      tracing: lambda.Tracing.ACTIVE,
    });
    emailsBucket.grantRead(getNotificationLambda);
    threadDb.grantReadData(getNotificationLambda);
    notificationsDb.grantReadData(getNotificationLambda);

    // AppSync API definition for graphql
    const threadApi = new appsync.GraphqlApi(this, 'threadApi', {
      name: 'thread-api',
      schema: appsync.Schema.fromAsset(path.join(__dirname, '/../graphql/enimerosi.graphql')),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.IAM,
        },
      },
      xrayEnabled: true,
    });
    const threadDbDataSource = threadApi.addDynamoDbDataSource('threadDbDataSource', threadDb);
    threadDbDataSource.createResolver({
      typeName: 'Query',
      fieldName: 'getThreads',
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbScanTable(),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList(),
    });
    const getNotificationLambdaDataSource = threadApi.addLambdaDataSource('getNotificationLambdaDataSource', getNotificationLambda);
    getNotificationLambdaDataSource.createResolver({
      typeName: 'Query',
      fieldName: 'getNotifications',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });
  }
}
