/**
 * Spider Map Auto-Indexer Configuration
 * 
 * This file configures the auto-indexing behavior for the MCP Spider Map server.
 * Customize settings to match your project needs.
 */

import type { AutoIndexerConfig } from './src/core/auto-indexer.js';

/**
 * Default configuration for development mode
 * - Real-time file watching
 * - 3-second debounce
 * - Incremental updates only
 */
export const developmentConfig: AutoIndexerConfig = {
  enabled: true,
  projectRoot: process.cwd(),
  debounceMs: 3000,                    // 3 second debounce
  enableFileWatcher: true,              // Real-time detection
  enablePeriodicSync: false,            // No periodic sync in dev
  ignorePatterns: [
    'node_modules/**',
    'dist/**',
    'build/**',
    '.git/**',
    '.spidermap/**',
    '**/*.tmp',
    '**/*.lock',
    '**/vendor/**',
    '.vscode/**',
  ],
};

/**
 * Configuration for production mode
 * - Periodic sync only (every 5 minutes)
 * - Lower resource usage
 * - Full reindex periodically
 */
export const productionConfig: AutoIndexerConfig = {
  enabled: true,
  projectRoot: process.cwd(),
  debounceMs: 5000,                    // 5 second debounce
  enableFileWatcher: false,             // Disable file watcher in prod
  enablePeriodicSync: true,             // Periodic full sync
  periodicSyncMs: 5 * 60 * 1000,        // Every 5 minutes
  ignorePatterns: [
    'node_modules/**',
    'dist/**',
    'build/**',
    '.git/**',
    '.spidermap/**',
    '**/*.tmp',
    '**/*.lock',
    '**/vendor/**',
    '.vscode/**',
  ],
};

/**
 * Configuration for lightweight mode
 * - Minimal resource usage
 * - File watcher only (no periodic sync)
 * - Longer debounce
 */
export const lightweightConfig: AutoIndexerConfig = {
  enabled: true,
  projectRoot: process.cwd(),
  debounceMs: 5000,                    // 5 second debounce
  enableFileWatcher: true,              // Real-time detection
  enablePeriodicSync: false,            // No periodic sync
  watchInterval: 5000,                 // Polling fallback every 5s
  ignorePatterns: [
    'node_modules/**',
    'dist/**',
    'build/**',
    '.git/**',
    '.spidermap/**',
    '**/*.tmp',
    '**/*.lock',
    '**/vendor/**',
  ],
};

/**
 * Get configuration based on environment
 */
export function getConfig(): AutoIndexerConfig {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return {
        ...productionConfig,
        projectRoot: process.env.PROJECT_ROOT || productionConfig.projectRoot,
      };
    case 'lightweight':
      return {
        ...lightweightConfig,
        projectRoot: process.env.PROJECT_ROOT || lightweightConfig.projectRoot,
      };
    default:
      return {
        ...developmentConfig,
        projectRoot: process.env.PROJECT_ROOT || developmentConfig.projectRoot,
      };
  }
}

/**
 * Custom configuration builder
 * 
 * Example:
 * ```
 * const config = createConfig({
 *   projectRoot: '/path/to/project',
 *   debounceMs: 2000,
 *   enablePeriodicSync: true,
 * });
 * ```
 */
export function createConfig(overrides: Partial<AutoIndexerConfig>): AutoIndexerConfig {
  const baseConfig = getConfig();
  return {
    ...baseConfig,
    ...overrides,
  };
}
