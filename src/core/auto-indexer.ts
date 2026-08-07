import fs from 'fs';
import path from 'path';
import { crawlDirectory } from './crawler.js';
import { parseFileDependencies } from './parser.js';
import { buildGraph, simulateImpact } from './graph.js';
import { loadGraphCache, saveGraphCache } from './cache.js';
import { GraphData, Node } from './types.js';

/**
 * Konfigurasi Auto-Indexer (Pengindeksan Otomatis)
 */
export interface AutoIndexerConfig {
  enabled: boolean;
  projectRoot: string;
  debounceMs?: number;           // Wait time before updating (default: 3000ms = 3 sec)
  watchInterval?: number;        // Fallback polling interval if fs.watch fails
  enableFileWatcher?: boolean;    // Use fs.watch for real-time detection
  enablePeriodicSync?: boolean;  // Periodic full sync (production mode)
  periodicSyncMs?: number;       // Periodic sync interval (default: 5 min)
  ignorePatterns?: string[];      // Patterns to ignore
  onIndexUpdate?: (changes: IndexUpdateEvent) => void | Promise<void>;
}

/**
 * Event perubahan yang dipancarkan saat pembaruan indeks
 */
export interface IndexUpdateEvent {
  timestamp: number;
  type: 'incremental' | 'full';
  filesAdded: string[];
  filesModified: string[];
  filesDeleted: string[];
  totalChanges: number;
  indexTime: number;             // Time taken to reindex in ms
}

/**
 * Layanan Auto-Indexer
 */
export class AutoIndexer {
  private config: AutoIndexerConfig;
  private debounceTimer: NodeJS.Timeout | null = null;
  private pendingChanges = new Set<string>();
  private watchers: fs.FSWatcher[] = [];
  private lastIndexTime = 0;
  private graphCache: GraphData | null = null;
  private fileHashCache = new Map<string, string>();
  private periodicSyncTimer: NodeJS.Timeout | null = null;

  constructor(config: AutoIndexerConfig) {
    this.config = {
      debounceMs: 3000,
      enableFileWatcher: true,
      enablePeriodicSync: false,
      periodicSyncMs: 5 * 60 * 1000, // 5 minutes
      ignorePatterns: ['node_modules/**', 'dist/**', '.git/**', '.spidermap/**'],
      ...config,
    };
  }

  /**
   * Mulai layanan auto-indexing
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      console.log('[AutoIndexer] Disabled');
      return;
    }

    console.log('[AutoIndexer] Starting...');
    
    // Load initial cache
    this.graphCache = await loadGraphCache(this.config.projectRoot);
    
    // Start file watcher
    if (this.config.enableFileWatcher) {
      this.startFileWatcher();
    }

    // Start periodic sync (production mode)
    if (this.config.enablePeriodicSync) {
      this.startPeriodicSync();
    }

    console.log(`[AutoIndexer] Running with ${this.config.debounceMs}ms debounce`);
  }

  /**
   * Hentikan layanan auto-indexing
   */
  async stop(): Promise<void> {
    console.log('[AutoIndexer] Stopping...');

    // Clear timers
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.periodicSyncTimer) clearTimeout(this.periodicSyncTimer);

    // Close watchers
    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];

    console.log('[AutoIndexer] Stopped');
  }

  /**
   * Mulai pemantau sistem file (mode waktu nyata/real-time)
   */
  private startFileWatcher(): void {
    try {
      const watcher = fs.watch(
        this.config.projectRoot,
        { recursive: true, encoding: 'utf8' },
        (eventType, filename) => {
          if (!filename || this.shouldIgnore(filename)) return;
          
          // Queue file for update
          this.pendingChanges.add(filename);
          
          // Reset debounce timer
          this.resetDebounceTimer();
        }
      );

      this.watchers.push(watcher);
      console.log('[AutoIndexer] File watcher started');
    } catch (err) {
      console.warn('[AutoIndexer] File watcher failed, using polling fallback:', err);
      this.startPollingFallback();
    }
  }

  /**
   * Mekanisme polling cadangan jika pemantau file gagal
   */
  private startPollingFallback(): void {
    const interval = this.config.watchInterval || 2000;
    let lastFileCount = 0;

    setInterval(async () => {
      try {
        const files = await crawlDirectory(this.config.projectRoot);
        if (files.length !== lastFileCount) {
          lastFileCount = files.length;
          await this.performFullReindex();
        }
      } catch (err) {
        console.warn('[AutoIndexer] Polling error:', err);
      }
    }, interval);

    console.log(`[AutoIndexer] Polling fallback started (${interval}ms)`);
  }

  /**
   * Mulai sinkronisasi berkala (mode produksi)
   */
  private startPeriodicSync(): void {
    const interval = this.config.periodicSyncMs || 5 * 60 * 1000;

    this.periodicSyncTimer = setInterval(async () => {
      console.log('[AutoIndexer] Periodic sync triggered');
      await this.performFullReindex();
    }, interval);

    console.log(`[AutoIndexer] Periodic sync started (${interval}ms)`);
  }

  /**
   * Atur ulang timer debounce (penundaan)
   */
  private resetDebounceTimer(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      console.log(`[AutoIndexer] Debounce triggered (${this.pendingChanges.size} changes)`);
      await this.performIncrementalReindex();
      this.pendingChanges.clear();
      this.debounceTimer = null;
    }, this.config.debounceMs);
  }

  /**
   * Lakukan reindeks inkremental (hanya file yang berubah)
   */
  private async performIncrementalReindex(): Promise<void> {
    const startTime = Date.now();

    try {
      if (!this.graphCache) {
        await this.performFullReindex();
        return;
      }

      const changedFiles = Array.from(this.pendingChanges);
      const allFiles = await crawlDirectory(this.config.projectRoot);
      const allFilesSet = new Set(allFiles);

      // Detect added/deleted files
      const currentFileSet = new Set(this.graphCache.nodes.map(n => n.id));
      const filesAdded = allFiles.filter(f => !currentFileSet.has(f));
      const filesDeleted = Array.from(currentFileSet).filter(f => !allFilesSet.has(f));

      // Parse changed files
      const dependencies = [];
      for (const file of changedFiles) {
        if (allFilesSet.has(file)) {
          const targets = await parseFileDependencies(file, this.config.projectRoot, allFilesSet);
          if (targets.length > 0) {
            dependencies.push({ source: file, targets });
          }
        }
      }

      // Update graph incrementally
      this.updateGraphIncremental(filesAdded, filesDeleted, dependencies);

      // Save updated cache
      await saveGraphCache(this.config.projectRoot, this.graphCache!);

      const indexTime = Date.now() - startTime;
      await this.emitUpdateEvent({
        timestamp: Date.now(),
        type: 'incremental',
        filesAdded,
        filesModified: changedFiles.filter(f => allFilesSet.has(f)),
        filesDeleted,
        totalChanges: filesAdded.length + changedFiles.length + filesDeleted.length,
        indexTime,
      });

      console.log(
        `[AutoIndexer] Incremental reindex complete (${indexTime}ms): ` +
        `+${filesAdded.length} ~${changedFiles.length} -${filesDeleted.length}`
      );
    } catch (err) {
      console.error('[AutoIndexer] Incremental reindex failed:', err);
      // Fallback to full reindex
      await this.performFullReindex();
    }
  }

  /**
   * Lakukan reindeks secara penuh (seluruh proyek)
   */
  private async performFullReindex(): Promise<void> {
    const startTime = Date.now();

    try {
      console.log('[AutoIndexer] Full reindex started');

      const files = await crawlDirectory(this.config.projectRoot);
      const allFilesSet = new Set(files);
      const dependencies = [];

      for (const file of files) {
        const targets = await parseFileDependencies(file, this.config.projectRoot, allFilesSet);
        if (targets.length > 0) {
          dependencies.push({ source: file, targets });
        }
      }

      this.graphCache = buildGraph(files, dependencies);
      await saveGraphCache(this.config.projectRoot, this.graphCache);

      const indexTime = Date.now() - startTime;
      this.lastIndexTime = Date.now();

      await this.emitUpdateEvent({
        timestamp: this.lastIndexTime,
        type: 'full',
        filesAdded: files,
        filesModified: [],
        filesDeleted: [],
        totalChanges: files.length,
        indexTime,
      });

      console.log(
        `[AutoIndexer] Full reindex complete (${indexTime}ms): ` +
        `${files.length} files, ${this.graphCache.links.length} links`
      );
    } catch (err) {
      console.error('[AutoIndexer] Full reindex failed:', err);
    }
  }

  /**
   * Perbarui grafik secara inkremental (bertahap)
   */
  private updateGraphIncremental(
    filesAdded: string[],
    filesDeleted: string[],
    newDependencies: Array<{ source: string; targets: string[] }>
  ): void {
    if (!this.graphCache) return;

    // Remove deleted files and their links
    const nodeIds = new Set(filesDeleted);
    this.graphCache.nodes = this.graphCache.nodes.filter(n => !nodeIds.has(n.id));
    this.graphCache.links = this.graphCache.links.filter(
      l => !nodeIds.has(l.source as string) && !nodeIds.has(l.target as string)
    );

    // Add/update nodes for new/modified files
    for (const file of filesAdded) {
      const node: Node = {
        id: file,
        name: path.basename(file),
        ext: path.extname(file),
        importsCount: 0,
        importedByCount: 0,
        isOrphan: true,
        isEntryPoint: false,
        isHotspot: false,
      };
      this.graphCache.nodes.push(node);
    }

    // Update dependencies
    const existingNodes = new Set(this.graphCache.nodes.map(n => n.id));
    for (const { source, targets } of newDependencies) {
      // Remove old links from this source
      this.graphCache.links = this.graphCache.links.filter(l => l.source !== source);

      // Add new links
      for (const target of targets) {
        if (existingNodes.has(target)) {
          this.graphCache.links.push({ source, target });
        }
      }
    }

    // Recalculate metrics
    this.recalculateMetrics();
  }

  /**
   * Hitung ulang jumlah impor dan peran dari setiap file
   */
  private recalculateMetrics(): void {
    if (!this.graphCache) return;

    // Reset counts
    for (const node of this.graphCache.nodes) {
      node.importsCount = 0;
      node.importedByCount = 0;
    }

    // Count imports
    const nodeMap = new Map(this.graphCache.nodes.map(n => [n.id, n]));
    for (const link of this.graphCache.links) {
      const sourceNode = nodeMap.get(link.source as string);
      const targetNode = nodeMap.get(link.target as string);

      if (sourceNode) sourceNode.importsCount++;
      if (targetNode) targetNode.importedByCount++;
    }

    // Recalculate roles
    for (const node of this.graphCache.nodes) {
      node.isOrphan = node.importsCount === 0 && node.importedByCount === 0;
      node.isEntryPoint = node.importsCount > 0 && node.importedByCount === 0;
      node.isHotspot = node.importedByCount > 5;
    }
  }

  /**
   * Periksa apakah file harus diabaikan (ignore)
   */
  private shouldIgnore(filename: string): boolean {
    return (this.config.ignorePatterns || []).some(pattern => {
      const regexPattern = pattern.replace(/\*/g, '.*').replace(/\//g, '[/\\\\]');
      return new RegExp(regexPattern).test(filename);
    });
  }

  /**
   * Pancarkan event pembaruan ke luar
   */
  private async emitUpdateEvent(event: IndexUpdateEvent): Promise<void> {
    if (this.config.onIndexUpdate) {
      try {
        await this.config.onIndexUpdate(event);
      } catch (err) {
        console.error('[AutoIndexer] Update handler error:', err);
      }
    }
  }

  /**
   * Dapatkan grafik saat ini
   */
  getGraph(): GraphData | null {
    return this.graphCache;
  }

  /**
   * Pemicu manual untuk reindeks ulang
   */
  async forceReindex(): Promise<void> {
    console.log('[AutoIndexer] Force reindex triggered');
    this.pendingChanges.clear();
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    await this.performFullReindex();
  }
}

/**
 * Instance (objek) auto-indexer global
 */
let globalAutoIndexer: AutoIndexer | null = null;

/**
 * Inisialisasi auto-indexer global
 */
export async function initializeAutoIndexer(config: AutoIndexerConfig): Promise<AutoIndexer> {
  globalAutoIndexer = new AutoIndexer(config);
  await globalAutoIndexer.start();
  return globalAutoIndexer;
}

/**
 * Dapatkan instance auto-indexer global
 */
export function getAutoIndexer(): AutoIndexer | null {
  return globalAutoIndexer;
}

/**
 * Hentikan auto-indexer global
 */
export async function stopAutoIndexer(): Promise<void> {
  if (globalAutoIndexer) {
    await globalAutoIndexer.stop();
    globalAutoIndexer = null;
  }
}
