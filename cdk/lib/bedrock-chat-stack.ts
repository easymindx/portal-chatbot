import { CfnOutput, RemovalPolicy, StackProps, IgnoreMode } from "aws-cdk-lib";
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  HttpMethods,
  ObjectOwnership,
} from "aws-cdk-lib/aws-s3";
import { CloudFrontWebDistribution } from "aws-cdk-lib/aws-cloudfront";
import { Construct } from "constructs";
import { Auth } from "./constructs/auth";
import { Api } from "./constructs/api";
import { Database } from "./constructs/database";
import { Frontend } from "./constructs/frontend";
import { WebSocket } from "./constructs/websocket";
import * as cdk from "aws-cdk-lib";
import { Embedding } from "./constructs/embedding";
import { UsageAnalysis } from "./constructs/usage-analysis";
import { TIdentityProvider, identityProvider } from "./utils/identity-provider";
import { ApiPublishCodebuild } from "./constructs/api-publish-codebuild";
import { WebAclForPublishedApi } from "./constructs/webacl-for-published-api";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as logs from "aws-cdk-lib/aws-logs";
import * as path from "path";
import { BedrockCustomBotCodebuild } from "./constructs/bedrock-custom-bot-codebuild";
import { getResourceName } from "./utils/resource-names";

export interface BedrockChatStackProps extends StackProps {
  readonly bedrockRegion: string;
  readonly webAclId: string;
  readonly identityProviders: TIdentityProvider[];
  readonly userPoolDomainPrefix: string;
  readonly publishedApiAllowedIpV4AddressRanges: string[];
  readonly publishedApiAllowedIpV6AddressRanges: string[];
  readonly allowedSignUpEmailDomains: string[];
  readonly autoJoinUserGroups: string[];
  readonly enableMistral: boolean;
  readonly selfSignUpEnabled: boolean;
  readonly enableIpV6: boolean;
  readonly documentBucket: Bucket;
  readonly useStandbyReplicas: boolean;
  readonly enableBedrockCrossRegionInference: boolean;
  readonly enableLambdaSnapStart: boolean;
}

export enum ApiPublicationOutput {
  PublishedApiWebAclArn = "cdr-ai-poc-chatbot-published-api-web-acl-arn",
  BedrockClaudeChatConversationTableName = "cdr-ai-poc-chatbot-bedrock-claude-chat-conversation-tablename",
  BedrockClaudeChatTableAccessRoleArn = "cdr-ai-poc-chatbot-bedrock-claude-chat-table-access-role-arn",
  BedrockClaudeChatLargeMessageBucketName = "cdr-ai-poc-chatbot-bedrock-claude-chat-large-message-bucketname",
}

export class BedrockChatStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BedrockChatStackProps) {
    super(scope, id, {
      description: "CDR AI POC Chatbot Stack",
      ...props,
    });

    const idp = identityProvider(props.identityProviders);

    const accessLogBucket = new Bucket(this, getResourceName('access-log-bucket'), {
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      objectOwnership: ObjectOwnership.OBJECT_WRITER,
      autoDeleteObjects: true,
    });

    // Bucket for source code
    const sourceBucket = new Bucket(this, getResourceName("source-buckek-for-codebuild"), {
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      objectOwnership: ObjectOwnership.OBJECT_WRITER,
      autoDeleteObjects: true,
      serverAccessLogsBucket: accessLogBucket,
      serverAccessLogsPrefix: "SourceBucketForCodeBuild",
    });
    new s3deploy.BucketDeployment(this, getResourceName("source-deploy"), {
      sources: [
        s3deploy.Source.asset(path.join(__dirname, "../../"), {
          ignoreMode: IgnoreMode.GIT,
          exclude: [
            "**/node_modules/**",
            "**/dist/**",
            "**/dev-dist/**",
            "**/.venv/**",
            "**/__pycache__/**",
            "**/cdk.out/**",
            "**/.vscode/**",
            "**/.DS_Store/**",
            "**/.git/**",
            "**/.github/**",
            "**/.mypy_cache/**",
            "**/examples/**",
            "**/docs/**",
            "**/.env",
            "**/.env.local",
            "**/.gitignore",
            "**/test/**",
            "**/tests/**",
            "**/backend/embedding_statemachine/pdf_ai_ocr/**",
            "**/backend/guardrails/**",
          ],
        }),
      ],
      destinationBucket: sourceBucket,
      logRetention: logs.RetentionDays.THREE_MONTHS,
    });
    // CodeBuild used for api publication
    const apiPublishCodebuild = new ApiPublishCodebuild(
      this,
      getResourceName("api-publish-codebuild"),
      {
        sourceBucket,
      }
    );
    // CodeBuild used for KnowledgeBase
    const bedrockCustomBotCodebuild = new BedrockCustomBotCodebuild(
      this,
      getResourceName("bedrock-kb-codebuild"),
      {
        sourceBucket,
      }
    );

    const frontend = new Frontend(this,getResourceName("frontend"), {
      accessLogBucket,
      webAclId: props.webAclId,
      enableMistral: props.enableMistral,
      enableIpV6: props.enableIpV6,
    });

    const auth = new Auth(this, getResourceName("auth"), {
      origin: frontend.getOrigin(),
      userPoolDomainPrefixKey: props.userPoolDomainPrefix,
      idp,
      allowedSignUpEmailDomains: props.allowedSignUpEmailDomains,
      autoJoinUserGroups: props.autoJoinUserGroups,
      selfSignUpEnabled: props.selfSignUpEnabled,
    });
    const largeMessageBucket = new Bucket(this, getResourceName("large-bessage-bucket"), {
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      objectOwnership: ObjectOwnership.OBJECT_WRITER,
      autoDeleteObjects: true,
      serverAccessLogsBucket: accessLogBucket,
      serverAccessLogsPrefix: "large-bessage-bucket",
    });

    const database = new Database(this, getResourceName("database"), {
      // Enable PITR to export data to s3
      pointInTimeRecovery: true,
    });

    const usageAnalysis = new UsageAnalysis(this, getResourceName("usage-analysis"), {
      accessLogBucket,
      sourceDatabase: database,
    });

    const backendApi = new Api(this, getResourceName("backend-api"), {
      database: database.table,
      auth,
      bedrockRegion: props.bedrockRegion,
      tableAccessRole: database.tableAccessRole,
      documentBucket: props.documentBucket,
      apiPublishProject: apiPublishCodebuild.project,
      bedrockCustomBotProject: bedrockCustomBotCodebuild.project,
      usageAnalysis,
      largeMessageBucket,
      enableMistral: props.enableMistral,
      enableLambdaSnapStart: props.enableLambdaSnapStart,
    });
    props.documentBucket.grantReadWrite(backendApi.handler);

    // For streaming response
    const websocket = new WebSocket(this, getResourceName("websocket"), {
      accessLogBucket,
      database: database.table,
      tableAccessRole: database.tableAccessRole,
      websocketSessionTable: database.websocketSessionTable,
      auth,
      bedrockRegion: props.bedrockRegion,
      largeMessageBucket,
      documentBucket: props.documentBucket,
      enableMistral: props.enableMistral,
      enableBedrockCrossRegionInference:
        props.enableBedrockCrossRegionInference,
      enableLambdaSnapStart: props.enableLambdaSnapStart,
    });
    frontend.buildViteApp({
      backendApiEndpoint: backendApi.api.apiEndpoint,
      webSocketApiEndpoint: websocket.apiEndpoint,
      userPoolDomainPrefix: props.userPoolDomainPrefix,
      enableMistral: props.enableMistral,
      auth,
      idp,
    });

    const cloudFrontWebDistribution = frontend.cloudFrontWebDistribution.node
      .defaultChild as CloudFrontWebDistribution;
    props.documentBucket.addCorsRule({
      allowedMethods: [HttpMethods.PUT],
      allowedOrigins: [
        `https://${cloudFrontWebDistribution.distributionDomainName}`, // frontend.getOrigin() is cyclic reference
        "http://localhost:5173",
        "*",
      ],
      allowedHeaders: ["*"],
      maxAge: 3000,
    });

    const embedding = new Embedding(this, getResourceName("embedding"), {
      bedrockRegion: props.bedrockRegion,
      database: database.table,
      tableAccessRole: database.tableAccessRole,
      documentBucket: props.documentBucket,
      bedrockCustomBotProject: bedrockCustomBotCodebuild.project,
      useStandbyReplicas: props.useStandbyReplicas,
    });

    // WebAcl for published API
    const webAclForPublishedApi = new WebAclForPublishedApi(
      this,
      getResourceName("web-acl-for-published-api"),
      {
        allowedIpV4AddressRanges: props.publishedApiAllowedIpV4AddressRanges,
        allowedIpV6AddressRanges: props.publishedApiAllowedIpV6AddressRanges,
      }
    );

    new CfnOutput(this, "DocumentBucketName", {
      value: props.documentBucket.bucketName,
    });
    new CfnOutput(this, "FrontendURL", {
      value: frontend.getOrigin(),
    });

    // Outputs for API publication
    new CfnOutput(this, "PublishedApiWebAclArn", {
      value: webAclForPublishedApi.webAclArn,
      exportName: ApiPublicationOutput.PublishedApiWebAclArn,
    });
    new CfnOutput(this, "ConversationTableName", {
      value: database.table.tableName,
      exportName: ApiPublicationOutput.BedrockClaudeChatConversationTableName,
    });
    new CfnOutput(this, "TableAccessRoleArn", {
      value: database.tableAccessRole.roleArn,
      exportName: ApiPublicationOutput.BedrockClaudeChatTableAccessRoleArn,
    });
    new CfnOutput(this, "LargeMessageBucketName", {
      value: largeMessageBucket.bucketName,
      exportName: ApiPublicationOutput.BedrockClaudeChatLargeMessageBucketName,
    });
  }
}
