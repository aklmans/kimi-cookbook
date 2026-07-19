import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { getDeploymentHealth } from "../lib/deployment-health";

const SHA_A = "a".repeat(40);
const SHA_B = "b".repeat(40);

function makeRelease({
  releaseVersion,
  buildVersion,
}: {
  releaseVersion?: string;
  buildVersion?: string;
} = {}) {
  const releaseRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "kimi-deployment-health-"),
  );

  if (releaseVersion !== undefined) {
    fs.writeFileSync(path.join(releaseRoot, "RELEASE"), `${releaseVersion}\n`);
  }

  if (buildVersion !== undefined) {
    const nextRoot = path.join(releaseRoot, ".next");
    fs.mkdirSync(nextRoot);
    fs.writeFileSync(
      path.join(nextRoot, "required-server-files.json"),
      JSON.stringify({ config: { deploymentId: buildVersion } }),
    );
  }

  return releaseRoot;
}

test("development health does not require packaged release markers", () => {
  const releaseRoot = makeRelease({
    releaseVersion: SHA_A,
    buildVersion: SHA_A,
  });
  const health = getDeploymentHealth({
    releaseRoot,
    runtimeVersion: "development",
    nodeEnv: "development",
  });

  assert.equal(health.ok, true);
  assert.equal(health.releaseVersion, SHA_A);
  assert.equal(health.buildVersion, SHA_A);
});

test("production health requires runtime, package, and build SHAs to match", () => {
  const releaseRoot = makeRelease({
    releaseVersion: SHA_A,
    buildVersion: SHA_A,
  });
  const health = getDeploymentHealth({
    releaseRoot,
    runtimeVersion: SHA_A,
    nodeEnv: "production",
  });

  assert.equal(health.ok, true);
  assert.deepEqual(health.checks, {
    runtimeVersion: true,
    releaseVersion: true,
    buildVersion: true,
  });
});

test("an old release cwd cannot pass with a new runtime SHA", () => {
  const releaseRoot = makeRelease({
    releaseVersion: SHA_A,
    buildVersion: SHA_A,
  });
  const health = getDeploymentHealth({
    releaseRoot,
    runtimeVersion: SHA_B,
    nodeEnv: "production",
  });

  assert.equal(health.ok, false);
  assert.equal(health.checks.runtimeVersion, true);
  assert.equal(health.checks.releaseVersion, false);
  assert.equal(health.checks.buildVersion, false);
});

test("a newly stamped release cannot hide an old Next build", () => {
  const releaseRoot = makeRelease({
    releaseVersion: SHA_B,
    buildVersion: SHA_A,
  });
  const health = getDeploymentHealth({
    releaseRoot,
    runtimeVersion: SHA_B,
    nodeEnv: "production",
  });

  assert.equal(health.ok, false);
  assert.equal(health.checks.releaseVersion, true);
  assert.equal(health.checks.buildVersion, false);
});
