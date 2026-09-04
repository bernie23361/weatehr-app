import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { generateTemperatureArtifacts, generateTemperatureArtifactsFromStations } from '../cloudflare-worker/weather-temperature-worker.mjs';

const apiKey = process.env.CWA_API_KEY;
const observationFile = process.env.CWA_OBSERVATION_FILE;

const outputDirectory = resolve(process.argv[2] || 'artifacts/temperature');
let artifacts;
if (observationFile) {
  const payload = JSON.parse(await readFile(resolve(observationFile), 'utf8'));
  const stations = (payload.stations ?? []).filter((station) => (
    Number.isFinite(station.latitude)
    && Number.isFinite(station.longitude)
    && Number.isFinite(station.temperature)
  )).map((station) => ({
    latitude: station.latitude,
    longitude: station.longitude,
    temperature: station.temperature,
  }));
  const observedAt = payload.stations?.reduce((latest, station) => (
    typeof station.observedAt === 'string' && station.observedAt > latest ? station.observedAt : latest
  ), '') || null;
  artifacts = await generateTemperatureArtifactsFromStations(stations, observedAt, 'CWA observation Worker');
} else {
  if (!apiKey) throw new Error('CWA_API_KEY or CWA_OBSERVATION_FILE is required');
  artifacts = await generateTemperatureArtifacts(apiKey);
}
const { png, metadata } = artifacts;

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(resolve(outputDirectory, 'latest.png'), png),
  writeFile(resolve(outputDirectory, 'latest.json'), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8'),
]);

console.log(JSON.stringify({
  event: 'temperature_artifacts_generated',
  outputDirectory,
  observedAt: metadata.time,
  stationCount: metadata.stationCount,
  pngBytes: png.byteLength,
  grid: metadata.grid,
}));
