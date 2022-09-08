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
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { CfnOutput } from 'aws-cdk-lib/core';
import { S3 } from 'aws-cdk-lib/aws-ses-actions';

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
    const processEmailLambda = nodejsfunction(this, "process_email_event", {
      "threadDb": threadDb.tableName,
      "notificationsDb": notificationsDb.tableName,
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

    const getNotificationLambda = nodejsfunction(this, "appsync_notifications_event", {
      "threadDb": threadDb.tableName,
      "notificationsDb": notificationsDb.tableName,
    });
    emailsBucket.grantRead(getNotificationLambda);
    threadDb.grantReadData(getNotificationLambda);
    notificationsDb.grantReadData(getNotificationLambda);

    // Create the API gateway
    this.setupApigateway(
      threadDb,
      notificationsDb,
      emailsBucket,
    );

    // AppSync API definition for graphql
    const threadApi = new appsync.GraphqlApi(this, 'threadApi', {
      name: 'thread-api',
      schema: appsync.Schema.fromAsset(path.join(__dirname, '/../graphql/enimerosi.graphql')),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.IAM,
        },
      },
      logConfig: {
        excludeVerboseContent: false,
        fieldLogLevel: appsync.FieldLogLevel.ALL,
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
    const noopDataSource = threadApi.addNoneDataSource("noneDataSource");
    noopDataSource.createResolver({
      typeName: 'Mutation',
      fieldName: 'updateThread',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`{
        "version": "2018-05-29",
        "payload": $util.toJson($context.arguments.threadId)
      }`),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`{
        "version": "2018-05-29",
        "payload": $util.toJson($context.result)
      }`),
    });
  }

  setupApigateway(
    threadDb: dynamodb.Table,
    notificationsDb: dynamodb.Table,
    emailsBucket: s3.Bucket,
  ) {
    // API Gateway for REST APIs.
    const lambda = nodejsfunction(this, 'api_gateway_event', {
      "threadDb": threadDb.tableName,
      "notificationsDb": notificationsDb.tableName,
    });
    emailsBucket.grantRead(lambda);
    threadDb.grantReadData(lambda);
    notificationsDb.grantReadData(lambda);

    const api = new apigateway.RestApi(this, 'enimerosi-api', {
      restApiName: "Enimerosi Service",
      description: "Enimerosi API."
    });

    const lambdaIntegration = new apigateway.LambdaIntegration(lambda);

    // GET /threads
    const threads = api.root.addResource('threads');
    threads.addMethod('GET', lambdaIntegration);

    // GET /threads/{startKey}
    const withStartKey = threads.addResource('{startKey}');
    withStartKey.addMethod('GET', lambdaIntegration);

    // GET /thread/{thread}
    //
    // invokes get-notifications-lambda
    api.root.addResource('thread').addResource('{thread}')
      .addMethod('GET', lambdaIntegration);

    // GET /notifications/{thread}/{start}/{end}
    //
    // invokes get-notifications-lambda
    api.root.addResource('notifications')
      .addResource('{thread}')
      .addResource('{start}')
      .addResource('{end}')
      .addMethod('GET', lambdaIntegration);
  }
}

function nodejsfunction(
  stack: Stack,
  handler: string,
  environment: any,
): NodejsFunction {
  return new NodejsFunction(stack, `lambda-${handler}`, {
    runtime: lambda.Runtime.NODEJS_16_X,
    handler: handler,
    entry: path.join(__dirname, "/../lambda/index.ts"),
    environment,
    bundling: {
      minify: true,
      externalModules: ['aws-sdk'],
    },
    timeout: Duration.seconds(10), // dynamodb requests can be time consuming
    tracing: lambda.Tracing.ACTIVE,
  });
}
