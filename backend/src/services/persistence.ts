import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { resolve } from 'path';

const WRITE_TEST = '.agentflow-write-test';

function tryUseDataDir(candidate: string): string | null {
  try {
    if (!existsSync(candidate)) {
      mkdirSync(candidate, { recursive: true });
    }
    const testPath = resolve(candidate, WRITE_TEST);
    writeFileSync(testPath, '1', 'utf-8');
    unlinkSync(testPath);
    return candidate;
  } catch {
    return null;
  }
}

/**
 * Resolves a writable directory for JSON persistence.
 * Tries several paths so Render / Docker work even when DATA_DIR points at
 * /var/data without a disk, wrong permissions, or an outdated env var.
 */
function getDataDir(): string {
  const cwdData = resolve(process.cwd(), 'data');
  const tmpFallback = resolve(tmpdir(), 'agentflow-data');

  const candidates: string[] = [];

  // 1) Explicit DATA_DIR (e.g. Render persistent disk at /var/data) when it works
  if (process.env.DATA_DIR) {
    candidates.push(resolve(process.env.DATA_DIR));
  }
  // 2) App directory: always created & writable in our Dockerfile (/app/data)
  candidates.push(cwdData);
  // 3) Last resort: OS temp (ephemeral)
  candidates.push(tmpFallback);

  const seen = new Set<string>();
  const tried: string[] = [];

  for (const dir of candidates) {
    if (seen.has(dir)) continue;
    seen.add(dir);
    tried.push(dir);
    const ok = tryUseDataDir(dir);
    if (ok) {
      if (
        process.env.NODE_ENV !== 'test' &&
        process.env.DATA_DIR &&
        resolve(process.env.DATA_DIR) !== ok
      ) {
        console.warn(
          `[persistence] Using ${ok} (DATA_DIR=${process.env.DATA_DIR} was not usable)`
        );
      }
      return ok;
    }
  }

  throw new Error('[persistence] No writable data directory. Tried: ' + tried.join(', '));
}

let dataDir: string | null = null;

function ensureDataDir(): string {
  if (dataDir === null) {
    dataDir = getDataDir();
  }
  return dataDir;
}

export function loadJsonFile<T>(filename: string, fallback: T): T {
  const dir = ensureDataDir();
  const filePath = resolve(dir, filename);

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
  const dir = ensureDataDir();
  const filePath = resolve(dir, filename);
  const tempPath = `${filePath}.tmp`;

  writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  renameSync(tempPath, filePath);
}
