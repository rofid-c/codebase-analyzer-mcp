import fs from 'fs-extra';
import path from 'path';
import { GraphData } from './types.js';

const CACHE_DIR_NAME = '.spidermap';
const GRAPH_FILE_NAME = 'graph.json';

export async function saveGraphCache(projectRoot: string, graphData: GraphData): Promise<void> {
  const cacheDir = path.join(projectRoot, CACHE_DIR_NAME);
  await fs.ensureDir(cacheDir);
  const cachePath = path.join(cacheDir, GRAPH_FILE_NAME);
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
