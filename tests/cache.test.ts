import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { saveGraphCache, loadGraphCache } from '../src/core/cache.js';
import fs from 'fs-extra';
import path from 'path';

// ============================================
// TEST: Cache System (Lock + Atomic Write)
// ============================================

const CACHE_TEST_DIR = path.join(process.cwd(), '.test-cache-project');

beforeAll(async () => {
  await fs.ensureDir(CACHE_TEST_DIR);
});

afterAll(async () => {
  await fs.remove(CACHE_TEST_DIR);
});

describe('saveGraphCache & loadGraphCache', () => {
  it('saves and loads graph data correctly', async () => {
    const graphData = {
      nodes: [
        {
          id: 'src/test.ts',
          name: 'test.ts',
          ext: '.ts',
          importsCount: 1,
          importedByCount: 0,
          isOrphan: false,
          isEntryPoint: true,
          isHotspot: false,
        }
      ],
      links: [],
      timestamp: Date.now(),
    };

    await saveGraphCache(CACHE_TEST_DIR, graphData as any);
    const loaded = await loadGraphCache(CACHE_TEST_DIR);

    expect(loaded).not.toBeNull();
    expect(loaded!.nodes).toHaveLength(1);
    expect(loaded!.nodes[0].id).toBe('src/test.ts');
  });

  it('returns null when no cache exists', async () => {
    const nonExistentDir = path.join(CACHE_TEST_DIR, 'nonexistent');
    const loaded = await loadGraphCache(nonExistentDir);
    expect(loaded).toBeNull();
  });

  it('overwrites existing cache', async () => {
    const graph1 = {
      nodes: [{ id: 'v1.ts', name: 'v1.ts', ext: '.ts', importsCount: 0, importedByCount: 0, isOrphan: true, isEntryPoint: false, isHotspot: false }],
      links: [],
      timestamp: 1,
    };
    const graph2 = {
      nodes: [{ id: 'v2.ts', name: 'v2.ts', ext: '.ts', importsCount: 0, importedByCount: 0, isOrphan: true, isEntryPoint: false, isHotspot: false }],
      links: [],
      timestamp: 2,
    };

    await saveGraphCache(CACHE_TEST_DIR, graph1 as any);
    await saveGraphCache(CACHE_TEST_DIR, graph2 as any);

    const loaded = await loadGraphCache(CACHE_TEST_DIR);
    expect(loaded!.nodes[0].id).toBe('v2.ts');
  });

  it('creates .spidermap directory if not exists', async () => {
    const freshDir = path.join(CACHE_TEST_DIR, 'fresh-project');
    await fs.ensureDir(freshDir);

    await saveGraphCache(freshDir, {
      nodes: [],
      links: [],
      timestamp: Date.now(),
    } as any);

    const spidermapDir = path.join(freshDir, '.spidermap');
    expect(await fs.pathExists(spidermapDir)).toBe(true);
  });

  it('cleans up lock file after save', async () => {
    await saveGraphCache(CACHE_TEST_DIR, {
      nodes: [],
      links: [],
      timestamp: Date.now(),
    } as any);

    const lockPath = path.join(CACHE_TEST_DIR, '.spidermap', 'graph.lock');
    expect(await fs.pathExists(lockPath)).toBe(false);
  });
});
