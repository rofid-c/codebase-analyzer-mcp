import path from 'path';
import { Node, Link, GraphData, ImpactSimulation } from './types.js';

export function buildGraph(files: string[], dependencies: { source: string; targets: string[] }[]): GraphData {
  const nodesMap = new Map<string, Node>();
  const links: Link[] = [];

  // Inisialisasi node awal
  for (const file of files) {
    nodesMap.set(file, {
      id: file,
      name: path.basename(file),
      ext: path.extname(file),
      importsCount: 0,
      importedByCount: 0,
      isOrphan: true,
      isEntryPoint: false,
      isHotspot: false,
    });
  }

  // Bangun relasi (links) dan hitung fan-in/fan-out
  for (const dep of dependencies) {
    const sourceNode = nodesMap.get(dep.source);
    if (!sourceNode) continue;

    for (const target of dep.targets) {
      if (!nodesMap.has(target)) continue;

      links.push({ source: dep.source, target });

      sourceNode.importsCount++;
      const targetNode = nodesMap.get(target)!;
      targetNode.importedByCount++;
    }
  }

  // Perbarui status node (Arsitektur Multi-dimensi)
  const nodes = Array.from(nodesMap.values()).map(node => {
    // 1. Peran di dalam Grafik (Graph Role)
    if (node.importsCount === 0 && node.importedByCount === 0) {
      node.role = 'orphan';
    } else if (node.importsCount > 0 && node.importedByCount === 0) {
      node.role = 'entry';
    } else if (node.importsCount > 0 && node.importedByCount > 0) {
      node.role = 'direct'; // atau circular (melingkar), disederhanakan untuk saat ini
    } else {
      node.role = 'indirect';
    }

    // Kompatibilitas mundur dengan versi lama
    node.isOrphan = node.role === 'orphan';
    node.isEntryPoint = node.role === 'entry';
    node.isHotspot = node.importedByCount > 5;

    // 2. Tingkat Risiko (berdasarkan Fan-in)
    if (node.importedByCount > 10) node.riskLevel = 'critical';
    else if (node.importedByCount > 4) node.riskLevel = 'moderate';
    else if (node.importedByCount > 0) node.riskLevel = 'low';
    else node.riskLevel = 'leaf';

    // 3. Kategori File
    const name = node.name.toLowerCase();
    const ext = node.ext.toLowerCase();
    
    // Kode Backend/Utama
    if (['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs'].includes(ext)) {
      node.fileCategory = 'core';
    } else if (['.php', '.py', '.go', '.rs', '.java', '.c', '.cpp', '.cc'].includes(ext)) {
      node.fileCategory = 'core';
    } else if (['.dart'].includes(ext)) {
      node.fileCategory = name.includes('_test') ? 'test' : 'core';
    }
    // Tampilan/Frontend
    else if (['.blade.php', '.vue', '.html', '.jsx', '.tsx', '.svelte'].includes(ext) || name.endsWith('.blade.php')) {
      node.fileCategory = 'view';
    }
    // Gaya/CSS
    else if (['.css', '.scss', '.sass', '.less', '.styl'].includes(ext)) {
      node.fileCategory = 'style';
    }
    // Konfigurasi
    else if (['.json', '.yml', '.yaml', '.toml', '.ini', '.env'].includes(ext) || 
             name.includes('config') || name.includes('.config.') || 
             name === 'cargo.toml' || name === 'go.mod' || name === 'pubspec.yaml') {
      node.fileCategory = 'config';
    }
    // Basis Data
    else if (['.sql', '.prisma'].includes(ext) || name.includes('migration') || name.includes('schema')) {
      node.fileCategory = 'db';
    }
    // Dokumentasi
    else if (['.md', '.txt', '.rst', '.adoc'].includes(ext)) {
      node.fileCategory = 'doc';
    }
    // Pengujian (Tests)
    else if (name.includes('.test.') || name.includes('.spec.') || name.includes('_test.') || 
             name.includes('test_') || name.startsWith('test')) {
      node.fileCategory = 'test';
    }
    // Header (C/C++)
    else if (['.h', '.hpp', '.hxx'].includes(ext)) {
      node.fileCategory = 'utility';
    }
    // Aset/Gambar
    else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.ttf'].includes(ext)) {
      node.fileCategory = 'asset';
    }
    // Bawaan (Default)
    else {
      node.fileCategory = 'utility';
    }
    
    return node;
  });

  return {
    nodes,
    links,
    timestamp: Date.now(),
  };
}

export function simulateImpact(graph: GraphData, changedFileId: string): ImpactSimulation {
  const directlyAffected = new Set<string>();
  const indirectlyAffected = new Set<string>();

  // Peta untuk mencari siapa yang mengimpor file tertentu (dependensi terbalik)
  const importedByMap = new Map<string, Set<string>>();
  for (const link of graph.links) {
    if (!importedByMap.has(link.target)) {
      importedByMap.set(link.target, new Set());
    }
    importedByMap.get(link.target)!.add(link.source);
  }

  // Algoritma BFS (Breadth-First Search) untuk mencari semua file yang terdampak
  const queue = [changedFileId];
  const visited = new Set<string>([changedFileId]);
  let isDirect = true;

  while (queue.length > 0) {
    const levelSize = queue.length;
    for (let i = 0; i < levelSize; i++) {
      const current = queue.shift()!;
      
      const importers = importedByMap.get(current);
      if (importers) {
        for (const importer of importers) {
          if (!visited.has(importer)) {
            visited.add(importer);
            queue.push(importer);
            if (isDirect) {
              directlyAffected.add(importer);
            } else {
              indirectlyAffected.add(importer);
            }
          }
        }
      }
    }
    isDirect = false; // After first level, it's indirect
  }

  // Update visual impact states on the graph copy
  const simulatedGraph: GraphData = JSON.parse(JSON.stringify(graph));
  for (const node of simulatedGraph.nodes) {
    if (node.id === changedFileId) {
      node.impactState = 'source';
    } else if (directlyAffected.has(node.id)) {
      node.impactState = 'direct';
    } else if (indirectlyAffected.has(node.id)) {
      node.impactState = 'indirect';
    } else if (node.isOrphan) {
      node.impactState = 'orphan';
    } else {
      node.impactState = 'safe';
    }
  }

  return {
    changedFile: changedFileId,
    directlyAffected: Array.from(directlyAffected),
    indirectlyAffected: Array.from(indirectlyAffected),
    totalAffectedCount: directlyAffected.size + indirectlyAffected.size,
    graph: simulatedGraph,
  };
}
