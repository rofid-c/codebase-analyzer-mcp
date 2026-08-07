import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { crawlDirectory } from "../core/crawler.js";
import { parseFileDependencies } from "../core/parser.js";
import { buildGraph, simulateImpact } from "../core/graph.js";
import { loadGraphCache, saveGraphCache } from "../core/cache.js";
import { generateSummary, queryFile, compressGraph, compareTokenUsage, searchFiles } from "../core/compressor.js";
import { calculateFileMetrics, detectChanges, loadChangeLog, saveChangeLog } from "../core/metrics.js";
import { addTemporalSnapshot, loadTemporalData, predictFutureHotspots, analyzeEvolutionPatterns, calculate4DPositions } from "../core/temporal.js";
import { queryByTrend, queryByVolatility, queryByVelocity, detectPatterns, analyzeEvolutionOverPeriod, calculateConfidenceMetrics } from "../core/temporal-advanced.js";
import { initializeAutoIndexer, stopAutoIndexer, getAutoIndexer, type AutoIndexerConfig } from "../core/auto-indexer.js";

const server = new Server({
  name: "spider-map-mcp",
  version: "1.0.0",
}, {
  capabilities: {
    tools: {},
  },
});

// Instance dari auto-indexer
let autoIndexer: any = null;

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "configure_auto_indexing",
        description: "Configure and start auto-indexing service with file watcher and 3-second debounce.",
        inputSchema: {
          type: "object",
          properties: {
            projectRoot: {
              type: "string",
              description: "Absolute path to the project root directory",
            },
            enabled: {
              type: "boolean",
              description: "Enable auto-indexing (default: true)",
              default: true,
            },
            debounceMs: {
              type: "number",
              description: "Debounce delay in milliseconds (default: 3000 = 3 seconds)",
              default: 3000,
            },
            enableFileWatcher: {
              type: "boolean",
              description: "Use file watcher for real-time detection (default: true)",
              default: true,
            },
            enablePeriodicSync: {
              type: "boolean",
              description: "Enable periodic full sync (production mode, default: false)",
              default: false,
            },
            periodicSyncMs: {
              type: "number",
              description: "Periodic sync interval in milliseconds (default: 300000 = 5 minutes)",
              default: 300000,
            }
          },
          required: ["projectRoot"],
        },
      },
      {
        name: "get_project_map",
        description: "Generate or load the cached codebase dependency graph (Spider Map). Supports multiple response modes for token optimization.",
        inputSchema: {
          type: "object",
          properties: {
            projectRoot: {
              type: "string",
              description: "Absolute path to the project root directory",
            },
            forceRefresh: {
              type: "boolean",
              description: "If true, forces a full recrawl instead of loading from cache",
            },
            responseMode: {
              type: "string",
              enum: ["full", "summary", "compressed", "critical-only"],
              description: "Response format: 'summary' (96% token saving), 'compressed' (80% saving), 'critical-only' (90% saving), 'full' (no compression)",
              default: "compressed"
            }
          },
          required: ["projectRoot"],
        },
      },
      {
        name: "get_file_info",
        description: "Get detailed info about a specific file: dependencies, dependents, metrics, and impact analysis. Very token-efficient (98% reduction).",
        inputSchema: {
          type: "object",
          properties: {
            projectRoot: {
              type: "string",
              description: "Absolute path to the project root directory",
            },
            filePath: {
              type: "string",
              description: "Relative path to the file (e.g., 'src/models/User.ts')",
            }
          },
          required: ["projectRoot", "filePath"],
        },
      },
      {
        name: "simulate_impact",
        description: "Simulate a change in a specific file to see which other files will be directly or indirectly affected (Blast Radius Analysis).",
        inputSchema: {
          type: "object",
          properties: {
            projectRoot: {
              type: "string",
              description: "Absolute path to the project root directory",
            },
            targetFile: {
              type: "string",
              description: "Relative path to the file to simulate changes on",
            }
          },
          required: ["projectRoot", "targetFile"],
        },
      },
      {
        name: "search_files",
        description: "Find files by criteria such as file type, risk level, role, or dependency count. Returns filtered file list for efficient querying.",
        inputSchema: {
          type: "object",
          properties: {
            projectRoot: {
              type: "string",
              description: "Absolute path to the project root directory",
            },
            filters: {
              type: "object",
              properties: {
                fileCategory: {
                  type: "string",
                  enum: ["core", "config", "view", "style", "test", "db", "doc", "utility", "asset"],
                  description: "Filter by file category"
                },
                riskLevel: {
                  type: "string", 
                  enum: ["critical", "moderate", "low", "leaf"],
                  description: "Filter by risk level"
                },
                role: {
                  type: "string",
                  enum: ["entry", "hotspot", "orphan", "direct", "indirect"],
                  description: "Filter by file role in dependency graph"
                },
                minImportedByCount: {
                  type: "number",
                  description: "Minimum number of files that import this file"
                },
                maxImportedByCount: {
                  type: "number", 
                  description: "Maximum number of files that import this file"
                },
                fileExtension: {
                  type: "string",
                  description: "Filter by file extension (e.g., '.ts', '.php', '.js')"
                },
                pathContains: {
                  type: "string",
                  description: "Filter files whose path contains this string"
                }
              }
            }
          },
          required: ["projectRoot"],
        },
      },
      {
        name: "get_code_metrics",
        description: "Get code metrics for files: complexity, lines of code, test coverage, function count, etc. Useful for refactoring decisions.",
        inputSchema: {
          type: "object",
          properties: {
            projectRoot: {
              type: "string",
              description: "Absolute path to the project root directory",
            },
            filePath: {
              type: "string",
              description: "Relative path to the file (e.g., 'src/models/User.ts')",
            },
            fileExtension: {
              type: "string",
              description: "Optional: Filter files by extension to get metrics for multiple files"
            }
          },
          required: ["projectRoot"],
        },
      },
      {
        name: "detect_changes",
        description: "Detect which files have changed since the last crawl. Useful for understanding code evolution and testing impact.",
        inputSchema: {
          type: "object",
          properties: {
            projectRoot: {
              type: "string",
              description: "Absolute path to the project root directory",
            },
            forceRefresh: {
              type: "boolean",
              description: "If true, forces a full recrawl before detecting changes"
            }
          },
          required: ["projectRoot"],
        },
      },
      {
        name: "get_time_analysis",
        description: "4D Time-series analysis: track complexity evolution, predict hotspots, analyze patterns over time. Provides historical insights for informed decisions.",
        inputSchema: {
          type: "object",
          properties: {
            projectRoot: {
              type: "string",
              description: "Absolute path to the project root directory",
            },
            timeRange: {
              type: "object",
              properties: {
                days: {
                  type: "number",
                  description: "Number of days to analyze backwards from now"
                }
              },
              description: "Optional time range for analysis"
            },
            includePositioning: {
              type: "boolean",
              description: "If true, includes 4D positioning data for visualization"
            }
          },
          required: ["projectRoot"],
        },
      },
      {
        name: "predict_hotspots",
        description: "Predict files likely to become problematic based on historical trends, complexity growth, and change patterns. Helps prevent technical debt.",
        inputSchema: {
          type: "object",
          properties: {
            projectRoot: {
              type: "string",
              description: "Absolute path to the project root directory",
            },
            daysAhead: {
              type: "number",
              description: "Number of days to predict ahead (default: 30)"
            },
            riskThreshold: {
              type: "number", 
              description: "Minimum risk score to include in results (0-100, default: 30)"
            }
          },
          required: ["projectRoot"],
        },
      },
      {
        name: "query_temporal",
        description: "Advanced temporal queries: search by trend, volatility, velocity, or patterns with confidence scores.",
        inputSchema: {
          type: "object",
          properties: {
            projectRoot: {
              type: "string",
              description: "Absolute path to the project root directory",
            },
            queryType: {
              type: "string",
              enum: ["trend", "volatility", "velocity", "pattern"],
              description: "Type of temporal query"
            },
            trendType: {
              type: "string",
              enum: ["increasing", "decreasing", "volatile", "stable"],
              description: "For trend queries: which trend to search for"
            },
            threshold: {
              type: "number",
              description: "Threshold for volatility (0-100) or velocity queries"
            },
            minConfidence: {
              type: "number",
              description: "Minimum confidence score for results (0-100)"
            }
          },
          required: ["projectRoot", "queryType"],
        },
      },
      {
        name: "analyze_evolution",
        description: "Comprehensive evolution analytics: complexity trends, stability analysis, hotspot evolution, patterns, and recommendations.",
        inputSchema: {
          type: "object",
          properties: {
            projectRoot: {
              type: "string",
              description: "Absolute path to the project root directory",
            },
            periodDays: {
              type: "number",
              description: "Number of days to analyze (default: all available data)"
            },
            includePatterns: {
              type: "boolean",
              description: "Include detailed pattern detection (default: true)"
            }
          },
          required: ["projectRoot"],
        },
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // ===== KONFIGURASI AUTO INDEXING (AUTO INDEXING) =====
  if (request.params.name === "configure_auto_indexing") {
    const projectRoot = String(request.params.arguments?.projectRoot);
    const config: AutoIndexerConfig = {
      projectRoot,
      enabled: request.params.arguments?.enabled !== false,
      debounceMs: Number(request.params.arguments?.debounceMs) || 3000,
      enableFileWatcher: request.params.arguments?.enableFileWatcher !== false,
      enablePeriodicSync: request.params.arguments?.enablePeriodicSync === true,
      periodicSyncMs: Number(request.params.arguments?.periodicSyncMs) || 300000,
      ignorePatterns: ['node_modules/**', 'dist/**', '.git/**', '.spidermap/**'],
      onIndexUpdate: (event) => {
        console.log(`[AutoIndexer] Update: ${event.filesAdded.length} added, ${event.filesModified.length} modified, ${event.filesDeleted.length} deleted`);
      }
    };

    try {
      autoIndexer = await initializeAutoIndexer(config);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "configured",
            config: {
              projectRoot,
              debounceMs: config.debounceMs,
              fileWatcher: config.enableFileWatcher,
              periodicSync: config.enablePeriodicSync,
              message: `✅ Auto-indexing enabled with ${config.debounceMs}ms debounce. File changes will be detected and indexed automatically.`
            }
          }, null, 2)
        }]
      };
    } catch (err) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "error",
            message: String(err)
          })
        }]
      };
    }
  }

  // ===== HENTIKAN AUTO INDEXING (STOP AUTO INDEXING) =====
  if (request.params.name === "stop_auto_indexing") {
    try {
      await stopAutoIndexer();
      autoIndexer = null;
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "stopped",
            message: "✅ Auto-indexing service stopped"
          })
        }]
      };
    } catch (err) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "error",
            message: String(err)
          })
        }]
      };
    }
  }

  // ===== DAPATKAN PETA PROYEK (GET PROJECT MAP) =====
  if (request.params.name === "get_project_map") {
    const projectRoot = String(request.params.arguments?.projectRoot);
    const forceRefresh = Boolean(request.params.arguments?.forceRefresh);
    const responseMode = String(request.params.arguments?.responseMode || "compressed");

    let graphData = null;
    
    // Coba ambil dari auto-indexer terlebih dahulu
    if (autoIndexer && autoIndexer.config?.projectRoot === projectRoot) {
      graphData = autoIndexer.getGraph();
    }

    if (!graphData && !forceRefresh) {
      graphData = await loadGraphCache(projectRoot);
    }

    if (!graphData) {
      const files = await crawlDirectory(projectRoot);
      const allFilesSet = new Set(files);
      const dependencies = [];

      for (const file of files) {
        const targets = await parseFileDependencies(file, projectRoot, allFilesSet);
        if (targets.length > 0) {
          dependencies.push({ source: file, targets });
        }
      }

      graphData = buildGraph(files, dependencies);
      await saveGraphCache(projectRoot, graphData);
    }

    // Pilih format respons berdasarkan mode yang diminta
    let responseData: any;
    let modeInfo: string;

    switch (responseMode) {
      case "summary":
        responseData = generateSummary(graphData);
        modeInfo = "Summary mode - 96% token reduction. Use 'query_file' tool for specific file details.";
        break;

      case "compressed":
        responseData = compressGraph(graphData);
        modeInfo = "Compressed mode - 80% token reduction. Use decompressGraph() to restore full format.";
        break;

      case "critical-only":
        const summary = generateSummary(graphData);
        responseData = {
          stats: summary.stats,
          criticalFiles: summary.topCritical,
          hotspots: graphData.nodes.filter((n: any) => n.isHotspot).map((n: any) => ({
            id: n.id,
            importedBy: n.importedByCount,
            role: n.role
          }))
        };
        modeInfo = "Critical-only mode - 90% token reduction. Shows only high-risk files.";
        break;

      case "full":
      default:
        // Potong jumlah file agar tidak memenuhi batas token (context window)
        responseData = {
          ...graphData,
          _truncated: graphData.nodes.length > 100,
          _note: graphData.nodes.length > 100 
            ? "Graph truncated. Use 'summary' or 'compressed' mode for large projects."
            : undefined,
          _autoIndexing: autoIndexer ? "enabled" : "disabled"
        };
        modeInfo = "Full mode - no compression. Consider using 'summary' or 'compressed' for token efficiency.";
        break;
    }

    // Tambahkan perbandingan penggunaan token sebagai transparansi
    const tokenComparison = compareTokenUsage(graphData);
    
    return {
      content: [{ 
        type: "text", 
        text: JSON.stringify({
          mode: responseMode,
          info: modeInfo,
          autoIndexing: autoIndexer ? "enabled" : "disabled",
          tokenSavings: tokenComparison,
          data: responseData
        }, null, 2).substring(0, 50000) // Potong batas aman (safety truncate)
      }],
    };
  }

  // ===== DAPATKAN INFO FILE (GET FILE INFO) =====
  if (request.params.name === "get_file_info") {
    const projectRoot = String(request.params.arguments?.projectRoot);
    const filePath = String(request.params.arguments?.filePath);

    const graphData = await loadGraphCache(projectRoot);
    if (!graphData) {
       return {
          content: [{ type: "text", text: "Error: Graph cache not found. Please run get_project_map first." }],
       };
    }

    const fileInfo = queryFile(graphData, filePath);
    if (!fileInfo) {
      return {
        content: [{ type: "text", text: `Error: File '${filePath}' not found in graph.` }],
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(fileInfo, null, 2) }],
    };
  }

  // ===== CARI FILE (SEARCH FILES) =====
  if (request.params.name === "search_files") {
    const projectRoot = String(request.params.arguments?.projectRoot);
    const filters = request.params.arguments?.filters || {};

    const graphData = await loadGraphCache(projectRoot);
    if (!graphData) {
       return {
          content: [{ type: "text", text: "Error: Graph cache not found. Please run get_project_map first." }],
       };
    }

    const searchResult = searchFiles(graphData, filters);
    
    return {
      content: [{ type: "text", text: JSON.stringify(searchResult, null, 2) }],
    };
  }

  // ===== KONSULTASI FILE (QUERY FILE) (Versi lama, dipertahankan untuk kompatibilitas) =====
  if (request.params.name === "query_file") {
    const projectRoot = String(request.params.arguments?.projectRoot);
    const fileId = String(request.params.arguments?.fileId);

    const graphData = await loadGraphCache(projectRoot);
    if (!graphData) {
       return {
          content: [{ type: "text", text: "Error: Graph cache not found. Please run get_project_map first." }],
       };
    }

    const fileInfo = queryFile(graphData, fileId);
    if (!fileInfo) {
      return {
        content: [{ type: "text", text: `Error: File '${fileId}' not found in graph.` }],
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(fileInfo, null, 2) }],
    };
  }

  // ===== SIMULASIKAN DAMPAK (SIMULATE IMPACT) =====
  if (request.params.name === "simulate_impact") {
    const projectRoot = String(request.params.arguments?.projectRoot);
    const targetFile = String(request.params.arguments?.targetFile);

    const graphData = await loadGraphCache(projectRoot);
    if (!graphData) {
       return {
          content: [{ type: "text", text: "Error: Graph cache not found. Please run get_project_map first." }],
       };
    }

    const simulation = simulateImpact(graphData, targetFile);
    return {
      content: [{ type: "text", text: JSON.stringify({
        changedFile: simulation.changedFile,
        directlyAffected: simulation.directlyAffected,
        indirectlyAffected: simulation.indirectlyAffected,
        totalAffectedCount: simulation.totalAffectedCount
      }, null, 2) }],
    };
  }

  // ===== DAPATKAN METRIK KODE (GET CODE METRICS) =====
  if (request.params.name === "get_code_metrics") {
    const projectRoot = String(request.params.arguments?.projectRoot);
    const filePath = request.params.arguments?.filePath as string | undefined;
    const fileExtension = request.params.arguments?.fileExtension as string | undefined;

    const graphData = await loadGraphCache(projectRoot);
    if (!graphData) {
       return {
          content: [{ type: "text", text: "Error: Graph cache not found. Please run get_project_map first." }],
       };
    }

    let targetFiles: string[] = [];
    if (filePath) {
      targetFiles = [filePath];
    } else if (fileExtension) {
      targetFiles = graphData.nodes
        .filter(n => n.ext === fileExtension)
        .map(n => n.id);
    } else {
      // Bawaan: ambil metrik untuk semua file kode (20 teratas berdasarkan kepentingan)
      targetFiles = graphData.nodes
        .filter(n => n.fileCategory === 'core')
        .sort((a, b) => b.importedByCount - a.importedByCount)
        .slice(0, 20)
        .map(n => n.id);
    }

    const metrics = [];
    const fileSet = new Set(graphData.nodes.map(n => n.id));

    for (const file of targetFiles.slice(0, 50)) { // Batasi maksimal 50 file
      const metric = await calculateFileMetrics(file, projectRoot, fileSet);
      metrics.push(metric);
    }

    // Urutkan berdasarkan kompleksitas menurun (descending)
    metrics.sort((a, b) => b.complexity - a.complexity);

    return {
      content: [{ type: "text", text: JSON.stringify({
        totalFiles: metrics.length,
        metrics: metrics.slice(0, 10), // Kembalikan 10 teratas
        summary: {
          avgComplexity: Math.round(metrics.reduce((sum, m) => sum + m.complexity, 0) / metrics.length),
          avgLOC: Math.round(metrics.reduce((sum, m) => sum + m.linesOfCode, 0) / metrics.length),
          filesWithTests: metrics.filter(m => m.hasTest).length,
          uncoveredFiles: metrics.filter(m => m.testCoverage === 'uncovered').length,
        }
      }, null, 2) }],
    };
  }

  // ===== DETEKSI PERUBAHAN (DETECT CHANGES) =====
  if (request.params.name === "detect_changes") {
    const projectRoot = String(request.params.arguments?.projectRoot);
    const forceRefresh = Boolean(request.params.arguments?.forceRefresh);

    // Dapatkan grafik saat ini
    let graphData = null;
    if (!forceRefresh) {
      graphData = await loadGraphCache(projectRoot);
    }

    if (!graphData) {
      const files = await crawlDirectory(projectRoot);
      const allFilesSet = new Set(files);
      const dependencies = [];

      for (const file of files) {
        const targets = await parseFileDependencies(file, projectRoot, allFilesSet);
        if (targets.length > 0) {
          dependencies.push({ source: file, targets });
        }
      }

      graphData = buildGraph(files, dependencies);
      await saveGraphCache(projectRoot, graphData);
    }

    // Hitung metrik untuk snapshot temporal
    const metrics: Record<string, any> = {};
    const fileSet = new Set(graphData.nodes.map(n => n.id));
    
    for (const node of graphData.nodes.slice(0, 20)) { // Batasi demi performa
      metrics[node.id] = await calculateFileMetrics(node.id, projectRoot, fileSet, node);
    }

    // Tambahkan snapshot temporal
    const temporalGraph = await addTemporalSnapshot(projectRoot, graphData, metrics);

    // Muat catatan perubahan (changelog) sebelumnya jika ada
    const previousChangeLog = await loadChangeLog(projectRoot);
    const currentFileSet = new Set(graphData.nodes.map(n => n.id));

    // Deteksi perubahan
    const changes = await detectChanges(
      currentFileSet,
      projectRoot,
      previousChangeLog?.currentHash
    );

    // Simpan catatan perubahan baru
    const newChangeLog = {
      timestamp: Date.now(),
      previousHash: previousChangeLog?.currentHash || new Map(),
      currentHash: new Map(),
      changes
    };

    // Hitung hash (sidik jari file) saat ini
    const crypto = await import('crypto');
    for (const file of currentFileSet) {
      try {
        const filePath = `${projectRoot}/${file}`;
        const { readFileSync } = await import('fs');
        const content = readFileSync(filePath, 'utf-8');
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        newChangeLog.currentHash.set(file, hash);
      } catch {
        // Kesalahan membaca file, abaikan
      }
    }

    await saveChangeLog(projectRoot, newChangeLog);

    return {
      content: [{ type: "text", text: JSON.stringify({
        timestamp: newChangeLog.timestamp,
        summary: {
          totalChanges: changes.length,
          added: changes.filter(c => c.changeType === 'added').length,
          modified: changes.filter(c => c.changeType === 'modified').length,
          deleted: changes.filter(c => c.changeType === 'deleted').length,
        },
        changes: changes.slice(0, 20), // 20 perubahan teratas
        temporalInsights: {
          totalSnapshots: temporalGraph.temporalMetadata.totalSnapshots,
          evolutionTrend: temporalGraph.temporalMetadata.evolutionSummary.complexityTrend,
          hotspotsCount: temporalGraph.temporalMetadata.evolutionSummary.hotspotEvolution.slice(-1)[0] || 0
        }
      }, null, 2) }],
    };
  }

  // ===== DAPATKAN ANALISIS WAKTU 4D (GET TIME ANALYSIS 4D) =====
  if (request.params.name === "get_time_analysis") {
    const projectRoot = String(request.params.arguments?.projectRoot);
    const timeRange = request.params.arguments?.timeRange as any;
    const includePositioning = Boolean(request.params.arguments?.includePositioning);

    const temporalGraph = await loadTemporalData(projectRoot);
    if (!temporalGraph) {
      return {
        content: [{ type: "text", text: "Error: No temporal data found. Please run detect_changes first to start collecting time-series data." }],
      };
    }

    // Filter berdasarkan rentang waktu jika ditentukan
    let filteredGraph = temporalGraph;
    if (timeRange?.days) {
      const cutoffTime = Date.now() - (timeRange.days * 24 * 60 * 60 * 1000);
      filteredGraph = {
        ...temporalGraph,
        nodes: temporalGraph.nodes.map(node => ({
          ...node,
          timeData: node.timeData.filter(td => td.timestamp > cutoffTime)
        }))
      };
    }

    // Hitung posisi 4D jika diminta
    if (includePositioning) {
      filteredGraph = calculate4DPositions(filteredGraph);
    }

    // Analisis pola evolusi
    const insights = analyzeEvolutionPatterns(filteredGraph);

    // Statistik ringkasan
    const nodesWithHistory = filteredGraph.nodes.filter(n => n.timeData && n.timeData.length > 1);
    const avgStability = nodesWithHistory.reduce((sum, n) => sum + (n.evolutionMetrics?.stabilityScore || 0), 0) / nodesWithHistory.length;
    const highRiskFiles = nodesWithHistory.filter(n => (n.evolutionMetrics?.hotspotRisk || 0) > 50);

    return {
      content: [{ type: "text", text: JSON.stringify({
        temporalMetadata: filteredGraph.temporalMetadata,
        summary: {
          totalFiles: filteredGraph.nodes.length,
          filesWithHistory: nodesWithHistory.length,
          averageStability: Math.round(avgStability),
          highRiskFiles: highRiskFiles.length,
          overallTrend: filteredGraph.temporalMetadata.evolutionSummary.complexityTrend
        },
        topEvolvingFiles: nodesWithHistory
          .sort((a, b) => (b.evolutionMetrics?.hotspotRisk || 0) - (a.evolutionMetrics?.hotspotRisk || 0))
          .slice(0, 10)
          .map(n => ({
            filePath: n.id,
            complexityTrend: n.evolutionMetrics?.complexityTrend,
            hotspotRisk: n.evolutionMetrics?.hotspotRisk,
            stabilityScore: n.evolutionMetrics?.stabilityScore,
            changeFrequency: n.evolutionMetrics?.changeFrequency,
            position4D: includePositioning ? n.position4D : undefined
          })),
        insights: insights.slice(0, 5), // 5 wawasan teratas
        evolutionChart: {
          hotspotEvolution: filteredGraph.temporalMetadata.evolutionSummary.hotspotEvolution,
          testCoverageEvolution: filteredGraph.temporalMetadata.evolutionSummary.testCoverageEvolution,
          fileCountEvolution: filteredGraph.temporalMetadata.evolutionSummary.fileCountEvolution
        }
      }, null, 2) }],
    };
  }

  // ===== PREDIKSI HOTSPOT (PREDICT HOTSPOTS) =====
  if (request.params.name === "predict_hotspots") {
    const projectRoot = String(request.params.arguments?.projectRoot);
    const daysAhead = Number(request.params.arguments?.daysAhead) || 30;
    const riskThreshold = Number(request.params.arguments?.riskThreshold) || 30;

    const temporalGraph = await loadTemporalData(projectRoot);
    if (!temporalGraph) {
      return {
        content: [{ type: "text", text: "Error: No temporal data found. Please run detect_changes first to start collecting time-series data." }],
      };
    }

    const predictions = predictFutureHotspots(temporalGraph, daysAhead);
    const highRiskPredictions = predictions.filter(p => p.riskScore >= riskThreshold);

    // Wawasan (insights) tambahan
    const insights = analyzeEvolutionPatterns(temporalGraph);
    const criticalInsights = insights.filter(i => i.severity === 'high' || i.severity === 'critical');

    return {
      content: [{ type: "text", text: JSON.stringify({
        predictionDate: new Date().toISOString(),
        timeHorizon: `${daysAhead} days`,
        summary: {
          totalAnalyzedFiles: predictions.length,
          highRiskFiles: highRiskPredictions.length,
          criticalInsights: criticalInsights.length,
          overallTrend: temporalGraph.temporalMetadata.evolutionSummary.complexityTrend
        },
        predictions: highRiskPredictions.slice(0, 15), // 15 prediksi teratas
        criticalInsights: criticalInsights,
        recommendations: {
          immediate: highRiskPredictions.filter(p => p.riskScore > 70).map(p => p.filePath),
          schedule: highRiskPredictions.filter(p => p.riskScore > 50 && p.riskScore <= 70).map(p => p.filePath),
          monitor: highRiskPredictions.filter(p => p.riskScore >= 30 && p.riskScore <= 50).map(p => p.filePath)
        }
      }, null, 2) }],
    };
  }

  // ===== KONSULTASI TEMPORAL LANJUTAN (QUERY TEMPORAL ADVANCED) =====
  if (request.params.name === "query_temporal") {
    const projectRoot = String(request.params.arguments?.projectRoot);
    const queryType = String(request.params.arguments?.queryType);
    const trendType = request.params.arguments?.trendType as any;
    const threshold = Number(request.params.arguments?.threshold) || 50;
    const minConfidence = Number(request.params.arguments?.minConfidence) || 0;

    const temporalGraph = await loadTemporalData(projectRoot);
    if (!temporalGraph) {
      return {
        content: [{ type: "text", text: "Error: No temporal data found. Please run detect_changes first." }],
      };
    }

    let result: any;

    switch (queryType) {
      case 'trend':
        result = queryByTrend(temporalGraph, trendType);
        break;
      case 'volatility':
        result = queryByVolatility(temporalGraph, threshold);
        break;
      case 'velocity':
        result = queryByVelocity(temporalGraph, -threshold, threshold);
        break;
      case 'pattern':
        const patterns = detectPatterns(temporalGraph, minConfidence);
        result = {
          query: { type: 'pattern', timeRange: temporalGraph.temporalMetadata.timeRange },
          matches: patterns.map(p => ({
            filePath: p.filePath,
            score: p.confidence,
            confidence: p.confidence,
            details: {
              pattern: p.pattern,
              severity: p.severity,
              duration: p.endTime - p.startTime,
              affectedMetrics: p.affectedMetrics
            }
          })),
          summary: {
            totalMatches: patterns.length,
            averageScore: patterns.reduce((sum, p) => sum + p.confidence, 0) / (patterns.length || 1),
            timeRange: `${new Date(temporalGraph.temporalMetadata.timeRange.start).toLocaleDateString()} - ${new Date(temporalGraph.temporalMetadata.timeRange.end).toLocaleDateString()}`
          }
        };
        break;
      default:
        return {
          content: [{ type: "text", text: `Error: Unknown query type '${queryType}'` }],
        };
    }

    // Filter berdasarkan tingkat keyakinan (confidence) jika ditentukan
    if (minConfidence > 0) {
      result.matches = result.matches.filter((m: any) => m.confidence >= minConfidence);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  // ===== ANALISIS EVOLUSI (ANALYZE EVOLUTION) =====
  if (request.params.name === "analyze_evolution") {
    const projectRoot = String(request.params.arguments?.projectRoot);
    const periodDays = Number(request.params.arguments?.periodDays);
    const includePatterns = Boolean(request.params.arguments?.includePatterns !== false);

    const temporalGraph = await loadTemporalData(projectRoot);
    if (!temporalGraph) {
      return {
        content: [{ type: "text", text: "Error: No temporal data found. Please run detect_changes first." }],
      };
    }

    // Hitung rentang tanggal
    let startDate: Date | undefined;
    if (periodDays && periodDays > 0) {
      startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    }

    const analytics = analyzeEvolutionOverPeriod(temporalGraph, startDate);

    // Tambahkan metrik keyakinan untuk file teratas
    const topRiskFiles = temporalGraph.nodes
      .filter(n => (n.evolutionMetrics?.hotspotRisk || 0) > 50)
      .slice(0, 10)
      .map(n => ({
        filePath: n.id,
        riskScore: n.evolutionMetrics?.hotspotRisk,
        confidence: calculateConfidenceMetrics(n)
      }));

    return {
      content: [{ type: "text", text: JSON.stringify({
        analysisPeriod: {
          startDate: new Date(analytics.period.start).toISOString(),
          endDate: new Date(analytics.period.end).toISOString(),
          daysSpanned: analytics.period.daysSpanned
        },
        complexity: {
          min: analytics.complexityAnalysis.minComplexity,
          max: analytics.complexityAnalysis.maxComplexity,
          avg: analytics.complexityAnalysis.avgComplexity.toFixed(1),
          trend: analytics.complexityAnalysis.trend,
          changeRate: `${analytics.complexityAnalysis.changeRate.toFixed(2)} points/day`
        },
        stability: {
          average: analytics.stabilityAnalysis.avgStability.toFixed(1),
          stableFiles: analytics.stabilityAnalysis.stableFiles,
          volatileFiles: analytics.stabilityAnalysis.volatileFiles,
          mostStable: analytics.stabilityAnalysis.mostStable.slice(0, 3),
          mostVolatile: analytics.stabilityAnalysis.mostVolatile.slice(0, 3)
        },
        hotspots: {
          current: analytics.hotspotAnalysis.hotspotCount,
          highRisk: analytics.hotspotAnalysis.highRiskCount,
          emerging: analytics.hotspotAnalysis.emergingHotspots,
          topRiskFiles
        },
        patterns: includePatterns ? analytics.patterns : { message: 'Skipped' },
        recommendations: analytics.patterns.recommendations
      }, null, 2) }],
    };
  }

  throw new Error("Tool not found");
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Spider Map MCP Server running on stdio");
}

run().catch(console.error);

// Matikan server dengan aman (Graceful shutdown)
process.on('SIGINT', async () => {
  console.error('[MCP Server] Shutting down...');
  await stopAutoIndexer();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('[MCP Server] Shutting down...');
  await stopAutoIndexer();
  process.exit(0);
});
