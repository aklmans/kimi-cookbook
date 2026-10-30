import { spawn } from "node:child_process";

const port = Number(process.env.RELEASE_CHECK_PORT ?? 3010);
const baseURL = `http://127.0.0.1:${port}`;
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
let server;
let serverExit;
let serverSettled = false;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function reachable() {
  try {
    const response = await fetch(baseURL, {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function stopServer() {
  if (!server || serverSettled) return;
  server.kill("SIGTERM");
  await Promise.race([serverExit, delay(5000)]);
  if (!serverSettled) {
    server.kill("SIGKILL");
    await serverExit;
  }
}

async function waitForServer() {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (serverSettled) {
      const result = await serverExit;
      throw new Error(
        `Production server exited before readiness (${result.error?.message ?? result.code ?? result.signal}).`,
      );
    }
    if (await reachable()) return;
    await delay(500);
  }
  throw new Error(`Production server did not become ready at ${baseURL} within 60s.`);
}

async function runSmoke() {
  const child = spawn(process.execPath, ["scripts/smoke.mjs"], {
    stdio: "inherit",
    env: { ...process.env, SMOKE_BASE_URL: baseURL },
  });
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) reject(new Error(`Smoke test exited with signal ${signal}.`));
      else resolve(code ?? 1);
    });
  });
}

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error(`Invalid RELEASE_CHECK_PORT: ${port}`);
}

let status = 0;
try {
  if (await reachable()) {
    throw new Error(`${baseURL} is already serving traffic; choose another RELEASE_CHECK_PORT.`);
  }

  server = spawn(
    npmCommand,
    ["start", "--", "--hostname", "127.0.0.1", "--port", String(port)],
    { stdio: "inherit", env: process.env },
  );
  serverExit = new Promise((resolve) => {
    server.once("error", (error) => {
      serverSettled = true;
      resolve({ error });
    });
    server.once("exit", (code, signal) => {
      serverSettled = true;
      resolve({ code, signal });
    });
  });

  await waitForServer();
  status = await runSmoke();
} catch (error) {
  console.error(error);
  status = 1;
} finally {
  await stopServer();
}

process.exitCode = status;
