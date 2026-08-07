# Auto-Indexing System

Spider Map now includes **automatic real-time indexing** with a 3-second debounce - meaning file changes are detected instantly but the index updates every 3 seconds after the last change to batch updates efficiently.

## 🚀 Quick Start

### Enable Auto-Indexing

```bash
# Using MCP tool
{
  "tool": "configure_auto_indexing",
  "arguments": {
    "projectRoot": "/path/to/your/project",
    "debounceMs": 3000,
    "enableFileWatcher": true
  }
}
```

### Stop Auto-Indexing

```bash
{
  "tool": "stop_auto_indexing",
  "arguments": {}
}
```

## ⚙️ Configuration Modes

### 1. **Development Mode** (Default)
- ✅ Real-time file watcher
- ✅ 3-second debounce
- ✅ Incremental updates only
- ✅ Low latency (~500ms detection)

```typescript
import { developmentConfig } from './spider-map.config.ts';
import { initializeAutoIndexer } from './src/core/auto-indexer.ts';

await initializeAutoIndexer(developmentConfig);
```

### 2. **Production Mode**
- ✅ Periodic sync every 5 minutes
- ✅ No real-time watcher (lower resource)
- ✅ Full reindex periodically
- ✅ Best for stability

```typescript
import { productionConfig } from './spider-map.config.ts';
import { initializeAutoIndexer } from './src/core/auto-indexer.ts';

await initializeAutoIndexer(productionConfig);
```

### 3. **Lightweight Mode**
- ✅ Real-time watcher
- ✅ No periodic sync
- ✅ 5-second debounce
- ✅ Minimal overhead

```typescript
import { lightweightConfig } from './spider-map.config.ts';
import { initializeAutoIndexer } from './src/core/auto-indexer.ts';

await initializeAutoIndexer(lightweightConfig);
```

### 4. **Custom Configuration**

```typescript
import { createConfig } from './spider-map.config.ts';
import { initializeAutoIndexer } from './src/core/auto-indexer.ts';

const config = createConfig({
  projectRoot: '/my/project',
  debounceMs: 2000,          // 2-second debounce
  enableFileWatcher: true,
  enablePeriodicSync: true,
  periodicSyncMs: 10 * 60 * 1000,  // 10 minutes
});

await initializeAutoIndexer(config);
```

## 🔄 How It Works

### Real-Time Detection + Debounce

```
File change detected
         ↓
    [0ms] Queued for update
         ↓
    [1s] More changes come in... [Reset timer]
         ↓
    [2s] More changes come in... [Reset timer]
         ↓
    [3s] No more changes
         ↓
    [3000ms] Debounce triggered → Batch reindex
         ↓
    Cache updated instantly ✅
```

### Incremental vs Full Reindex

**Incremental Update** (on debounce):
- Only analyzes changed files
- Updates dependencies for modified files
- Adds new files to graph
- Removes deleted files
- Fast: ~100-500ms for typical changes

**Full Reindex** (periodic or forced):
- Scans entire project
- Complete graph rebuild
- Used as fallback if incremental fails
- Slower but guaranteed correct: ~1-10s depending on project size

## 📊 Performance Characteristics

| Mode | Detection | Debounce | Update Type | Resources |
|------|-----------|----------|------------|-----------|
| Development | Instant (~10ms) | 3s | Incremental | Medium |
| Production | Periodic (5m) | 5s | Full | Low |
| Lightweight | Instant (~10ms) | 5s | Incremental | Low |

## 🎯 Use Cases

### When to use Development Mode:
- Local development
- Want instant feedback on changes
- Small to medium projects (<5000 files)
- Don't mind higher resource usage

### When to use Production Mode:
- Running as MCP server
- Large projects (>10,000 files)
- Want guaranteed stability
- Resource-constrained environments

### When to use Lightweight Mode:
- Medium projects
- Want real-time detection but lower overhead
- Longer debounce acceptable (5s)

## 🔧 Configuration File

Edit `spider-map.config.ts` to customize:

```typescript
export const developmentConfig: AutoIndexerConfig = {
  enabled: true,
  projectRoot: process.cwd(),
  debounceMs: 3000,              // ← Change debounce here
  enableFileWatcher: true,
  enablePeriodicSync: false,
  ignorePatterns: [              // ← Add/remove patterns
    'node_modules/**',
    'dist/**',
    '.git/**',
    'my-heavy-folder/**',        // ← Add custom ignore
  ],
};
```

## 📝 Events & Monitoring

### Monitor Updates

```typescript
import { initializeAutoIndexer } from './src/core/auto-indexer.ts';

const indexer = await initializeAutoIndexer({
  projectRoot: '/my/project',
  onIndexUpdate: (event) => {
    console.log(`📊 Index updated:`);
    console.log(`   Added: ${event.filesAdded.length}`);
    console.log(`   Modified: ${event.filesModified.length}`);
    console.log(`   Deleted: ${event.filesDeleted.length}`);
    console.log(`   Time: ${event.indexTime}ms`);
  }
});
```

### Check Graph Status

```typescript
const graph = indexer.getGraph();
if (graph) {
  console.log(`✅ Graph ready: ${graph.nodes.length} files, ${graph.links.length} links`);
} else {
  console.log(`⏳ Indexing in progress...`);
}
```

## 🚨 Troubleshooting

### "File watcher failed"
- Windows: File watcher might not work on network drives
- Solution: Use polling fallback (automatic) or switch to Production mode
- Check logs: `[AutoIndexer] File watcher failed, using polling fallback`

### "Graph not updating"
- Verify patterns in `ignorePatterns` aren't too broad
- Check file permissions
- Try: `forceReindex()` in the auto-indexer instance

### "High CPU/Memory usage"
- Increase `debounceMs` (3000 → 5000)
- Switch to Production mode
- Reduce `periodicSyncMs` interval
- Add more patterns to `ignorePatterns`

### "Many orphan files"
This is **normal**! Config files, docs, migrations, etc. are often orphans.

## 🔒 Environment Variables

Control configuration via environment:

```bash
# Set project root
PROJECT_ROOT=/path/to/project npm run mcp

# Use production mode
NODE_ENV=production npm run mcp

# Use lightweight mode
NODE_ENV=lightweight npm run mcp
```

## 📚 API Reference

### AutoIndexerConfig

```typescript
interface AutoIndexerConfig {
  enabled: boolean;                    // Enable/disable auto-indexing
  projectRoot: string;                 // Project root path
  debounceMs: number;                  // Debounce delay (default: 3000)
  watchInterval?: number;              // Polling fallback interval
  enableFileWatcher: boolean;          // Use fs.watch
  enablePeriodicSync?: boolean;        // Enable periodic sync
  periodicSyncMs?: number;             // Periodic interval (default: 5min)
  ignorePatterns: string[];            // Patterns to ignore
  onIndexUpdate?: (event: IndexUpdateEvent) => void | Promise<void>;
}
```

### IndexUpdateEvent

```typescript
interface IndexUpdateEvent {
  timestamp: number;                   // When update occurred
  type: 'incremental' | 'full';       // Update type
  filesAdded: string[];               // New files
  filesModified: string[];            // Changed files
  filesDeleted: string[];             // Removed files
  totalChanges: number;               // Total change count
  indexTime: number;                  // Reindex time in ms
}
```

## ✅ Best Practices

1. **Development**: Use default development config with 3s debounce
2. **Production**: Switch to Production mode for stability
3. **Large Projects**: Consider longer debounce (5-10s) or periodic sync
4. **CI/CD**: Use Production mode with periodic sync only
5. **Monitoring**: Set `onIndexUpdate` callback to track indexing health

## 🎓 Examples

### Example 1: Auto-index development project

```typescript
import { initializeAutoIndexer } from './src/core/auto-indexer.ts';

const indexer = await initializeAutoIndexer({
  projectRoot: process.cwd(),
  debounceMs: 3000,
  enableFileWatcher: true,
  enablePeriodicSync: false,
});

console.log('✅ Auto-indexing enabled - file changes will update graph every 3 seconds');
```

### Example 2: Production server with periodic sync

```typescript
import { initializeAutoIndexer } from './src/core/auto-indexer.ts';

const indexer = await initializeAutoIndexer({
  projectRoot: '/production/app',
  debounceMs: 5000,
  enableFileWatcher: false,
  enablePeriodicSync: true,
  periodicSyncMs: 10 * 60 * 1000,  // Every 10 minutes
  onIndexUpdate: (event) => {
    if (event.totalChanges > 0) {
      console.log(`[REINDEX] ${event.totalChanges} changes detected`);
    }
  }
});
```

### Example 3: Graceful shutdown

```typescript
import { stopAutoIndexer } from './src/core/auto-indexer.ts';

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await stopAutoIndexer();
  process.exit(0);
});
```

---

**Happy indexing! 🕷️**
