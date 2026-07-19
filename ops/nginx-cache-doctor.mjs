#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const CONFIG_MARKER = /^# configuration file (.+):$/;
const CACHE_ENABLE_DIRECTIVES = new Set([
  "fastcgi_cache",
  "proxy_cache",
  "proxy_store",
  "srcache_fetch",
  "srcache_store",
]);

function usage(message) {
  if (message) console.error(`nginx-cache-doctor: ${message}`);
  console.error(
    "Usage: nginx-cache-doctor.mjs [--stdin | --input FILE | --nginx BIN] DOMAIN [DOMAIN ...]",
  );
  process.exit(2);
}

function parseArguments(argv) {
  let mode = "nginx";
  let value = "nginx";
  const domains = [];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--stdin") {
      mode = "stdin";
      value = "";
    } else if (argument === "--input" || argument === "--nginx") {
      const next = argv[index + 1];
      if (!next) usage(`${argument} requires a value`);
      mode = argument === "--input" ? "input" : "nginx";
      value = next;
      index += 1;
    } else if (argument.startsWith("--")) {
      usage(`unknown option: ${argument}`);
    } else {
      domains.push(argument.toLowerCase());
    }
  }

  if (domains.length === 0) usage("at least one domain is required");
  for (const domain of domains) {
    if (!/^[a-z0-9.-]+$/.test(domain)) usage(`invalid domain: ${domain}`);
  }

  return { mode, value, domains };
}

function readStdin() {
  return fs.readFileSync(0, "utf8");
}

function loadDump({ mode, value }) {
  if (mode === "stdin") return readStdin();
  if (mode === "input") return fs.readFileSync(value, "utf8");

  const result = spawnSync(value, ["-T"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) {
    throw new Error(`could not run ${value} -T: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(
      `${value} -T failed (${result.status})\n${result.stderr || result.stdout}`,
    );
  }
  return `${result.stdout}\n${result.stderr}`;
}

function splitSections(dump) {
  const sections = [];
  let current = { source: "<input>", content: "" };

  for (const line of dump.split(/\r?\n/)) {
    const marker = line.match(CONFIG_MARKER);
    if (marker) {
      if (current.content.trim()) sections.push(current);
      current = { source: marker[1], content: "" };
      continue;
    }
    current.content += `${line}\n`;
  }
  if (current.content.trim()) sections.push(current);
  return sections;
}

function tokenize(content) {
  const tokens = [];
  let buffer = "";
  let line = 1;
  let tokenLine = 1;
  let quote = "";
  let escaped = false;
  let comment = false;

  const flush = () => {
    if (!buffer) return;
    tokens.push({ value: buffer, line: tokenLine });
    buffer = "";
  };

  for (const character of content) {
    if (comment) {
      if (character === "\n") {
        comment = false;
        line += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        buffer += character;
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = "";
      } else {
        buffer += character;
        if (character === "\n") line += 1;
      }
      continue;
    }
    if (character === "#") {
      flush();
      comment = true;
    } else if (character === "'" || character === '"') {
      if (!buffer) tokenLine = line;
      quote = character;
    } else if (/\s/.test(character)) {
      flush();
      if (character === "\n") line += 1;
    } else if (character === ";" || character === "{" || character === "}") {
      flush();
      tokens.push({ value: character, line });
    } else {
      if (!buffer) tokenLine = line;
      buffer += character;
    }
  }
  flush();
  return tokens;
}

function parseNodes(tokens) {
  let cursor = 0;

  function parseBlock(stopAtBrace) {
    const nodes = [];
    let head = [];

    while (cursor < tokens.length) {
      const token = tokens[cursor];
      cursor += 1;
      if (token.value === "}") {
        if (!stopAtBrace) throw new Error(`unexpected } on line ${token.line}`);
        return nodes;
      }
      if (token.value === ";") {
        if (head.length > 0) {
          nodes.push({
            name: head[0].value,
            args: head.slice(1).map(({ value }) => value),
            line: head[0].line,
            children: null,
          });
        }
        head = [];
        continue;
      }
      if (token.value === "{") {
        if (head.length === 0) throw new Error(`unexpected { on line ${token.line}`);
        nodes.push({
          name: head[0].value,
          args: head.slice(1).map(({ value }) => value),
          line: head[0].line,
          children: parseBlock(true),
        });
        head = [];
        continue;
      }
      head.push(token);
    }

    if (stopAtBrace) throw new Error("unclosed configuration block");
    return nodes;
  }

  return parseBlock(false);
}

function walk(nodes, visitor, ancestors = []) {
  for (const node of nodes) {
    visitor(node, ancestors);
    if (node.children) walk(node.children, visitor, [...ancestors, node]);
  }
}

function includePatternToRegExp(pattern) {
  let expression = pattern.startsWith("/") ? "^" : "(?:^|/)";

  for (const character of pattern) {
    if (character === "*") {
      expression += "[^/]*";
    } else if (character === "?") {
      expression += "[^/]";
    } else {
      expression += character.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
    }
  }

  return new RegExp(`${expression}$`);
}

function matchingIncludeSections(sections, includeNode) {
  const matches = [];
  for (const pattern of includeNode.args) {
    const matcher = includePatternToRegExp(pattern);
    for (const section of sections) {
      if (matcher.test(section.source)) matches.push(section);
    }
  }
  return matches;
}

/**
 * nginx -T prints every included file as a separate source section rather than
 * inlining it at the include site. Re-expand those files while retaining the
 * surrounding http/server/location ancestry so cache directives are assigned
 * to their effective context instead of guessed from filenames.
 */
function walkExpanded(
  nodes,
  section,
  sections,
  visitor,
  ancestors = [],
  includeStack = new Set([section.source]),
) {
  for (const node of nodes) {
    visitor(node, ancestors, section);

    if (node.name === "include") {
      for (const included of matchingIncludeSections(sections, node)) {
        if (includeStack.has(included.source)) continue;
        const nextStack = new Set(includeStack);
        nextStack.add(included.source);
        walkExpanded(
          included.nodes,
          included,
          sections,
          visitor,
          ancestors,
          nextStack,
        );
      }
    }

    if (node.children) {
      walkExpanded(
        node.children,
        section,
        sections,
        visitor,
        [...ancestors, node],
        includeStack,
      );
    }
  }
}

function expandDirectNodes(
  nodes,
  section,
  sections,
  includeStack = new Set([section.source]),
) {
  const expanded = [];

  for (const node of nodes) {
    if (node.name !== "include") {
      expanded.push({ node, section });
      continue;
    }

    for (const included of matchingIncludeSections(sections, node)) {
      if (includeStack.has(included.source)) continue;
      const nextStack = new Set(includeStack);
      nextStack.add(included.source);
      expanded.push(
        ...expandDirectNodes(included.nodes, included, sections, nextStack),
      );
    }
  }

  return expanded;
}

function direct(nodes, name) {
  return nodes.filter((node) => node.name === name);
}

function serverHasDomain(server, domain) {
  return direct(server.children || [], "server_name").some((directive) =>
    directive.args.some(
      (name) => name.toLowerCase() === domain || name.toLowerCase() === `www.${domain}`,
    ),
  );
}

function directiveEnablesCache(node) {
  if (!CACHE_ENABLE_DIRECTIVES.has(node.name)) return false;
  const value = (node.args[0] || "").toLowerCase();
  return value !== "off" && value !== "0";
}

function formatDirective(section, node) {
  return `${section.source}:${node.line} ${node.name} ${node.args.join(" ")}`.trim();
}

export function auditNginxDump(dump, domains) {
  const sections = splitSections(dump).map((section) => ({
    ...section,
    nodes: parseNodes(tokenize(section.content)),
  }));
  const failures = [];
  const passes = [];
  const information = [];
  const failureKeys = new Set();

  const fail = (key, message) => {
    if (failureKeys.has(key)) return;
    failureKeys.add(key);
    failures.push(message);
  };

  for (const section of sections) {
    walk(section.nodes, (node) => {
      if (node.name === "proxy_cache_path") {
        information.push(`cache zone: ${formatDirective(section, node)}`);
      }
      if (node.name === "open_file_cache") {
        information.push(
          `file metadata cache (not proxy HTML): ${formatDirective(section, node)}`,
        );
      }
      if (!directiveEnablesCache(node)) return;
      information.push(`cache enabled: ${formatDirective(section, node)}`);
    });
  }

  let foundHttpContext = false;
  for (const section of sections) {
    walk(section.nodes, (node) => {
      if (node.name !== "http" || !node.children) return;
      foundHttpContext = true;
      walkExpanded(
        node.children,
        section,
        sections,
        (candidate, ancestors, candidateSection) => {
          if (!directiveEnablesCache(candidate)) return;
          const scoped = ancestors.some(
            (ancestor) =>
              ancestor.name === "server" || ancestor.name === "location",
          );
          if (!scoped) {
            const formatted = formatDirective(candidateSection, candidate);
            fail(
              `global:${formatted}`,
              `global response cache default: ${formatted}`,
            );
          }
        },
        [node],
      );
    });
  }

  // Standalone fixtures and individual config files have no surrounding http
  // block. Retain a conservative fallback for clearly global/unscoped files;
  // a complete nginx -T dump takes the context-aware path above.
  if (!foundHttpContext) {
    for (const section of sections) {
      walk(section.nodes, (node, ancestors) => {
        if (!directiveEnablesCache(node)) return;
        const scoped = ancestors.some(
          (ancestor) =>
            ancestor.name === "server" || ancestor.name === "location",
        );
        const vhostSource = /\/vhost\/(?:nginx\/)?(?:extension\/)?/i.test(
          section.source,
        );
        if (!scoped && !vhostSource) {
          const formatted = formatDirective(section, node);
          fail(
            `unscoped:${formatted}`,
            `global or unscoped response cache default: ${formatted}`,
          );
        }
      });
    }
  }

  for (const domain of domains) {
    const matchingServers = [];
    for (const section of sections) {
      walk(section.nodes, (node) => {
        if (node.name === "server" && serverHasDomain(node, domain)) {
          matchingServers.push({ section, server: node });
        }
      });
    }

    if (matchingServers.length === 0) {
      failures.push(`${domain}: no server block with a matching server_name was found`);
      continue;
    }

    for (const match of matchingServers) {
      walkExpanded(
        match.server.children || [],
        match.section,
        sections,
        (node, _ancestors, nodeSection) => {
          if (!directiveEnablesCache(node)) return;
          const formatted = formatDirective(nodeSection, node);
          fail(
            `target:${domain}:${formatted}`,
            `${domain}: target server enables response caching: ${formatted}`,
          );
        },
        [match.server],
      );
    }

    const proxyRoots = [];
    for (const match of matchingServers) {
      const serverChildren = expandDirectNodes(
        match.server.children || [],
        match.section,
        sections,
      );
      for (const { node: location, section: locationSection } of serverChildren) {
        if (location.name !== "location") continue;
        const isRoot = location.args.at(-1) === "/";
        const locationChildren = expandDirectNodes(
          location.children || [],
          locationSection,
          sections,
        );
        const hasProxyPass = locationChildren.some(
          ({ node }) => node.name === "proxy_pass",
        );
        if (isRoot && hasProxyPass) {
          proxyRoots.push({
            ...match,
            location,
            locationSection,
            locationChildren,
          });
        }
      }
    }

    if (proxyRoots.length === 0) {
      failures.push(`${domain}: no proxying location / was found`);
      continue;
    }

    for (const { location, locationSection, locationChildren } of proxyRoots) {
      const explicitlyOff = locationChildren.some(
        ({ node }) =>
          node.name === "proxy_cache" &&
          node.args[0]?.toLowerCase() === "off",
      );
      if (explicitlyOff) {
        passes.push(
          `${domain}: proxying location / explicitly disables proxy_cache (${locationSection.source}:${location.line})`,
        );
      } else {
        failures.push(
          `${domain}: proxying location / does not explicitly set proxy_cache off (${locationSection.source}:${location.line})`,
        );
      }
    }
  }

  return { failures, passes, information };
}

function printReport(report) {
  for (const message of report.passes) console.log(`[PASS] ${message}`);
  for (const message of report.information) console.log(`[INFO] ${message}`);
  for (const message of report.failures) console.error(`[FAIL] ${message}`);
  console.log(
    report.failures.length === 0
      ? "nginx-cache-doctor: PASS"
      : `nginx-cache-doctor: FAIL (${report.failures.length} issue(s))`,
  );
}

if (path.resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArguments(process.argv.slice(2));
    const dump = loadDump(options);
    const report = auditNginxDump(dump, options.domains);
    printReport(report);
    if (report.failures.length > 0) process.exitCode = 1;
  } catch (error) {
    console.error(
      `nginx-cache-doctor: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 2;
  }
}
