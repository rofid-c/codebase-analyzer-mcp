import { GraphData, Node, Link } from './types.js';

// ============================================
// FORMAT DIOPTIMALKAN UNTUK TOKEN (TOKEN-OPTIMIZED)
// ============================================

export interface GraphSummary {
  version: string;
  stats: {
    totalFiles: number;
    totalLinks: number;
    criticalFiles: number;
    hotspots: number;
    orphans: number;
    entryPoints: number;
  };
  topCritical: Array<{
    id: string;
    importedBy: number;
    role: string;
  }>;
  categories: Record<string, number>;
}

export interface FileQuery {
  file: Node;
  imports: string[];
  importedBy: string[];
  impactRadius: {
    direct: number;
    indirect: number;
    total: number;
  };
}

export interface FileSearchFilters {
  fileCategory?: 'core' | 'config' | 'view' | 'style' | 'test' | 'db' | 'doc' | 'utility' | 'asset';
  riskLevel?: 'critical' | 'moderate' | 'low' | 'leaf';
  role?: 'entry' | 'hotspot' | 'orphan' | 'direct' | 'indirect';
  minImportedByCount?: number;
  maxImportedByCount?: number;
  fileExtension?: string;
  pathContains?: string;
}

export interface SearchResult {
  totalMatches: number;
  files: Array<{
    id: string;
    name: string;
    fileCategory: string;
    riskLevel: string;
    role: string;
    importsCount: number;
    importedByCount: number;
  }>;
  appliedFilters: FileSearchFilters;
}
export interface CompressedGraph {
  v: number; // version
  s: {
    // Tabel Simbol
    f: string[]; // file-file
    c: string[]; // kategori
    r: string[]; // peran (roles)
    l: string[]; // tingkat risiko (risk levels)
  };
  n: number[][]; // nodes: [fileIdx, imports, importedBy, roleIdx, riskIdx, categoryIdx]
  e: number[][]; // edges: [sourceIdx, targetIdx]
}

// ============================================
// MODE RINGKASAN - Pengurangan token sebesar 96%
// ============================================

export function generateSummary(graph: GraphData): GraphSummary {
  const criticalNodes = graph.nodes.filter((n) => n.riskLevel === 'critical');
  const hotspots = graph.nodes.filter((n) => n.isHotspot);
  const orphans = graph.nodes.filter((n) => n.isOrphan);
  const entryPoints = graph.nodes.filter((n) => n.isEntryPoint);

  // Hitung berdasarkan kategori
  const categories: Record<string, number> = {};
  graph.nodes.forEach((node) => {
    const cat = node.fileCategory || 'unknown';
    categories[cat] = (categories[cat] || 0) + 1;
  });

  // File paling kritis teratas
  const topCritical = [...criticalNodes]
    .sort((a, b) => b.importedByCount - a.importedByCount)
    .slice(0, 10)
    .map((n) => ({
      id: n.id,
      importedBy: n.importedByCount,
      role: n.role || 'unknown',
    }));

  return {
    version: '2.0.0',
    stats: {
      totalFiles: graph.nodes.length,
      totalLinks: graph.links.length,
      criticalFiles: criticalNodes.length,
      hotspots: hotspots.length,
      orphans: orphans.length,
      entryPoints: entryPoints.length,
    },
    topCritical,
    categories,
  };
}

// ============================================
// MODE KONSULTASI (QUERY MODE) - Pengurangan token sebesar 98%
// ============================================

export function queryFile(graph: GraphData, fileId: string): FileQuery | null {
  const node = graph.nodes.find((n) => n.id === fileId);
  if (!node) return null;

  // Cari dependensi langsung (yang diimpor oleh file ini)
  const imports = graph.links.filter((l) => l.source === fileId).map((l) => l.target);

  // Cari yang mengimpor langsung (siapa saja yang memakai file ini)
  const importedBy = graph.links.filter((l) => l.target === fileId).map((l) => l.source);

  // Hitung dampak tidak langsung (menggunakan algoritma BFS)
  const indirectImpact = calculateIndirectImpact(graph, fileId);

  return {
    file: node,
    imports,
    importedBy,
    impactRadius: {
      direct: importedBy.length,
      indirect: indirectImpact.size - importedBy.length,
      total: indirectImpact.size,
    },
  };
}

function calculateIndirectImpact(graph: GraphData, fileId: string): Set<string> {
  const affected = new Set<string>();
  const queue = [fileId];
  const visited = new Set<string>([fileId]);

  // Buat peta dependensi terbalik (siapa mengimpor siapa)
  const importedByMap = new Map<string, Set<string>>();
  for (const link of graph.links) {
    if (!importedByMap.has(link.target)) {
      importedByMap.set(link.target, new Set());
    }
    importedByMap.get(link.target)!.add(link.source);
  }

  // BFS untuk mencari semua file yang terkena dampak
  while (queue.length > 0) {
    const current = queue.shift()!;
    const importers = importedByMap.get(current);

    if (importers) {
      for (const importer of importers) {
        if (!visited.has(importer)) {
          visited.add(importer);
          affected.add(importer);
          queue.push(importer);
        }
      }
    }
  }

  return affected;
}

// ============================================
// MODE KOMPRESI - Pengurangan token sebesar 80%
// ============================================

export function compressGraph(graph: GraphData): CompressedGraph {
  // Buat tabel simbol untuk kompresi data
  const files = graph.nodes.map((n) => n.id);
  const categories = [...new Set(graph.nodes.map((n) => n.fileCategory || 'unknown'))];
  const roles = [...new Set(graph.nodes.map((n) => n.role || 'unknown'))];
  const risks = [...new Set(graph.nodes.map((n) => n.riskLevel || 'leaf'))];

  // Buat peta pencarian (lookup maps)
  const fileToIdx = new Map(files.map((f, i) => [f, i]));
  const catToIdx = new Map(categories.map((c, i) => [c, i]));
  const roleToIdx = new Map(roles.map((r, i) => [r, i]));
  const riskToIdx = new Map(risks.map((r, i) => [r, i]));

  // Kemas (pack) node menjadi: [fileIdx, imports, importedBy, roleIdx, riskIdx, categoryIdx]
  const nodes = graph.nodes.map((node) => [
    fileToIdx.get(node.id)!,
    node.importsCount,
    node.importedByCount,
    roleToIdx.get(node.role || 'unknown')!,
    riskToIdx.get(node.riskLevel || 'leaf')!,
    catToIdx.get(node.fileCategory || 'unknown')!,
  ]);

  // Kemas (pack) edge (garis penghubung): [sourceIdx, targetIdx]
  const edges = graph.links.map((link) => [fileToIdx.get(link.source)!, fileToIdx.get(link.target)!]);

  return {
    v: 1,
    s: {
      f: files,
      c: categories,
      r: roles,
      l: risks,
    },
    n: nodes,
    e: edges,
  };
}

export function decompressGraph(compressed: CompressedGraph): GraphData {
  const { s, n, e } = compressed;

  // Bongkar kembali (unpack) node
  const nodes: Node[] = n.map((packed) => {
    const [fileIdx, imports, importedBy, roleIdx, riskIdx, categoryIdx] = packed;
    const id = s.f[fileIdx];

    return {
      id,
      name: id.split('/').pop() || id,
      ext: id.substring(id.lastIndexOf('.')),
      importsCount: imports,
      importedByCount: importedBy,
      role: s.r[roleIdx] as any,
      riskLevel: s.l[riskIdx] as any,
      fileCategory: s.c[categoryIdx] as any,
      isOrphan: imports === 0 && importedBy === 0,
      isEntryPoint: imports > 0 && importedBy === 0,
      isHotspot: importedBy > 5,
    };
  });

  // Bongkar kembali (unpack) garis penghubung (edges)
  const links: Link[] = e.map((packed) => ({
    source: s.f[packed[0]],
    target: s.f[packed[1]],
  }));

  return {
    nodes,
    links,
    timestamp: Date.now(),
  };
}

// ============================================
// FUNGSI UTILITAS BANTUAN (UTILITY FUNCTIONS)
// ============================================

export function getTokenEstimate(data: any): number {
  const jsonString = JSON.stringify(data);
  // Perkiraan kasar: 1 token ≈ 4 karakter (estimasi, bukan hitungan tokenizer asli)
  return Math.ceil(jsonString.length / 4);
}

export function compareTokenUsage(graph: GraphData) {
  const full = graph;
  const summary = generateSummary(graph);
  const compressed = compressGraph(graph);

  return {
    full: {
      tokens: getTokenEstimate(full),
      size: JSON.stringify(full).length,
    },
    summary: {
      tokens: getTokenEstimate(summary),
      size: JSON.stringify(summary).length,
      savings: `${(((getTokenEstimate(full) - getTokenEstimate(summary)) / getTokenEstimate(full)) * 100).toFixed(1)}%`,
    },
    compressed: {
      tokens: getTokenEstimate(compressed),
      size: JSON.stringify(compressed).length,
      savings: `${(((getTokenEstimate(full) - getTokenEstimate(compressed)) / getTokenEstimate(full)) * 100).toFixed(1)}%`,
    },
  };
}
// ============================================
// PENCARIAN FILE - Pemfilteran efisien
// ============================================

export function searchFiles(graph: GraphData, filters: FileSearchFilters = {}): SearchResult {
  let filteredNodes = [...graph.nodes];

  // Terapkan filter
  if (filters.fileCategory) {
    filteredNodes = filteredNodes.filter(node => node.fileCategory === filters.fileCategory);
  }

  if (filters.riskLevel) {
    filteredNodes = filteredNodes.filter(node => node.riskLevel === filters.riskLevel);
  }

  if (filters.role) {
    // Tangani peran (role) khusus
    if (filters.role === 'hotspot') {
      filteredNodes = filteredNodes.filter(node => node.isHotspot);
    } else {
      filteredNodes = filteredNodes.filter(node => node.role === filters.role);
    }
  }

  if (filters.minImportedByCount !== undefined) {
    filteredNodes = filteredNodes.filter(node => node.importedByCount >= filters.minImportedByCount!);
  }

  if (filters.maxImportedByCount !== undefined) {
    filteredNodes = filteredNodes.filter(node => node.importedByCount <= filters.maxImportedByCount!);
  }

  if (filters.fileExtension) {
    filteredNodes = filteredNodes.filter(node => node.ext === filters.fileExtension);
  }

  if (filters.pathContains) {
    const searchTerm = filters.pathContains.toLowerCase();
    filteredNodes = filteredNodes.filter(node => node.id.toLowerCase().includes(searchTerm));
  }

  // Urutkan berdasarkan tingkat kepentingan (jumlah importedByCount menurun)
  filteredNodes.sort((a, b) => b.importedByCount - a.importedByCount);

  // Petakan ke dalam format hasil akhir
  const files = filteredNodes.map(node => ({
    id: node.id,
    name: node.name,
    fileCategory: node.fileCategory || 'unknown',
    riskLevel: node.riskLevel || 'leaf',
    role: node.role || 'unknown',
    importsCount: node.importsCount,
    importedByCount: node.importedByCount,
  }));

  return {
    totalMatches: files.length,
    files,
    appliedFilters: filters,
  };
}