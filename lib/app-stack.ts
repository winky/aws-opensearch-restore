import * as cdk from "@aws-cdk/core";
import * as s3 from "@aws-cdk/aws-s3";
import * as iam from "@aws-cdk/aws-iam";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as opensearch from "@aws-cdk/aws-opensearchservice";
import * as lambda from "@aws-cdk/aws-lambda";
import * as lambdaPython from "@aws-cdk/aws-lambda-python";

export class OpenSearchRestoreStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, "BackupBucket", {});

    const snapshotRole = new iam.Role(this, "ServiceRole", {
      assumedBy: new iam.ServicePrincipal("es.amazonaws.com"),
    });

    snapshotRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:ListBucket"],
        resources: [bucket.bucketArn],
      })
    );
    snapshotRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
        resources: [`${bucket.bucketArn}/*`],
      })
    );

    const oldDomain = opensearch.Domain.fromDomainEndpoint(
      this,
      "OldDomain",
      ""
    );

    const restoreDomain = opensearch.Domain.fromDomainEndpoint(
      this,
      "RestoreDomain",
      ""
    );

    const lambdaRole = new iam.Role(this, "ServiceRole2", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        {
          managedPolicyArn: "",
        },
      ],
    });

    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "es:ESHttpPost",
          "es:ESHttpGet",
          "es:ESHttpPut",
          "es:ESHttpDelete",
        ],
        resources: ["*"],
      })
    );
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["iam:PassRole"],
        resources: [snapshotRole.roleArn],
      })
    );

    const oldVpc = ec2.Vpc.fromLookup(this, "OldVpc", {
      vpcId: "",
    });
    const oldSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      "OldSecurityGroup",
      ""
    );

    const newVpc = ec2.Vpc.fromLookup(this, "NewVpc", {
      vpcId: "",
    });
    const newSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      "NewSecurityGroup",
      ""
    );

    new lambdaPython.PythonFunction(this, "RegistRepoositoryFunction", {
      runtime: lambda.Runtime.PYTHON_3_9,
      entry: "./src",
      index: "register_repository.py",
      timeout: cdk.Duration.seconds(30),
      role: lambdaRole,
      vpc: oldVpc,
      vpcSubnets: { subnets: oldVpc.publicSubnets },
      securityGroups: [oldSecurityGroup],
      allowPublicSubnet: true,
      environment: {
        TEST: "TEST",
        OPENSEARCH_HOST: oldDomain.domainEndpoint,
        REGION: this.region,
        BUCKET_NAME: bucket.bucketName,
        SNAPSHOT_ROLE: snapshotRole.roleArn,
      },
    });

    new lambdaPython.PythonFunction(this, "CreateSnapshotFunction", {
      runtime: lambda.Runtime.PYTHON_3_9,
      entry: "./src",
      index: "create_snapshot.py",
      timeout: cdk.Duration.seconds(30),
      role: lambdaRole,
      vpc: oldVpc,
      vpcSubnets: { subnets: oldVpc.publicSubnets },
      securityGroups: [oldSecurityGroup],
      allowPublicSubnet: true,
      environment: {
        TEST: "TEST",
        OPENSEARCH_HOST: oldDomain.domainEndpoint,
        REGION: this.region,
        BUCKET_NAME: bucket.bucketName,
        SNAPSHOT_ROLE: snapshotRole.roleArn,
      },
    });

    new lambdaPython.PythonFunction(this, "CheckSnapshotFunction", {
      runtime: lambda.Runtime.PYTHON_3_9,
      entry: "./src",
      index: "check_snapshot.py",
      timeout: cdk.Duration.seconds(30),
      role: lambdaRole,
      vpc: oldVpc,
      vpcSubnets: { subnets: oldVpc.publicSubnets },
      securityGroups: [oldSecurityGroup],
      allowPublicSubnet: true,
      environment: {
        TEST: "TEST",
        OPENSEARCH_HOST: oldDomain.domainEndpoint,
        REGION: this.region,
        BUCKET_NAME: bucket.bucketName,
        SNAPSHOT_ROLE: snapshotRole.roleArn,
      },
    });

    new lambdaPython.PythonFunction(this, "RegistRepoositoryRestoreFunction", {
      runtime: lambda.Runtime.PYTHON_3_9,
      entry: "./src",
      index: "register_repository.py",
      timeout: cdk.Duration.seconds(30),
      role: lambdaRole,
      vpc: newVpc,
      vpcSubnets: { subnets: newVpc.privateSubnets },
      securityGroups: [newSecurityGroup],
      environment: {
        TEST: "TEST",
        OPENSEARCH_HOST: restoreDomain.domainEndpoint,
        REGION: this.region,
        BUCKET_NAME: bucket.bucketName,
        SNAPSHOT_ROLE: snapshotRole.roleArn,
      },
    });

    new lambdaPython.PythonFunction(this, "DeleteIndexFunction", {
      runtime: lambda.Runtime.PYTHON_3_9,
      entry: "./src",
      index: "delete_index.py",
      timeout: cdk.Duration.seconds(30),
      role: lambdaRole,
      vpc: newVpc,
      vpcSubnets: { subnets: newVpc.privateSubnets },
      securityGroups: [newSecurityGroup],
      environment: {
        TEST: "TEST",
        OPENSEARCH_HOST: restoreDomain.domainEndpoint,
        REGION: this.region,
        BUCKET_NAME: bucket.bucketName,
        SNAPSHOT_ROLE: snapshotRole.roleArn,
      },
    });

    new lambdaPython.PythonFunction(this, "RestoreFunction", {
      runtime: lambda.Runtime.PYTHON_3_9,
      entry: "./src",
      index: "restore.py",
      timeout: cdk.Duration.seconds(30),
      role: lambdaRole,
      vpc: newVpc,
      vpcSubnets: { subnets: newVpc.privateSubnets },
      securityGroups: [newSecurityGroup],
      environment: {
        TEST: "TEST",
        OPENSEARCH_HOST: restoreDomain.domainEndpoint,
        REGION: this.region,
        BUCKET_NAME: bucket.bucketName,
        SNAPSHOT_ROLE: snapshotRole.roleArn,
      },
    });
  }
}
