import fs from 'fs-extra';
import path from 'path';
import { GraphData } from './types.js';

const CACHE_DIR_NAME = '.spidermap';
const GRAPH_FILE_NAME = 'graph.json';
const LOCK_FILE_NAME = 'graph.lock';
const LOCK_TIMEOUT_MS = 30000; // 30 detik timeout

// ============================================
// FILE LOCK UNTUK CONCURRENCY CACHE
// ============================================

async function acquireLock(projectRoot: string): Promise<boolean> {
  const lockPath = path.join(projectRoot, CACHE_DIR_NAME, LOCK_FILE_NAME);
  try {
    await fs.ensureDir(path.join(projectRoot, CACHE_DIR_NAME));
    // Cek apakah lock sudah ada dan masih valid
    if (await fs.pathExists(lockPath)) {
      const lockData = await fs.readJson(lockPath);
      const lockAge = Date.now() - lockData.timestamp;
      if (lockAge < LOCK_TIMEOUT_MS) {
        return false; // Lock masih aktif
      }
      // Lock sudah expired, hapus
    }
    // Buat lock file baru
    await fs.writeJson(lockPath, {
      timestamp: Date.now(),
      pid: process.pid
    });
    return true;
  } catch {
    return false;
  }
}

async function releaseLock(projectRoot: string): Promise<void> {
  const lockPath = path.join(projectRoot, CACHE_DIR_NAME, LOCK_FILE_NAME);
  try {
    await fs.remove(lockPath);
  } catch {
    // Abaikan error saat menghapus lock
  }
}

// ============================================
// FUNGSI CACHE UTAMA
// ============================================

export async function saveGraphCache(projectRoot: string, graphData: GraphData): Promise<void> {
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const locked = await acquireLock(projectRoot);
    if (locked) {
      try {
        const cacheDir = path.join(projectRoot, CACHE_DIR_NAME);
        await fs.ensureDir(cacheDir);
        const cachePath = path.join(cacheDir, GRAPH_FILE_NAME);
        // Write ke file temp dulu, lalu rename (atomic write)
        const tempPath = cachePath + '.tmp';
        await fs.writeJson(tempPath, graphData, { spaces: 2 });
        await fs.rename(tempPath, cachePath);
      } finally {
        await releaseLock(projectRoot);
      }
      return;
    }
    // Tunggu sebentar sebelum retry
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  console.warn('[Cache] Could not acquire lock after retries, writing without lock');
  // Fallback: tulis langsung tanpa lock
  const cachePath = path.join(projectRoot, CACHE_DIR_NAME, GRAPH_FILE_NAME);
  await fs.ensureDir(path.dirname(cachePath));
  await fs.writeJson(cachePath, graphData, { spaces: 2 });
}

export async function loadGraphCache(projectRoot: string): Promise<GraphData | null> {
  const cachePath = path.join(projectRoot, CACHE_DIR_NAME, GRAPH_FILE_NAME);
  try {
    if (await fs.pathExists(cachePath)) {
      const data = await fs.readJson(cachePath);
      return data as GraphData;
    }
  } catch (error) {
    console.error(`Error reading cache from ${cachePath}:`, error);
  }
  return null;
}
