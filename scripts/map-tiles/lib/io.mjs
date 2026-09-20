// Filesystem / download helpers shared by the map-tile scripts.
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import AdmZip from 'adm-zip';

export async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

export async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** Download `url` to `dest` unless it is already cached. Retries on failure. */
export async function download(url, dest, { retries = 3 } = {}) {
  if (await exists(dest)) {
    console.log(`cached   ${dest}`);
    return dest;
  }
  await ensureDir(dirname(dest));
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      await writeFile(dest, buffer);
      console.log(`fetched  ${url}`);
      console.log(`         -> ${dest} (${buffer.length} bytes)`);
      return dest;
    } catch (error) {
      console.warn(`download attempt ${attempt}/${retries} failed: ${error.message}`);
      if (attempt === retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
  return dest;
}

/** Extract a zip archive into `destDir`; returns the entry names. */
export function unzipTo(zipPath, destDir) {
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(destDir, true);
  return zip.getEntries().map((entry) => entry.entryName);
}

/** Recursively collect files under `dir` whose name ends with `ext`. */
export async function findFiles(dir, ext) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await findFiles(full, ext)));
    else if (entry.name.toLowerCase().endsWith(ext)) found.push(full);
  }
  return found;
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

export async function writeJson(path, value) {
  await ensureDir(dirname(path));
  await writeFile(path, JSON.stringify(value, null, 2));
}
