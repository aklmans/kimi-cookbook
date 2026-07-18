import fs from "node:fs";
import path from "node:path";

const PUBLIC_DIR = path.join(process.cwd(), "public");

export function publicAssetExists(src?: string): boolean {
  if (!src || !src.startsWith("/") || src.startsWith("//")) return false;

  const pathname = src.split("?")[0].split("#")[0].replace(/^\/+/, "");
  const resolved = path.resolve(PUBLIC_DIR, pathname);
  if (resolved !== PUBLIC_DIR && !resolved.startsWith(`${PUBLIC_DIR}${path.sep}`)) {
    return false;
  }

  try {
    return fs.statSync(resolved).isFile();
  } catch {
    return false;
  }
}
