import { Construct } from "constructs";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import { NagSuppressions } from "cdk-nag";

export interface BedrockCustomBotCodebuildProps {
  readonly sourceBucket: s3.Bucket;
}

export class BedrockCustomBotCodebuild extends Construct {
  public readonly project: codebuild.Project;
  constructor(
    scope: Construct,
    id: string,
    props: BedrockCustomBotCodebuildProps
  ) {
    super(scope, id);

    const sourceBucket = props.sourceBucket;
    const project = new codebuild.Project(this, "Project", {
      source: codebuild.Source.s3({
        bucket: sourceBucket,
        path: "",
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true,
      },
      environmentVariables: {
        PK: { value: "" },
        SK: { value: "" },
        BEDROCK_CLAUDE_CHAT_DOCUMENT_BUCKET_NAME: {
          value: "",
        },
        KNOWLEDGE: { value: "" },
        BEDROCK_KNOWLEDGE_BASE: { value: "" },
        BEDROCK_GUARDRAILS: { value: "" },
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: "0.2",
        phases: {
          install: {
            "runtime-versions": {
              nodejs: "18",
            },
            commands: ["npm install -g aws-cdk"],
            "on-failure": "ABORT",
          },
          build: {
            commands: [
              "cd cdk",
              "npm ci",
              // Extract BOT_ID from SK. Note that SK is given like <user-id>#BOT#<bot-id>
              `export BOT_ID=$(echo $SK | awk -F'#' '{print $3}')`,
              // Replace cdk's entrypoint. This is a workaround to avoid the issue that cdk synthesize all stacks.
              "sed -i 's|bin/bedrock-chat.ts|bin/bedrock-custom-bot.ts|' cdk.json",
              `cdk deploy --require-approval never CdrAiPocChatbotKbStack$BOT_ID`,
            ],
          },
        },
      }),
    });
    sourceBucket.grantRead(project.role!);

    // Allow `cdk deploy`
    project.role!.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["sts:AssumeRole"],
        resources: ["arn:aws:iam::*:role/cdk-*"],
      })
    );

    NagSuppressions.addResourceSuppressions(project, [
      {
        id: "AwsPrototyping-CodeBuildProjectKMSEncryptedArtifacts",
        reason:
          "default: The AWS-managed CMK for Amazon Simple Storage Service (Amazon S3) is used.",
      },
      {
        id: "AwsPrototyping-CodeBuildProjectPrivilegedModeDisabled",
        reason: "for running on the docker daemon on the docker container",
      },
    ]);

    this.project = project;
  }
}
