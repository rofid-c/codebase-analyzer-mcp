export interface Node {
  id: string; // Path relatif file (contoh: 'src/index.ts')
  name: string; // Nama dasar file (contoh: 'index.ts')
  ext: string; // Ekstensi (contoh: '.ts')
  importsCount: number; // Fan-out: jumlah file yang diimpor oleh file ini
  importedByCount: number; // Fan-in: jumlah file yang mengimpor file ini
  isOrphan: boolean; // Benar jika node tidak memiliki koneksi
  isEntryPoint: boolean; // Benar jika node memiliki fan-out > 0 tapi fan-in === 0
  isHotspot: boolean; // Benar jika fan-in tinggi (risiko tinggi)
  role?: 'trigger' | 'direct' | 'indirect' | 'entry' | 'orphan' | 'circular';
  riskLevel?: 'critical' | 'moderate' | 'low' | 'leaf';
  fileCategory?: 'core' | 'config' | 'utility' | 'view' | 'style' | 'test' | 'asset' | 'db' | 'doc';
  val?: number; // Ukuran radius visual bola
  color?: string; // Warna pendaran node
  impactState?: 'source' | 'direct' | 'indirect' | 'safe' | 'orphan';
  
  // Fase 3: Metrik Lanjutan
  linesOfCode?: number;
  complexity?: number;
  testCoverage?: 'covered' | 'uncovered' | 'partial' | 'unknown';
  hasTest?: boolean;
  functionCount?: number;
  classCount?: number;
  codeToCommentRatio?: number;
  
  // Fase 4: Data Temporal/4D
  timeData?: Array<{
    timestamp: number;
    complexity: number;
    linesOfCode: number;
    importsCount: number;
    importedByCount: number;
  }>;
  evolutionMetrics?: {
    complexityTrend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    stabilityScore: number;
    hotspotRisk: number;
    changeFrequency: number;
  };
  position4D?: {
    x: number; y: number; z: number; t: number;
    trail: Array<{ x: number; y: number; z: number; t: number }>;
  };
}

export interface Link {
  source: string; // File target yang mengimpor
  target: string; // File yang sedang diimpor
  type?: 'static' | 'dynamic';
}

export interface GraphData {
  nodes: Node[];
  links: Link[];
  timestamp: number;
}

export interface ImpactSimulation {
  changedFile: string;
  directlyAffected: string[];
  indirectlyAffected: string[];
  totalAffectedCount: number;
  graph: GraphData;
}
