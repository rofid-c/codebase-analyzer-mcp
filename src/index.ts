import { crawlDirectory } from './core/crawler.js';
import { parseFileDependencies } from './core/parser.js';
import { buildGraph } from './core/graph.js';
import { saveGraphCache } from './core/cache.js';
import path from 'path';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'crawl') {
    // Terima argumen opsional --path, nilai bawaannya adalah direktori saat ini
    let projectRoot = process.cwd();
    const pathIndex = args.indexOf('--path');
    if (pathIndex !== -1 && args[pathIndex + 1]) {
      projectRoot = path.resolve(args[pathIndex + 1]);
    }

    const isWatchMode = args.includes('--watch');

    const runCrawl = async () => {
      console.log('');
      console.log('🕷️  Spider Map — Codebase Crawler');
      console.log('─'.repeat(40));
      console.log(`📂 Target: ${projectRoot}`);
      console.log('');

      console.log('⏳ Crawling files...');
      const files = await crawlDirectory(projectRoot);
      console.log(`   Found ${files.length} files`);

      console.log('⏳ Parsing dependencies...');
      const allFilesSet = new Set(files);
      const dependencies = [];
      let totalLinks = 0;

      for (const file of files) {
        const targets = await parseFileDependencies(file, projectRoot, allFilesSet);
        if (targets.length > 0) {
          dependencies.push({ source: file, targets });
          totalLinks += targets.length;
        }
      }
      console.log(`   Found ${totalLinks} dependency links`);

      console.log('⏳ Building graph...');
      const graphData = buildGraph(files, dependencies);

      const hotspots = graphData.nodes.filter(n => n.isHotspot).length;
      const orphans = graphData.nodes.filter(n => n.isOrphan).length;
      const entryPoints = graphData.nodes.filter(n => n.isEntryPoint).length;

      console.log('⏳ Saving cache...');
      await saveGraphCache(projectRoot, graphData);
      
      // Auto-copy ke folder UI (public/ dan .spidermap/) di direktori MCP jika target path berbeda
      try {
        const fs = await import('fs/promises');
        const mcpPublic = path.join(process.cwd(), 'public', 'graph.json');
        const mcpCache = path.join(process.cwd(), '.spidermap', 'graph.json');
        const targetGraph = path.join(projectRoot, '.spidermap', 'graph.json');
        
        if (targetGraph !== mcpPublic) {
          await fs.mkdir(path.dirname(mcpPublic), { recursive: true });
          await fs.copyFile(targetGraph, mcpPublic);
          await fs.mkdir(path.dirname(mcpCache), { recursive: true });
          await fs.copyFile(targetGraph, mcpCache);
        }
      } catch (e) {
        // Abaikan jika proses penyalinan gagal
      }

      console.log('');
      console.log('✅ Spider Map generated successfully!');
      console.log('─'.repeat(40));
      console.log(`   📄 Files:        ${graphData.nodes.length}`);
      console.log(`   🔗 Links:        ${graphData.links.length}`);
      console.log(`   ⚡ Entry Points: ${entryPoints}`);
      console.log(`   🔥 Hotspots:     ${hotspots}`);
      console.log(`   💤 Orphans:      ${orphans}`);
      console.log('');
      console.log(`   💾 Saved to: ${projectRoot}/.spidermap/graph.json`);
      console.log('');
      
      if (isWatchMode) {
        console.log('👀 Watching for file changes (Hybrid Auto-Indexing active)...');
      }
    };

    await runCrawl();

    if (isWatchMode) {
      const fs = await import('fs');
      let debounceTimeout: NodeJS.Timeout | null = null;
      
      fs.watch(projectRoot, { recursive: true }, (eventType, filename) => {
        // Abaikan perubahan pada file internal/cache/node_modules
        if (!filename || filename.includes('node_modules') || filename.includes('.spidermap') || filename.includes('.git')) {
          return;
        }

        // Hybrid Debounce: Tunggu user berhenti men-save selama 2 detik
        if (debounceTimeout) clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(async () => {
          console.log(`\n🔄 File changed: ${filename}. Auto-rebuilding...`);
          await runCrawl();
        }, 2000);
      });
    }
  } else {
    console.log('');
    console.log('🕷️  Spider Map — Usage');
    console.log('─'.repeat(40));
    console.log('');
    console.log('  Scan current directory:');
    console.log('    npm run crawl');
    console.log('');
    console.log('  Scan specific project:');
    console.log('    npm run crawl -- --path "C:\\path\\to\\your\\project"');
    console.log('');
  }
}

main().catch(console.error);
