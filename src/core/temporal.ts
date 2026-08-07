import fs from 'fs-extra';
import path from 'path';
import { Node, GraphData } from './types.js';
import { CodeMetrics } from './metrics.js';

// ============================================
// STRUKTUR DATA TIME-SERIES 4D (4D TIME-SERIES DATA STRUCTURES)
// ============================================

export interface TimePoint {
  timestamp: number;
  complexity: number;
  linesOfCode: number;
  functionCount: number;
  classCount: number;
  importsCount: number;
  importedByCount: number;
  testCoverage: 'covered' | 'uncovered' | 'partial' | 'unknown';
  changeType?: 'added' | 'modified' | 'deleted' | 'renamed';
  hash?: string;
}

export interface NodeTemporal extends Node {
  timeData: TimePoint[];
  
  // Properti temporal yang dihitung (Calculated temporal properties)
  evolutionMetrics?: {
    complexityTrend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    complexityVelocity: number; // Perubahan per hari (Change per day)
    stabilityScore: number; // 0-100, lebih tinggi = lebih stabil
    changeFrequency: number; // Jumlah perubahan per minggu (Changes per week)
    hotspotRisk: number; // 0-100, kemungkinan menjadi hotspot (area berisiko)
    techDebtAccumulation: number; // Laju akumulasi utang teknis (Rate of debt accumulation)
    lastSignificantChange: number; // Stempel waktu (Timestamp)
    averageTimeToChange: number; // Rata-rata hari antar perubahan
  };
  
  // Pemosisian 4 Dimensi (4D Positioning)
  position4D?: {
    x: number; // Sumbu X berdasarkan dependensi
    y: number; // Sumbu Y berdasarkan dependensi
    z: number; // Sumbu Z berdasarkan kompleksitas
    t: number; // Waktu saat ini (Current time)
    trail: Array<{ x: number; y: number; z: number; t: number }>; // Riwayat posisi sebelumnya
  };
}

export interface TemporalGraph extends GraphData {
  nodes: NodeTemporal[];
  temporalMetadata: {
    timeRange: { start: number; end: number };
    samplingInterval: number; // milidetik antar sampel
    totalSnapshots: number;
    evolutionSummary: {
      complexityTrend: 'improving' | 'degrading' | 'stable';
      hotspotEvolution: number[]; // Jumlah hotspot dari waktu ke waktu
      testCoverageEvolution: number[]; // Persentase cakupan (Coverage %) dari waktu ke waktu
      fileCountEvolution: number[]; // Jumlah file dari waktu ke waktu
    };
  };
}

export interface TemporalSnapshot {
  timestamp: number;
  graphHash: string;
  metrics: {
    totalFiles: number;
    totalComplexity: number;
    averageComplexity: number;
    hotspotsCount: number;
    testCoverageRatio: number;
    technicalDebtIndex: number; // 0-100
  };
  topChangedFiles: Array<{
    filePath: string;
    changeType: string;
    impactScore: number;
  }>;
}

// ============================================
// FUNGSI ANALISIS TEMPORAL (TEMPORAL ANALYSIS FUNCTIONS)
// ============================================

export function calculateComplexityTrend(timeData: TimePoint[]): 'increasing' | 'decreasing' | 'stable' | 'volatile' {
  if (timeData.length < 3) return 'stable';
  
  const complexities = timeData.map(t => t.complexity);
  const changes = [];
  
  for (let i = 1; i < complexities.length; i++) {
    changes.push(complexities[i] - complexities[i - 1]);
  }
  
  const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
  const volatility = Math.sqrt(changes.reduce((sum, change) => sum + Math.pow(change - avgChange, 2), 0) / changes.length);
  
  // Volatilitas (fluktuasi) yang tinggi menunjukkan kompleksitas yang tidak stabil
  if (volatility > 5) return 'volatile';
  
  // Tren yang signifikan (terlihat jelas)
  if (avgChange > 1) return 'increasing';
  if (avgChange < -1) return 'decreasing';
  
  return 'stable';
}

export function calculateStabilityScore(timeData: TimePoint[]): number {
  if (timeData.length < 2) return 100;
  
  let stabilityScore = 100;
  
  // Beri penalti untuk perubahan yang terlalu sering
  const changeFrequency = timeData.length / ((timeData[timeData.length - 1].timestamp - timeData[0].timestamp) / (1000 * 60 * 60 * 24)); // perubahan per hari
  stabilityScore -= Math.min(changeFrequency * 10, 50);
  
  // Beri penalti untuk fluktuasi kompleksitas
  const complexities = timeData.map(t => t.complexity);
  const avgComplexity = complexities.reduce((sum, c) => sum + c, 0) / complexities.length;
  const variance = complexities.reduce((sum, c) => sum + Math.pow(c - avgComplexity, 2), 0) / complexities.length;
  stabilityScore -= Math.min(variance, 30);
  
  // Beri penalti untuk fluktuasi ukuran file
  const sizes = timeData.map(t => t.linesOfCode);
  const avgSize = sizes.reduce((sum, s) => sum + s, 0) / sizes.length;
  const sizeVariance = sizes.reduce((sum, s) => sum + Math.pow(s - avgSize, 2), 0) / sizes.length;
  stabilityScore -= Math.min(sizeVariance / 100, 20);
  
  return Math.max(0, Math.min(100, stabilityScore));
}

export function calculateHotspotRisk(node: NodeTemporal): number {
  if (!node.timeData || node.timeData.length < 2) return 0;
  
  let risk = 0;
  
  // Faktor 1: Tren kompleksitas (bobot 40%)
  const trend = node.evolutionMetrics?.complexityTrend;
  const complexity = node.complexity || 0;
  
  if (trend === 'increasing') risk += 40;
  else if (trend === 'volatile') risk += 30;
  else if (trend === 'stable' && complexity > 20) risk += 20;
  
  // Faktor 2: Frekuensi perubahan (bobot 30%)
  const changeFreq = node.evolutionMetrics?.changeFrequency || 0;
  if (changeFreq > 2) risk += 30; // Lebih dari 2 perubahan per minggu
  else if (changeFreq > 1) risk += 20;
  else if (changeFreq > 0.5) risk += 10;
  
  // Faktor 3: Kompleksitas saat ini (bobot 20%)
  if (complexity > 30) risk += 20;
  else if (complexity > 20) risk += 15;
  else if (complexity > 10) risk += 10;
  
  // Faktor 4: Pertumbuhan dependensi/impor (bobot 10%)
  const firstPoint = node.timeData[0];
  const lastPoint = node.timeData[node.timeData.length - 1];
  const depGrowth = (lastPoint.importedByCount - firstPoint.importedByCount) / Math.max(firstPoint.importedByCount, 1);
  if (depGrowth > 0.5) risk += 10; // Pertumbuhan dependensi 50%
  else if (depGrowth > 0.2) risk += 5;
  
  return Math.min(100, risk);
}

export function predictComplexityGrowth(timeData: TimePoint[], daysAhead: number = 30): number {
  if (timeData.length < 3) return timeData[timeData.length - 1]?.complexity || 0;
  
  // Regresi linier sederhana untuk prediksi kompleksitas
  const points = timeData.map((point, index) => ({ x: index, y: point.complexity }));
  const n = points.length;
  
  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);
  const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Hitung jumlah hari per poin data
  const timeSpan = timeData[timeData.length - 1].timestamp - timeData[0].timestamp;
  const daysPerPoint = timeSpan / (1000 * 60 * 60 * 24) / (timeData.length - 1);
  const futurePoint = timeData.length + (daysAhead / daysPerPoint);
  
  return Math.max(0, slope * futurePoint + intercept);
}

// ============================================
// MANAJEMEN DATA TIME-SERIES
// ============================================

export async function loadTemporalData(projectRoot: string): Promise<TemporalGraph | null> {
  try {
    const temporalPath = path.join(projectRoot, '.spidermap', 'temporal.json');
    const data = await fs.readFile(temporalPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function saveTemporalData(projectRoot: string, temporalGraph: TemporalGraph): Promise<void> {
  const temporalPath = path.join(projectRoot, '.spidermap', 'temporal.json');
  await fs.ensureDir(path.dirname(temporalPath));
  await fs.writeFile(temporalPath, JSON.stringify(temporalGraph, null, 2));
}

export async function addTemporalSnapshot(
  projectRoot: string,
  currentGraph: GraphData,
  metrics: Record<string, CodeMetrics>
): Promise<TemporalGraph> {
  const existing = await loadTemporalData(projectRoot);
  const timestamp = Date.now();
  
  // Buat atau perbarui grafik temporal
  const temporalGraph: TemporalGraph = existing || {
    nodes: [],
    links: currentGraph.links,
    timestamp,
    temporalMetadata: {
      timeRange: { start: timestamp, end: timestamp },
      samplingInterval: 24 * 60 * 60 * 1000, // bawaan: 1 hari
      totalSnapshots: 0,
      evolutionSummary: {
        complexityTrend: 'stable',
        hotspotEvolution: [],
        testCoverageEvolution: [],
        fileCountEvolution: []
      }
    }
  };
  
  // Perbarui setiap node dengan data temporal
  for (const node of currentGraph.nodes) {
    let temporalNode = temporalGraph.nodes.find(tn => tn.id === node.id);
    
    if (!temporalNode) {
      // Node baru
      temporalNode = {
        ...node,
        timeData: [],
      } as NodeTemporal;
      temporalGraph.nodes.push(temporalNode);
    }
    
    // Tambahkan titik waktu saat ini
    const metric = metrics[node.id];
    const timePoint: TimePoint = {
      timestamp,
      complexity: node.complexity || metric?.complexity || 1,
      linesOfCode: metric?.linesOfCode || 0,
      functionCount: metric?.functionCount || 0,
      classCount: metric?.classCount || 0,
      importsCount: node.importsCount,
      importedByCount: node.importedByCount,
      testCoverage: metric?.testCoverage || 'unknown',
    };
    
    temporalNode.timeData.push(timePoint);
    
    // Hitung metrik evolusi (perkembangan)
    temporalNode.evolutionMetrics = {
      complexityTrend: calculateComplexityTrend(temporalNode.timeData),
      complexityVelocity: calculateComplexityVelocity(temporalNode.timeData),
      stabilityScore: calculateStabilityScore(temporalNode.timeData),
      changeFrequency: calculateChangeFrequency(temporalNode.timeData),
      hotspotRisk: calculateHotspotRisk(temporalNode),
      techDebtAccumulation: calculateTechDebtAccumulation(temporalNode.timeData),
      lastSignificantChange: findLastSignificantChange(temporalNode.timeData),
      averageTimeToChange: calculateAverageTimeToChange(temporalNode.timeData),
    };
    
    // Perbarui properti lain dari grafik saat ini
    Object.assign(temporalNode, node);
  }
  
  // Perbarui metadata
  temporalGraph.temporalMetadata.timeRange.end = timestamp;
  temporalGraph.temporalMetadata.totalSnapshots++;
  
  // Hitung ringkasan evolusi
  const totalComplexity = temporalGraph.nodes.reduce((sum, n) => sum + (n.complexity || 0), 0);
  const avgComplexity = totalComplexity / temporalGraph.nodes.length;
  const hotspotsCount = temporalGraph.nodes.filter(n => n.isHotspot).length;
  const coveredFiles = temporalGraph.nodes.filter(n => 
    n.timeData[n.timeData.length - 1]?.testCoverage === 'covered'
  ).length;
  const testCoverageRatio = (coveredFiles / temporalGraph.nodes.length) * 100;
  
  temporalGraph.temporalMetadata.evolutionSummary.hotspotEvolution.push(hotspotsCount);
  temporalGraph.temporalMetadata.evolutionSummary.testCoverageEvolution.push(testCoverageRatio);
  temporalGraph.temporalMetadata.evolutionSummary.fileCountEvolution.push(temporalGraph.nodes.length);
  
  // Tentukan tren kompleksitas secara keseluruhan
  const complexityHistory = temporalGraph.temporalMetadata.evolutionSummary.hotspotEvolution;
  if (complexityHistory.length >= 3) {
    const recent = complexityHistory.slice(-3);
    const trend = recent[2] - recent[0];
    if (trend > 1) temporalGraph.temporalMetadata.evolutionSummary.complexityTrend = 'degrading';
    else if (trend < -1) temporalGraph.temporalMetadata.evolutionSummary.complexityTrend = 'improving';
    else temporalGraph.temporalMetadata.evolutionSummary.complexityTrend = 'stable';
  }
  
  // Pangkas data lama (simpan 100 snapshot terakhir per file agar tidak membengkak)
  for (const node of temporalGraph.nodes) {
    if (node.timeData.length > 100) {
      node.timeData = node.timeData.slice(-100);
    }
  }
  
  await saveTemporalData(projectRoot, temporalGraph);
  return temporalGraph;
}

// ============================================
// FUNGSI BANTUAN (HELPER FUNCTIONS)
// ============================================

function calculateComplexityVelocity(timeData: TimePoint[]): number {
  if (timeData.length < 2) return 0;
  
  const first = timeData[0];
  const last = timeData[timeData.length - 1];
  const timeDiff = (last.timestamp - first.timestamp) / (1000 * 60 * 60 * 24); // selisih dalam hitungan hari
  const complexityDiff = last.complexity - first.complexity;
  
  return timeDiff > 0 ? complexityDiff / timeDiff : 0;
}

function calculateChangeFrequency(timeData: TimePoint[]): number {
  if (timeData.length < 2) return 0;
  
  const totalTime = (timeData[timeData.length - 1].timestamp - timeData[0].timestamp) / (1000 * 60 * 60 * 24 * 7); // selisih dalam hitungan minggu
  return totalTime > 0 ? timeData.length / totalTime : 0;
}

function calculateTechDebtAccumulation(timeData: TimePoint[]): number {
  if (timeData.length < 2) return 0;
  
  // Utang teknis yang disederhanakan = pertumbuhan kompleksitas tanpa peningkatan cakupan pengujian
  let debtAccumulation = 0;
  
  for (let i = 1; i < timeData.length; i++) {
    const prev = timeData[i - 1];
    const curr = timeData[i];
    
    const complexityIncrease = curr.complexity - prev.complexity;
    const testImproved = curr.testCoverage === 'covered' && prev.testCoverage !== 'covered';
    
    if (complexityIncrease > 0 && !testImproved) {
      debtAccumulation += complexityIncrease;
    }
  }
  
  return debtAccumulation;
}

function findLastSignificantChange(timeData: TimePoint[]): number {
  for (let i = timeData.length - 1; i >= 1; i--) {
    const curr = timeData[i];
    const prev = timeData[i - 1];
    
    // Perubahan signifikan: perubahan kompleksitas > 20% ATAU perubahan LOC (Baris Kode) > 50
    if (Math.abs(curr.complexity - prev.complexity) > prev.complexity * 0.2 ||
        Math.abs(curr.linesOfCode - prev.linesOfCode) > 50) {
      return curr.timestamp;
    }
  }
  
  return timeData[0]?.timestamp || 0;
}

function calculateAverageTimeToChange(timeData: TimePoint[]): number {
  if (timeData.length < 2) return 0;
  
  const intervals = [];
  for (let i = 1; i < timeData.length; i++) {
    intervals.push(timeData[i].timestamp - timeData[i - 1].timestamp);
  }
  
  const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  return avgInterval / (1000 * 60 * 60 * 24); // Konversi ke hari
}

// ============================================
// PERHITUNGAN POSISI 4 DIMENSI (4D POSITIONING CALCULATION)
// ============================================

export function calculate4DPositions(temporalGraph: TemporalGraph): TemporalGraph {
  const maxComplexity = Math.max(...temporalGraph.nodes.map(n => n.complexity || 0));
  const currentTime = Date.now();
  
  for (const node of temporalGraph.nodes) {
    // X, Y: Berbasis gaya tarik menarik (force-based) pada dependensi (disederhanakan)
    const x = (node.importsCount - node.importedByCount) * 10;
    const y = Math.sqrt(node.importsCount * node.importedByCount) * 5;
    
    // Z: Ketinggian berdasarkan tingkat kompleksitas
    const z = ((node.complexity || 0) / maxComplexity) * 100;
    
    // T: Waktu saat ini
    const t = currentTime;
    
    // Hitung rekam jejak (trail) dari timeData
    const trail = node.timeData.slice(-20).map((timePoint, index) => ({
      x: x + (Math.random() - 0.5) * 5, // Tambahkan sedikit variasi riwayat (historical variation)
      y: y + (Math.random() - 0.5) * 5,
      z: (timePoint.complexity / maxComplexity) * 100,
      t: timePoint.timestamp
    }));
    
    node.position4D = { x, y, z, t, trail };
  }
  
  return temporalGraph;
}

// ============================================
// FUNGSI PREDIKSI (PREDICTION FUNCTIONS)
// ============================================

export interface PredictionResult {
  filePath: string;
  currentComplexity: number;
  predictedComplexity: number;
  riskScore: number;
  timeToHotspot?: number; // perkiraan hari
  recommendation: string;
}

export function predictFutureHotspots(
  temporalGraph: TemporalGraph,
  daysAhead: number = 30
): PredictionResult[] {
  const predictions: PredictionResult[] = [];
  
  for (const node of temporalGraph.nodes) {
    if (!node.timeData || node.timeData.length < 3) continue;
    
    const currentComplexity = node.complexity || 0;
    const predictedComplexity = predictComplexityGrowth(node.timeData, daysAhead);
    const riskScore = calculateHotspotRisk(node);
    
    // Prediksi kapan file mungkin menjadi hotspot (kompleksitas > 25)
    let timeToHotspot: number | undefined;
    if (predictedComplexity > 25 && currentComplexity <= 25) {
      const velocity = node.evolutionMetrics?.complexityVelocity || 0;
      if (velocity > 0) {
        timeToHotspot = (25 - currentComplexity) / velocity;
      }
    }
    
    let recommendation = 'Pantau';
    if (riskScore > 70) recommendation = 'Dibutuhkan refactoring segera';
    else if (riskScore > 50) recommendation = 'Jadwalkan refactoring';
    else if (riskScore > 30) recommendation = 'Tambahkan lebih banyak pengujian (tests)';
    
    predictions.push({
      filePath: node.id,
      currentComplexity,
      predictedComplexity,
      riskScore,
      timeToHotspot,
      recommendation
    });
  }
  
  return predictions.sort((a, b) => b.riskScore - a.riskScore);
}

export interface EvolutionInsight {
  type: 'complexity_spike' | 'stability_improvement' | 'test_coverage_gap' | 'hotspot_formation' | 'technical_debt';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedFiles: string[];
  timeframe: string;
  description: string;
  recommendation: string;
}

export function analyzeEvolutionPatterns(temporalGraph: TemporalGraph): EvolutionInsight[] {
  const insights: EvolutionInsight[] = [];
  const now = Date.now();
  const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
  
  // Temukan lonjakan kompleksitas dalam seminggu terakhir
  const recentComplexitySpikes = temporalGraph.nodes.filter(node => {
    const recentData = node.timeData.filter(td => td.timestamp > weekAgo);
    return recentData.length >= 2 && 
           recentData[recentData.length - 1].complexity - recentData[0].complexity > 10;
  });
  
  if (recentComplexitySpikes.length > 0) {
    insights.push({
      type: 'complexity_spike',
      severity: recentComplexitySpikes.length > 3 ? 'high' : 'medium',
      affectedFiles: recentComplexitySpikes.map(n => n.id),
      timeframe: '7 hari terakhir',
      description: `${recentComplexitySpikes.length} file mengalami peningkatan kompleksitas yang signifikan`,
      recommendation: 'Tinjau kembali perubahan terbaru dan pertimbangkan untuk melakukan refactoring'
    });
  }
  
  // Temukan file yang berpotensi menjadi hotspot
  const newHotspots = temporalGraph.nodes.filter(node => {
    const riskScore = node.evolutionMetrics?.hotspotRisk || 0;
    return riskScore > 60 && node.importedByCount > 5;
  });
  
  if (newHotspots.length > 0) {
    insights.push({
      type: 'hotspot_formation',
      severity: 'high',
      affectedFiles: newHotspots.map(n => n.id),
      timeframe: 'Tren saat ini',
      description: `${newHotspots.length} file menunjukkan tren berpotensi menjadi hotspot`,
      recommendation: 'Prioritaskan file-file ini untuk refactoring dan pengujian'
    });
  }
  
  return insights;
}