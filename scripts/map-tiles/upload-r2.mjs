#!/usr/bin/env node
// Uploads generated tiles to a Cloudflare R2 bucket.
//
// Two authentication modes, chosen automatically:
//   * S3 API  — when R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY are
//     set. Fast and concurrent. Create these under R2 → Manage API Tokens.
//   * wrangler — otherwise, via an existing `wrangler login` OAuth session
//     (`wrangler r2 object put`). Slower per object, so it runs concurrently.
//
// Optional env: R2_BUCKET (default: weather-map-tiles)
//
// Usage: node scripts/map-tiles/upload-r2.mjs [--kind base|terrain] [--concurrency 8]
import { readFile, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, join, relative, sep } from 'node:path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { BASE_TILES_DIR, ROOT_DIR, TERRAIN_TILES_DIR } from './config.mjs';

const KIND = {
  base: { dir: BASE_TILES_DIR, prefix: 'base' },
  terrain: { dir: TERRAIN_TILES_DIR, prefix: 'terrain' },
};

const CONTENT_TYPES = {
  '.pbf': 'application/x-protobuf',
  '.png': 'image/png',
};

const CACHE_CONTROL = 'public, max-age=31536000, immutable';
const WRANGLER_JS = join(ROOT_DIR, 'node_modules', 'wrangler', 'bin', 'wrangler.js');

async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

async function pool(items, limit, worker, onError) {
  let cursor = 0;
  let failures = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        await worker(items[index], index);
      } catch (error) {
        failures += 1;
        onError?.(items[index], error);
      }
    }
  });
  await Promise.all(runners);
  return failures;
}

function putViaWrangler(bucket, key, file) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        WRANGLER_JS,
        'r2',
        'object',
        'put',
        `${bucket}/${key}`,
        '--file',
        file,
        '--content-type',
        CONTENT_TYPES[extname(file)] ?? 'application/octet-stream',
        '--cache-control',
        CACHE_CONTROL,
        '--remote',
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    );
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(stderr.slice(-400) || `wrangler exit ${code}`)),
    );
  });
}

async function main() {
  const args = process.argv.slice(2);
  const argValue = (name, fallback) => {
    const i = args.indexOf(name);
    return i !== -1 ? args[i + 1] : fallback;
  };
  const kind = argValue('--kind', 'base');
  const concurrency = Number(argValue('--concurrency', '8'));

  const config = KIND[kind];
  if (!config) throw new Error(`Unknown --kind ${kind} (expected base|terrain)`);

  const bucket = process.env.R2_BUCKET || 'weather-map-tiles';
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  const useS3 = Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);

  const files = await walk(config.dir);
  console.log(
    `Uploading ${files.length} ${kind} tiles to r2://${bucket}/${config.prefix}/ ` +
      `using ${useS3 ? 'S3 API' : 'wrangler OAuth'} (concurrency ${concurrency})`,
  );

  let put;
  if (useS3) {
    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    });
    put = async (key, file) => {
      const body = await readFile(file);
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          CacheControl: CACHE_CONTROL,
          ContentType: CONTENT_TYPES[extname(file)] ?? 'application/octet-stream',
        }),
      );
    };
  } else {
    put = (key, file) => putViaWrangler(bucket, key, file);
  }

  let done = 0;
  const failures = await pool(
    files,
    concurrency,
    async (file) => {
      const key = `${config.prefix}/${relative(config.dir, file).split(sep).join('/')}`;
      await put(key, file);
      done += 1;
      if (done % 100 === 0) console.log(`  ${done}/${files.length}`);
    },
    (file, error) => console.warn(`  FAILED ${relative(config.dir, file)}: ${error.message}`),
  );

  console.log(`Done. ${done} uploaded, ${failures} failed.`);
  if (failures) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
