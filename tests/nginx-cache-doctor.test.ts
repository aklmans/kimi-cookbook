import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";

const SCRIPT = path.join(process.cwd(), "ops", "nginx-cache-doctor.mjs");

function runDoctor(dump: string, ...domains: string[]) {
  return spawnSync(process.execPath, [SCRIPT, "--stdin", ...domains], {
    input: dump,
    encoding: "utf8",
  });
}

const safeVhost = `
# configuration file /www/server/panel/vhost/nginx/kimi.read.wiki.conf:
server {
  listen 443 ssl;
  server_name kimi.read.wiki;
  include /www/server/panel/vhost/nginx/extension/kimi.read.wiki/*.conf;
  location / {
    proxy_pass http://127.0.0.1:3011;
    proxy_cache off;
  }
}
`;

test("nginx cache doctor accepts an opt-in cache zone with target cache disabled", () => {
  const result = runDoctor(
    `
# configuration file /www/server/nginx/conf/proxy.conf:
proxy_cache_path /tmp/cache keys_zone=cache_one:10m;
open_file_cache max=1000 inactive=20s;
${safeVhost}
`,
    "kimi.read.wiki",
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /nginx-cache-doctor: PASS/);
  assert.match(result.stdout, /file metadata cache \(not proxy HTML\)/);
});

test("nginx cache doctor rejects a global proxy_cache default", () => {
  const result = runDoctor(
    `
# configuration file /www/server/nginx/conf/proxy.conf:
proxy_cache_path /tmp/cache keys_zone=cache_one:10m;
proxy_cache cache_one;
${safeVhost}
`,
    "kimi.read.wiki",
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /global or unscoped response cache default/);
});

test("nginx cache doctor restores an http-level include context", () => {
  const result = runDoctor(
    `
# configuration file /www/server/nginx/conf/nginx.conf:
events {}
http {
  include /www/server/nginx/conf/proxy.conf;
  include /www/server/panel/vhost/nginx/*.conf;
}
# configuration file /www/server/nginx/conf/proxy.conf:
proxy_cache_path /tmp/cache keys_zone=cache_one:10m;
proxy_cache cache_one;
${safeVhost}
`,
    "kimi.read.wiki",
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /global response cache default/);
  assert.match(result.stderr, /conf\/proxy\.conf/);
});

test("nginx cache doctor rejects a proxying root that inherits cache state", () => {
  const result = runDoctor(
    `
# configuration file /www/server/panel/vhost/nginx/kimi.read.wiki.conf:
server {
  server_name kimi.read.wiki;
  location / {
    proxy_pass http://127.0.0.1:3011;
  }
}
`,
    "kimi.read.wiki",
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /does not explicitly set proxy_cache off/);
});

test("nginx cache doctor rejects cache enabled in a target extension", () => {
  const result = runDoctor(
    `
${safeVhost}
# configuration file /www/server/panel/vhost/nginx/extension/kimi.read.wiki/cache.conf:
proxy_cache cache_one;
`,
    "kimi.read.wiki",
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /target server enables response caching/);
});

test("nginx cache doctor follows a shared include from the target server", () => {
  const result = runDoctor(
    `
# configuration file /www/server/panel/vhost/nginx/kimi.read.wiki.conf:
server {
  server_name kimi.read.wiki;
  include /www/server/panel/vhost/nginx/shared/cache-location.conf;
  location / {
    proxy_pass http://127.0.0.1:3011;
    proxy_cache off;
  }
}
# configuration file /www/server/panel/vhost/nginx/shared/cache-location.conf:
location = /special {
  proxy_pass http://127.0.0.1:3011;
  proxy_cache cache_one;
}
`,
    "kimi.read.wiki",
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /target server enables response caching/);
  assert.match(result.stderr, /shared\/cache-location\.conf/);
});

test("nginx cache doctor allows an explicit cache in an unrelated server", () => {
  const result = runDoctor(
    `
${safeVhost}
# configuration file /www/server/panel/vhost/nginx/legacy.example.com.conf:
server {
  server_name legacy.example.com;
  location / {
    proxy_pass http://127.0.0.1:9000;
    proxy_cache cache_one;
  }
}
`,
    "kimi.read.wiki",
  );

  assert.equal(result.status, 0, result.stderr);
});

test("repository nginx template passes the cache doctor", () => {
  const result = spawnSync(
    process.execPath,
    [
      SCRIPT,
      "--input",
      path.join(process.cwd(), "docs", "nginx-kimi.read.wiki.conf"),
      "kimi.read.wiki",
    ],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr);
});
