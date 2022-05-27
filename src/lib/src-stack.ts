import * as cdk from '@aws-cdk/core';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as actions from 'aws-cdk-lib/aws-ses-actions';

export class SrcStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


  }
}
