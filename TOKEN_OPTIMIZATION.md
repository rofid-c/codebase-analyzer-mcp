# 🎯 Token Optimization Strategy

## Problem Statement

**Current situation**:
```json
// Normal Spider Map output: ~50,000 chars = ~12,500 tokens
{
  "nodes": [
    {
      "id": "src/models/User.ts",
      "name": "User.ts",
      "ext": ".ts",
      "importsCount": 3,
      "importedByCount": 12,
      "role": "direct",
      "riskLevel": "moderate",
      "fileCategory": "core"
    },
    // ... 500 more nodes
  ],
  "links": [
    { "source": "src/controllers/UserController.ts", "target": "src/models/User.ts" },
    // ... 1000 more links
  ]
}
```

**AI Token Cost**: 12,500 tokens per query = **EXPENSIVE** 💰

---

## 🎯 Solution: Compact Binary-like Format

### Approach 1: **Symbol Table Compression** ⭐⭐⭐⭐⭐

```typescript
// Traditional format: ~12,500 tokens
{
  nodes: [...], 
  links: [...]
}

// Compressed format: ~2,500 tokens (80% reduction!)
{
  "v": 1,  // version
  "s": {   // symbol table
    "f": ["src/models/User.ts", "src/controllers/UserController.ts"],
    "c": ["core", "view", "style", "config", "test"],
    "r": ["entry", "direct", "indirect", "orphan"],
    "l": ["critical", "moderate", "low", "leaf"]
  },
  "n": [
    [0, 3, 12, 1, 1, 0],  // [fileId, imports, importedBy, role, risk, category]
    [1, 5, 3, 1, 2, 0]
  ],
  "e": [
    [1, 0],  // [sourceId, targetId]
    [2, 0]
  ]
}
```

**Token Savings**: 80% reduction!

---

### Approach 2: **Hierarchical Grouping** ⭐⭐⭐⭐

```json
// Group by directory - reduces repetition
{
  "dirs": {
    "src/models": {
      "files": ["User", "Product", "Order"],
      "props": { "category": "core", "avgRisk": "moderate" }
    },
    "src/controllers": {
      "files": ["UserCtrl", "ProductCtrl"],
      "imports": ["../models/User", "../models/Product"]
    }
  }
}
```

**Token Savings**: 60% reduction

---

### Approach 3: **Delta Encoding** ⭐⭐⭐⭐

```json
// Store only differences from defaults
{
  "defaults": {
    "role": "indirect",
    "risk": "low",
    "category": "core"
  },
  "nodes": [
    { "id": 0, "imports": 3, "importedBy": 12, "risk": "moderate" },  // only changed fields
    { "id": 1, "imports": 5, "importedBy": 3 }  // uses defaults for rest
  ]
}
```

**Token Savings**: 50% reduction

---

## 🚀 Implementation Plan

### Phase 1: Add Compression Layer

```typescript
// src/core/compressor.ts
export interface CompressedGraph {
  version: number;
  symbols: {
    files: string[];          // File path dictionary
    categories: string[];     // Category enum
    roles: string[];          // Role enum
    risks: string[];          // Risk enum
  };
  nodes: number[][];          // Packed node data
  edges: number[][];          // Packed edge data
  stats: {                    // Summary only
    total: number;
    critical: number;
    hotspots: number;
  };
}

export function compressGraph(graph: GraphData): CompressedGraph {
  const symbols = buildSymbolTable(graph);
  const nodes = packNodes(graph.nodes, symbols);
  const edges = packEdges(graph.links, symbols);
  
  return {
    version: 1,
    symbols,
    nodes,
    edges,
    stats: calculateStats(graph)
  };
}

export function decompressGraph(compressed: CompressedGraph): GraphData {
  // Reverse process - reconstruct full graph
  return {
    nodes: unpackNodes(compressed.nodes, compressed.symbols),
    links: unpackEdges(compressed.edges, compressed.symbols),
    timestamp: Date.now()
  };
}
```

---

### Phase 2: Smart Response Modes

```typescript
// In MCP server
{
  name: "get_project_map",
  inputSchema: {
    properties: {
      projectRoot: { type: "string" },
      responseMode: {
        enum: [
          "full",           // Full JSON (~12,500 tokens)
          "compressed",     // Compressed (~2,500 tokens)
          "summary",        // Stats only (~500 tokens)
          "critical-only",  // Hotspots + critical (~1,500 tokens)
          "query"           // Specific files only (~200 tokens)
        ]
      }
    }
  }
}
```

**Usage**:
```json
// AI first asks for summary
{ "responseMode": "summary" }
→ Returns: { "totalFiles": 532, "criticalFiles": 5, "hotspots": 8 }
   Cost: 500 tokens

// Then requests specific file info
{ "responseMode": "query", "fileId": "src/models/User.ts" }
→ Returns: detailed info for that file only
   Cost: 200 tokens

// Total: 700 tokens vs 12,500 tokens = 94% savings!
```

---

## 📊 Token Savings Comparison

| Approach | Tokens | Savings | Implementation |
|----------|--------|---------|----------------|
| **Current (Full JSON)** | 12,500 | 0% | ✅ Current |
| **Compressed Binary** | 2,500 | 80% | ⭐⭐⭐⭐⭐ Best |
| **Hierarchical** | 5,000 | 60% | ⭐⭐⭐⭐ Good |
| **Delta Encoding** | 6,250 | 50% | ⭐⭐⭐ OK |
| **Summary Mode** | 500 | 96% | ⭐⭐⭐⭐⭐ Quick win |
| **Query Mode** | 200 | 98% | ⭐⭐⭐⭐⭐ Per-file |

---

## 🎯 Recommended Implementation

### Step 1: Summary Mode (Quick Win) - 1 hour
```typescript
function generateSummary(graph: GraphData) {
  return {
    stats: {
      totalFiles: graph.nodes.length,
      totalLinks: graph.links.length,
      criticalFiles: graph.nodes.filter(n => n.riskLevel === 'critical').length,
      hotspots: graph.nodes.filter(n => n.isHotspot).length,
      orphans: graph.nodes.filter(n => n.isOrphan).length,
      entryPoints: graph.nodes.filter(n => n.isEntryPoint).length
    },
    topCritical: graph.nodes
      .filter(n => n.riskLevel === 'critical')
      .slice(0, 10)
      .map(n => ({ id: n.id, importedBy: n.importedByCount }))
  };
}
```

**Token reduction**: 96% (12,500 → 500 tokens)

---

### Step 2: Query Mode - 2 hours
```typescript
function queryFile(graph: GraphData, fileId: string) {
  const node = graph.nodes.find(n => n.id === fileId);
  if (!node) return null;
  
  const imports = graph.links
    .filter(l => l.source === fileId)
    .map(l => l.target);
    
  const importedBy = graph.links
    .filter(l => l.target === fileId)
    .map(l => l.source);
  
  return {
    file: node,
    imports,
    importedBy,
    impact: imports.length + importedBy.length
  };
}
```

**Token reduction**: 98% per query (12,500 → 200 tokens)

---

### Step 3: Compression Format - 1 day
Implement full binary-like compression as shown above.

**Token reduction**: 80% (12,500 → 2,500 tokens)

---

## 💡 Advanced: AI-Specific Mini Language

### Concept: AST-like representation

**Instead of**:
```typescript
// 200 tokens
class User {
  id: string;
  name: string;
  email: string;
  
  constructor(data: UserData) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
  }
  
  validateEmail(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email);
  }
}
```

**Use**:
```
// 30 tokens (85% reduction!)
cls:User<str:id,str:name,str:email>
ctor<UserData>
fn:validateEmail->bool{regex:email}
```

**Format Spec**:
- `cls:Name<props>` = class definition
- `fn:name->type{logic}` = function
- `<type>` = type annotation
- `{logic}` = semantic description

---

## 🔬 Real Example Comparison

### Scenario: AI analyzing User model changes

**Traditional approach**:
```
1. Load full graph: 12,500 tokens
2. AI processes all data
3. Finds User.ts
4. Analyzes impact
Total: 12,500 tokens
```

**Optimized approach**:
```
1. Request summary: 500 tokens
2. AI: "I need info about User.ts"
3. Query User.ts: 200 tokens
4. AI: "Show me files importing User.ts"
5. Query imports: 300 tokens
Total: 1,000 tokens (92% savings!)
```

---

## 📈 Expected Results

### For typical project (500 files):

| Query Type | Traditional | Optimized | Savings |
|------------|-------------|-----------|---------|
| "Show overview" | 12,500 | 500 | 96% |
| "Analyze User.ts" | 12,500 | 200 | 98% |
| "Find hotspots" | 12,500 | 800 | 94% |
| "Impact of change" | 12,500 | 1,200 | 90% |
| **Average** | **12,500** | **675** | **95%** |

---

## 🎯 Implementation Priority

### Phase 1 (Week 1) - MUST HAVE
- [x] Summary mode
- [x] Query mode  
- [ ] Implement in MCP server

### Phase 2 (Week 2) - SHOULD HAVE
- [ ] Compression format
- [ ] Decompression utility
- [ ] Response mode selector

### Phase 3 (Week 3) - NICE TO HAVE
- [ ] AST mini-language
- [ ] Semantic compression
- [ ] AI-specific format

---

## 🚀 Quick Start Implementation

Add to `src/mcp/server.ts`:

```typescript
// Add response mode
if (request.params.arguments?.responseMode === 'summary') {
  return {
    content: [{ 
      type: "text", 
      text: JSON.stringify(generateSummary(graphData)) 
    }]
  };
}

if (request.params.arguments?.responseMode === 'query') {
  const fileId = String(request.params.arguments?.fileId);
  return {
    content: [{ 
      type: "text", 
      text: JSON.stringify(queryFile(graphData, fileId)) 
    }]
  };
}

// Default: compressed
return {
  content: [{ 
    type: "text", 
    text: JSON.stringify(compressGraph(graphData)) 
  }]
};
```

---

## 📝 Conclusion

**Answer to your question**: 

✅ **YES, sangat efektif!** 

Token savings bisa mencapai **80-98%** tergantung approach:
- Summary mode: **96% savings** (12,500 → 500 tokens)
- Query mode: **98% savings** (12,500 → 200 tokens)  
- Compression: **80% savings** (12,500 → 2,500 tokens)

**Recommended**: Implement Summary + Query mode dulu (quick win!)

---

**Key Insight**: 
> AI tidak perlu semua data sekaligus. Dengan memberikan:
> 1. Summary dulu (500 tokens)
> 2. Kemudian detail on-demand (200 tokens per query)
> 
> Total bisa turun dari 12,500 → 1,000 tokens = **92% lebih murah!** 💰

---

**Next Steps**:
1. Implement summary mode (1 hour) ✅ Easy
2. Implement query mode (2 hours) ✅ Easy
3. Add to MCP server (1 hour) ✅ Easy
4. Test with AI (30 min) ✅ Easy

Total: **Half day of work for 92% token savings!** 🚀
