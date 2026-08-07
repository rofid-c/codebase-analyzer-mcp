import { NodeTemporal, TemporalGraph, TimePoint, PredictionResult, EvolutionInsight } from './temporal.js';

// ============================================
// KONSULTASI TEMPORAL LANJUTAN (ADVANCED TEMPORAL QUERIES)
// ============================================

export interface TemporalQuery {
  type: 'trend' | 'volatility' | 'velocity' | 'pattern' | 'anomaly' | 'trajectory';
  timeRange: { start: number; end: number };
  threshold?: number;
  confidence?: number;
}

export interface QueryResult {
  query: TemporalQuery;
  matches: Array<{
    filePath: string;
    score: number;
    confidence: number;
    details: any;
  }>;
  summary: {
    totalMatches: number;
    averageScore: number;
    timeRange: string;
  };
}

export interface ConfidenceMetrics {
  dataPoints: number;
  timePeriodDays: number;
  volatility: number;
  trendStrength: number;
  predictability: number; // 0-100 (tingkat kepastian)
  confidence: number; // 0-100 (tingkat keyakinan secara keseluruhan)
}

// ============================================
// DETEKSI & KLASIFIKASI POLA (PATTERN DETECTION)
// ============================================

export type EvolutionPattern = 
  | 'steady-increase'
  | 'steady-decrease'
  | 'rapid-growth'
  | 'rapid-decline'
  | 'cyclical'
  | 'spike'
  | 'plateau'
  | 'oscillating'
  | 'anomaly';

export interface PatternMatch {
  pattern: EvolutionPattern;
  filePath: string;
  startTime: number;
  endTime: number;
  confidence: number; // 0-100
  affectedMetrics: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface PatternProfile {
  pattern: EvolutionPattern;
  description: string;
  characteristics: {
    avgVelocity: number;
    variance: number;
    duration: number;
  };
  recommendation: string;
}

// ============================================
// IMPLEMENTASI KONSULTASI LANJUTAN (ADVANCED QUERY IMPLEMENTATIONS)
// ============================================

export function queryByTrend(
  temporalGraph: TemporalGraph,
  trendType: 'increasing' | 'decreasing' | 'volatile' | 'stable'
): QueryResult {
  const query: TemporalQuery = {
    type: 'trend',
    timeRange: {
      start: temporalGraph.temporalMetadata.timeRange.start,
      end: temporalGraph.temporalMetadata.timeRange.end
    }
  };

  const matches = temporalGraph.nodes
    .filter(node => node.evolutionMetrics?.complexityTrend === trendType)
    .map(node => ({
      filePath: node.id,
      score: node.evolutionMetrics?.hotspotRisk || 0,
      confidence: calculateConfidenceMetrics(node).confidence,
      details: {
        trend: node.evolutionMetrics?.complexityTrend,
        velocity: node.evolutionMetrics?.complexityVelocity,
        stability: node.evolutionMetrics?.stabilityScore,
        changeFrequency: node.evolutionMetrics?.changeFrequency
      }
    }))
    .sort((a, b) => b.score - a.score);

  return {
    query,
    matches,
    summary: {
      totalMatches: matches.length,
      averageScore: matches.reduce((sum, m) => sum + m.score, 0) / (matches.length || 1),
      timeRange: `${new Date(query.timeRange.start).toLocaleDateString()} - ${new Date(query.timeRange.end).toLocaleDateString()}`
    }
  };
}

export function queryByVolatility(
  temporalGraph: TemporalGraph,
  volatilityThreshold: number = 50
): QueryResult {
  const query: TemporalQuery = {
    type: 'volatility',
    timeRange: {
      start: temporalGraph.temporalMetadata.timeRange.start,
      end: temporalGraph.temporalMetadata.timeRange.end
    },
    threshold: volatilityThreshold
  };

  const matches = temporalGraph.nodes
    .map(node => {
      const volatility = calculateVolatility(node);
      return {
        node,
        volatility,
        confidence: calculateConfidenceMetrics(node).confidence
      };
    })
    .filter(m => m.volatility > volatilityThreshold)
    .map(m => ({
      filePath: m.node.id,
      score: m.volatility,
      confidence: m.confidence,
      details: {
        volatility: m.volatility.toFixed(2),
        stability: m.node.evolutionMetrics?.stabilityScore,
        avgComplexity: m.node.complexity,
        changeCount: m.node.timeData?.length || 0
      }
    }))
    .sort((a, b) => b.score - a.score);

  return {
    query,
    matches,
    summary: {
      totalMatches: matches.length,
      averageScore: matches.reduce((sum, m) => sum + m.score, 0) / (matches.length || 1),
      timeRange: `${new Date(query.timeRange.start).toLocaleDateString()} - ${new Date(query.timeRange.end).toLocaleDateString()}`
    }
  };
}

export function queryByVelocity(
  temporalGraph: TemporalGraph,
  minVelocity: number = 0,
  maxVelocity: number = 100
): QueryResult {
  const query: TemporalQuery = {
    type: 'velocity',
    timeRange: {
      start: temporalGraph.temporalMetadata.timeRange.start,
      end: temporalGraph.temporalMetadata.timeRange.end
    }
  };

  const matches = temporalGraph.nodes
    .map(node => ({
      filePath: node.id,
      velocity: node.evolutionMetrics?.complexityVelocity || 0,
      confidence: calculateConfidenceMetrics(node).confidence,
      node
    }))
    .filter(m => m.velocity >= minVelocity && m.velocity <= maxVelocity)
    .map(m => ({
      filePath: m.filePath,
      score: Math.abs(m.velocity),
      confidence: m.confidence,
      details: {
        velocity: m.velocity.toFixed(2),
        direction: m.velocity > 0 ? 'increasing' : 'decreasing',
        changeFrequency: m.node.evolutionMetrics?.changeFrequency,
        riskScore: m.node.evolutionMetrics?.hotspotRisk
      }
    }))
    .sort((a, b) => b.score - a.score);

  return {
    query,
    matches,
    summary: {
      totalMatches: matches.length,
      averageScore: matches.reduce((sum, m) => sum + m.score, 0) / (matches.length || 1),
      timeRange: `${new Date(query.timeRange.start).toLocaleDateString()} - ${new Date(query.timeRange.end).toLocaleDateString()}`
    }
  };
}

// ============================================
// DETEKSI POLA (PATTERN DETECTION)
// ============================================

export function detectPatterns(
  temporalGraph: TemporalGraph,
  minConfidence: number = 70
): PatternMatch[] {
  const patterns: PatternMatch[] = [];

  for (const node of temporalGraph.nodes) {
    if (!node.timeData || node.timeData.length < 3) continue;

    const pattern = classifyPattern(node.timeData);
    const confidence = calculatePatternConfidence(node.timeData, pattern);

    if (confidence >= minConfidence) {
      const severity = calculatePatternSeverity(pattern, node);
      
      patterns.push({
        pattern,
        filePath: node.id,
        startTime: node.timeData[0].timestamp,
        endTime: node.timeData[node.timeData.length - 1].timestamp,
        confidence,
        affectedMetrics: ['complexity', 'LOC', 'dependencies'],
        severity
      });
    }
  }

  return patterns.sort((a, b) => b.confidence - a.confidence);
}

function classifyPattern(timeData: TimePoint[]): EvolutionPattern {
  if (timeData.length < 3) return 'plateau';

  const complexities = timeData.map(t => t.complexity);
  const changes = [];
  
  for (let i = 1; i < complexities.length; i++) {
    changes.push(complexities[i] - complexities[i - 1]);
  }

  const avgChange = changes.reduce((sum, c) => sum + c, 0) / changes.length;
  const variance = changes.reduce((sum, c) => sum + Math.pow(c - avgChange, 2), 0) / changes.length;
  const volatility = Math.sqrt(variance);

  // Deteksi lonjakan drastis (spike)
  const maxChange = Math.max(...changes.map(Math.abs));
  if (maxChange > 5 && volatility < 2) return 'spike';

  // Deteksi pertumbuhan/penurunan cepat
  if (avgChange > 2) return 'rapid-growth';
  if (avgChange < -2) return 'rapid-decline';

  // Deteksi tren stabil
  if (avgChange > 0.5 && volatility < 1) return 'steady-increase';
  if (avgChange < -0.5 && volatility < 1) return 'steady-decrease';

  // Deteksi pola siklus
  if (volatility > 3 && Math.abs(avgChange) < 0.5) return 'cyclical';

  // Deteksi osilasi (naik turun)
  if (volatility > 2) return 'oscillating';

  // Deteksi kondisi stagnan (plateau)
  if (Math.abs(avgChange) < 0.3) return 'plateau';

  return 'anomaly';
}

function calculatePatternConfidence(timeData: TimePoint[], pattern: EvolutionPattern): number {
  if (timeData.length < 3) return 0;

  const complexities = timeData.map(t => t.complexity);
  const changes = [];
  
  for (let i = 1; i < complexities.length; i++) {
    changes.push(complexities[i] - complexities[i - 1]);
  }

  const avgChange = changes.reduce((sum, c) => sum + c, 0) / changes.length;
  const variance = changes.reduce((sum, c) => sum + Math.pow(c - avgChange, 2), 0) / changes.length;
  const volatility = Math.sqrt(variance);

  let confidence = 50 + (timeData.length * 5); // Lebih banyak data = lebih yakin
  confidence += (100 - volatility * 10); // Volatilitas lebih kecil = lebih yakin

  return Math.min(100, Math.max(0, confidence));
}

function calculatePatternSeverity(pattern: EvolutionPattern, node: NodeTemporal): 'low' | 'medium' | 'high' | 'critical' {
  const risk = node.evolutionMetrics?.hotspotRisk || 0;

  switch (pattern) {
    case 'rapid-growth':
    case 'spike':
      return risk > 70 ? 'critical' : risk > 50 ? 'high' : 'medium';
    
    case 'steady-increase':
      return risk > 60 ? 'high' : 'medium';
    
    case 'cyclical':
    case 'oscillating':
      return risk > 50 ? 'high' : 'medium';
    
    case 'anomaly':
      return 'high';
    
    default:
      return 'low';
  }
}

// ============================================
// PENILAIAN TINGKAT KEYAKINAN (CONFIDENCE SCORING)
// ============================================

export function calculateConfidenceMetrics(node: NodeTemporal): ConfidenceMetrics {
  if (!node.timeData || node.timeData.length < 2) {
    return {
      dataPoints: 0,
      timePeriodDays: 0,
      volatility: 0,
      trendStrength: 0,
      predictability: 0,
      confidence: 0
    };
  }

  const timeData = node.timeData;
  const complexities = timeData.map(t => t.complexity);
  
  // Hitung metrik (Calculate metrics)
  const dataPoints = timeData.length;
  const timePeriodDays = (timeData[timeData.length - 1].timestamp - timeData[0].timestamp) / (1000 * 60 * 60 * 24);
  
  // Volatilitas
  const avgComplexity = complexities.reduce((sum, c) => sum + c, 0) / complexities.length;
  const variance = complexities.reduce((sum, c) => sum + Math.pow(c - avgComplexity, 2), 0) / complexities.length;
  const volatility = Math.sqrt(variance);

  // Kekuatan tren (seberapa konsisten arahnya)
  const changes = [];
  for (let i = 1; i < complexities.length; i++) {
    changes.push(complexities[i] - complexities[i - 1]);
  }
  
  const positiveChanges = changes.filter(c => c > 0).length;
  const trendStrength = (Math.max(positiveChanges, changes.length - positiveChanges) / changes.length) * 100;

  // Tingkat kepastian (predictability) berdasarkan konsistensi
  const predictability = 100 - (volatility * 10); // Volatilitas lebih rendah = kepastian lebih tinggi

  // Keyakinan secara keseluruhan
  let confidence = 50;
  confidence += Math.min(dataPoints * 5, 20); // Lebih banyak titik data = tambah hingga 20
  confidence += Math.min(trendStrength / 5, 20); // Tren yang lebih kuat = tambah hingga 20
  confidence += (100 - volatility * 5); // Volatilitas lebih rendah = keyakinan lebih baik

  return {
    dataPoints,
    timePeriodDays: Math.round(timePeriodDays),
    volatility: volatility.toFixed(2) as any,
    trendStrength: Math.round(trendStrength),
    predictability: Math.round(Math.max(0, Math.min(100, predictability))),
    confidence: Math.round(Math.max(0, Math.min(100, confidence)))
  };
}

function calculateVolatility(node: NodeTemporal): number {
  if (!node.timeData || node.timeData.length < 2) return 0;

  const complexities = node.timeData.map(t => t.complexity);
  const avgComplexity = complexities.reduce((sum, c) => sum + c, 0) / complexities.length;
  const variance = complexities.reduce((sum, c) => sum + Math.pow(c - avgComplexity, 2), 0) / complexities.length;
  
  return Math.sqrt(variance);
}

// ============================================
// ANALITIK EVOLUSI (EVOLUTION ANALYTICS)
// ============================================

export interface EvolutionAnalytics {
  period: {
    start: number;
    end: number;
    daysSpanned: number;
  };
  complexityAnalysis: {
    minComplexity: number;
    maxComplexity: number;
    avgComplexity: number;
    trend: 'improving' | 'degrading' | 'stable';
    totalChange: number;
    changeRate: number; // per hari
  };
  stabilityAnalysis: {
    avgStability: number;
    stableFiles: number;
    volatileFiles: number;
    mostStable: { filePath: string; score: number }[];
    mostVolatile: { filePath: string; score: number }[];
  };
  hotspotAnalysis: {
    hotspotCount: number;
    highRiskCount: number;
    emergingHotspots: string[];
    resolvedHotspots: string[];
  };
  patterns: {
    detectedPatterns: EvolutionPattern[];
    anomalies: string[];
    recommendations: string[];
  };
}

export function analyzeEvolutionOverPeriod(
  temporalGraph: TemporalGraph,
  startDate?: Date,
  endDate?: Date
): EvolutionAnalytics {
  const start = startDate?.getTime() || temporalGraph.temporalMetadata.timeRange.start;
  const end = endDate?.getTime() || temporalGraph.temporalMetadata.timeRange.end;
  const daysSpanned = Math.round((end - start) / (1000 * 60 * 60 * 24));

  // Analisis kompleksitas
  const allComplexities = temporalGraph.nodes.map(n => n.complexity || 0);
  const minComplexity = Math.min(...allComplexities);
  const maxComplexity = Math.max(...allComplexities);
  const avgComplexity = allComplexities.reduce((sum, c) => sum + c, 0) / allComplexities.length;

  const trend = temporalGraph.temporalMetadata.evolutionSummary.complexityTrend;
  const totalChange = maxComplexity - minComplexity;
  const changeRate = daysSpanned > 0 ? totalChange / daysSpanned : 0;

  // Analisis stabilitas
  const stabilityScores = temporalGraph.nodes
    .map(n => n.evolutionMetrics?.stabilityScore || 0)
    .filter(s => s > 0);
  
  const avgStability = stabilityScores.reduce((sum, s) => sum + s, 0) / (stabilityScores.length || 1);
  const stableFiles = temporalGraph.nodes.filter(n => (n.evolutionMetrics?.stabilityScore || 0) > 70).length;
  const volatileFiles = temporalGraph.nodes.filter(n => (n.evolutionMetrics?.stabilityScore || 0) < 30).length;

  const sorted = [...temporalGraph.nodes]
    .filter(n => n.evolutionMetrics?.stabilityScore)
    .sort((a, b) => (b.evolutionMetrics?.stabilityScore || 0) - (a.evolutionMetrics?.stabilityScore || 0));

  const mostStable = sorted.slice(0, 3).map(n => ({
    filePath: n.id,
    score: n.evolutionMetrics?.stabilityScore || 0
  }));

  const mostVolatile = sorted.slice(-3).map(n => ({
    filePath: n.id,
    score: n.evolutionMetrics?.stabilityScore || 0
  }));

  // Analisis hotspot
  const hotspotCount = temporalGraph.nodes.filter(n => n.isHotspot).length;
  const highRiskCount = temporalGraph.nodes.filter(n => (n.evolutionMetrics?.hotspotRisk || 0) > 70).length;

  // Deteksi pola
  const patterns = detectPatterns(temporalGraph, 60);
  const detectedPatterns = [...new Set(patterns.map(p => p.pattern))];
  const anomalies = patterns
    .filter(p => p.pattern === 'anomaly')
    .map(p => p.filePath);

  // Buat rekomendasi
  const recommendations: string[] = [];
  if (highRiskCount > 5) recommendations.push('Beberapa file berisiko tinggi terdeteksi - prioritaskan refactoring');
  if (volatileFiles > stableFiles) recommendations.push('Basis kode tidak stabil - fokus pada stabilisasi');
  if (changeRate > 0.5) recommendations.push('Kompleksitas meningkat dengan cepat - terapkan kontrol yang lebih ketat');
  if (anomalies.length > 0) recommendations.push(`Anomali terdeteksi pada ${anomalies.length} file`);

  return {
    period: { start, end, daysSpanned },
    complexityAnalysis: {
      minComplexity,
      maxComplexity,
      avgComplexity,
      trend: trend as any,
      totalChange,
      changeRate
    },
    stabilityAnalysis: {
      avgStability,
      stableFiles,
      volatileFiles,
      mostStable,
      mostVolatile
    },
    hotspotAnalysis: {
      hotspotCount,
      highRiskCount,
      emergingHotspots: patterns.filter(p => p.severity === 'high' || p.severity === 'critical').map(p => p.filePath),
      resolvedHotspots: [] // Membutuhkan data historis untuk menentukannya
    },
    patterns: {
      detectedPatterns,
      anomalies,
      recommendations
    }
  };
}
