import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const dataDir = resolve(process.cwd(), 'data');

function ensureDataDir() {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
}

export function loadJsonFile<T>(filename: string, fallback: T): T {
  ensureDataDir();
  const filePath = resolve(dataDir, filename);

  if (!existsSync(filePath)) {
    return fallback;
  }

  try {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

export function saveJsonFile<T>(filename: string, data: T): void {
  ensureDataDir();
  const filePath = resolve(dataDir, filename);
  const tempPath = `${filePath}.tmp`;

  writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  renameSync(tempPath, filePath);
}
