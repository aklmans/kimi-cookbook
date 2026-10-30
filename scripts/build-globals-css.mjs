import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const stylesDir = path.join(root, "styles", "globals");
const manifestPath = path.join(root, "styles", "globals.manifest");
const outputPath = path.join(root, "app", "globals.css");

function readManifest() {
  return fs
    .readFileSync(manifestPath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

function generate() {
  return readManifest()
    .map((file) => fs.readFileSync(path.join(stylesDir, file), "utf8"))
    .join("");
}

function assertSame(expected, actual) {
  if (expected === actual) return;
  let offset = 0;
  while (expected[offset] === actual[offset]) offset++;
  const line = expected.slice(0, offset).split("\n").length;
  throw new Error(`Generated globals.css differs from its source at line ${line}.`);
}

function build() {
  const css = generate();
  const tempPath = `${outputPath}.tmp`;
  fs.writeFileSync(tempPath, css);
  fs.renameSync(tempPath, outputPath);
  console.log(`globals.css · wrote ${Buffer.byteLength(css)} bytes from ${readManifest().length} ordered partials`);
}

function check() {
  assertSame(fs.readFileSync(outputPath, "utf8"), generate());
  console.log("globals.css · generated output matches ordered source partials");
}

function migrate() {
  if (fs.existsSync(manifestPath)) {
    throw new Error("styles/globals.manifest already exists; refusing to overwrite source partials.");
  }
  const source = fs.readFileSync(outputPath, "utf8");
  const boundaries = [
    ["00-head.css", null],
    ["10-v3-verbatim.css", "/* ============================================================\n   assets/v3.css — VERBATIM"],
    ["20-rounds-001-002.css", "/* ============================================================\n   Round-1 additions"],
    ["30-page-local.css", "/* ============================================================\n   Page-local styles"],
    ["40-rounds-003-010.css", "/* ============================================================\n   Round-3 ·"],
    ["50-rounds-011-020.css", "/* ─────────────────────────────────────────────────────────────────\n   Round-11:"],
    ["60-rounds-021-040.css", "/* ============================================================\n   Round-21 "],
    ["70-rounds-041-060.css", "/* ============================================================\n   Round-41 "],
    ["80-rounds-061-080.css", "/* Round-61 · Code filename headers."],
    ["90-rounds-081-100.css", "/* ============================================================\n   Round-81 ·"],
    ["100-rounds-101-108.css", "/* ============================================================\n   Round-101 ·"],
  ];
  const offsets = boundaries.map(([file, marker], index) => {
    if (marker === null) return 0;
    const offset = source.indexOf(marker);
    if (offset < 0) throw new Error(`Cannot find CSS boundary for ${file}.`);
    if (offset === 0 && index > 0) throw new Error(`Invalid CSS boundary for ${file}.`);
    return offset;
  });
  for (let index = 1; index < offsets.length; index++) {
    if (offsets[index] <= offsets[index - 1]) {
      throw new Error(`CSS boundaries are not strictly ordered at ${boundaries[index][0]}.`);
    }
  }

  fs.mkdirSync(stylesDir, { recursive: true });
  const files = boundaries.map(([file]) => file);
  for (let index = 0; index < files.length; index++) {
    const start = offsets[index];
    const end = index + 1 < offsets.length ? offsets[index + 1] : source.length;
    fs.writeFileSync(path.join(stylesDir, files[index]), source.slice(start, end));
  }
  fs.writeFileSync(manifestPath, `${files.join("\n")}\n`);
  assertSame(source, generate());
  console.log(`globals.css · split and verified ${source.length} characters in original order`);
}

const mode = process.argv[2] ?? "build";
if (mode === "build") build();
else if (mode === "check") check();
else if (mode === "migrate") migrate();
else throw new Error(`Unknown mode: ${mode}`);
