import fs from "node:fs";
import path from "node:path";

const FULL_GIT_SHA = /^[0-9a-f]{40}$/;

type RequiredServerFiles = {
  config?: {
    deploymentId?: unknown;
  };
};

export type DeploymentHealth = {
  ok: boolean;
  version: string;
  releaseVersion: string | null;
  buildVersion: string | null;
  checks: {
    runtimeVersion: boolean;
    releaseVersion: boolean;
    buildVersion: boolean;
  };
};

function readTrimmedFile(filePath: string): string | null {
  try {
    const value = fs.readFileSync(filePath, "utf8").trim();
    return value || null;
  } catch {
    return null;
  }
}

function readBuildVersion(releaseRoot: string): string | null {
  const configPath = path.join(
    releaseRoot,
    ".next",
    "required-server-files.json",
  );

  try {
    const parsed = JSON.parse(
      fs.readFileSync(configPath, "utf8"),
    ) as RequiredServerFiles;
    const deploymentId = parsed.config?.deploymentId;
    return typeof deploymentId === "string" && deploymentId
      ? deploymentId
      : null;
  } catch {
    return null;
  }
}

/**
 * Cross-check the runtime environment against both immutable release markers.
 *
 * RELEASE is stamped while packaging, while required-server-files.json carries
 * Next's build-time deploymentId. Requiring all three values to match prevents
 * an old PM2 cwd from looking healthy after receiving a new environment SHA,
 * and also catches a release directory stamped around the wrong build output.
 *
 * Fail-closed on purpose: a production NODE_ENV without DEPLOYMENT_VERSION
 * (a bare `next start`, or a preview deploy that never sets the env) reports
 * unhealthy instead of guessing. This is by design — do not "fix" it by
 * loosening the checks; set DEPLOYMENT_VERSION to the full git SHA wherever
 * the build is expected to pass.
 */
export function getDeploymentHealth({
  releaseRoot = process.cwd(),
  runtimeVersion = process.env.DEPLOYMENT_VERSION || "development",
  nodeEnv = process.env.NODE_ENV,
}: {
  releaseRoot?: string;
  runtimeVersion?: string;
  nodeEnv?: string;
} = {}): DeploymentHealth {
  const releaseVersion = readTrimmedFile(path.join(releaseRoot, "RELEASE"));
  const buildVersion = readBuildVersion(releaseRoot);
  const development =
    nodeEnv !== "production" && runtimeVersion === "development";

  const checks = development
    ? {
        runtimeVersion: true,
        releaseVersion: true,
        buildVersion: true,
      }
    : {
        runtimeVersion: FULL_GIT_SHA.test(runtimeVersion),
        releaseVersion: releaseVersion === runtimeVersion,
        buildVersion: buildVersion === runtimeVersion,
      };

  return {
    ok: Object.values(checks).every(Boolean),
    version: runtimeVersion,
    releaseVersion,
    buildVersion,
    checks,
  };
}
