#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { OpenSearchRestoreStack } from "../lib/app-stack";

const app = new cdk.App();
new OpenSearchRestoreStack(app, "OpenSearchRestoreStack", {
  env: { region: "ap-northeast-1", account: "659753834358" },
});
