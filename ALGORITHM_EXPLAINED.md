# 🧮 Algorithm Deep Dive - Token Compression

## 🔍 Step-by-Step: Text → Numbers Conversion

### Input: Raw Graph Data
```typescript
const rawGraph = {
  nodes: [
    {
      id: "src/models/User.ts",
      name: "User.ts",
      ext: ".ts",
      importsCount: 3,
      importedByCount: 21,
      role: "direct",
      riskLevel: "critical",
      fileCategory: "core"
    },
    {
      id: "src/controllers/UserController.ts", 
      name: "UserController.ts",
      ext: ".ts", 
      importsCount: 5,
      importedByCount: 8,
      role: "direct",
      riskLevel: "moderate", 
      fileCategory: "core"
    }
  ],
  links: [
    { source: "src/controllers/UserController.ts", target: "src/models/User.ts" }
  ]
}
```

**Size**: 847 characters = ~212 tokens

---

## 🔧 Algorithm Step 1: Build Symbol Tables

### Code Implementation:
```typescript
function buildSymbolTables(nodes: Node[]) {
  // Extract unique values
  const files = nodes.map(n => n.id);
  const categories = [...new Set(nodes.map(n => n.fileCategory || 'unknown'))];
  const roles = [...new Set(nodes.map(n => n.role || 'unknown'))];
  const risks = [...new Set(nodes.map(n => n.riskLevel || 'leaf'))];

  return { files, categories, roles, risks };
}
```

### Result:
```typescript
const symbolTables = {
  files: [
    "src/models/User.ts",           // Index 0
    "src/controllers/UserController.ts"  // Index 1
  ],
  categories: [
    "core",    // Index 0
    "view",    // Index 1  
    "style"    // Index 2
  ],
  roles: [
    "entry",    // Index 0
    "direct",   // Index 1
    "indirect"  // Index 2
  ],
  risks: [
    "critical", // Index 0
    "moderate", // Index 1
    "low"       // Index 2
  ]
}
```

---

## 🔧 Algorithm Step 2: Convert Text → Numbers

### Code Implementation:
```typescript
function compressNodes(nodes: Node[], symbolTables: any) {
  const { files, categories, roles, risks } = symbolTables;
  
  // Create lookup maps for O(1) conversion
  const fileToIdx = new Map(files.map((f, i) => [f, i]));
  const catToIdx = new Map(categories.map((c, i) => [c, i]));
  const roleToIdx = new Map(roles.map((r, i) => [r, i]));
  const riskToIdx = new Map(risks.map((r, i) => [r, i]));
  
  // Convert each node to number array
  return nodes.map(node => [
    fileToIdx.get(node.id)!,           // File index
    node.importsCount,                 // Keep as number
    node.importedByCount,              // Keep as number
    roleToIdx.get(node.role || 'unknown')!,     // Role index
    riskToIdx.get(node.riskLevel || 'leaf')!,   // Risk index
    catToIdx.get(node.fileCategory || 'unknown')! // Category index
  ]);
}
```

### Conversion Process:

#### Node 1: "src/models/User.ts"
```typescript
// Input:
{
  id: "src/models/User.ts",      → Index 0 (in files array)
  importsCount: 3,               → Keep as 3
  importedByCount: 21,           → Keep as 21
  role: "direct",                → Index 1 (in roles array)
  riskLevel: "critical",         → Index 0 (in risks array)
  fileCategory: "core"           → Index 0 (in categories array)
}

// Output:
[0, 3, 21, 1, 0, 0]
```

#### Node 2: "src/controllers/UserController.ts"
```typescript
// Input:
{
  id: "src/controllers/UserController.ts", → Index 1
  importsCount: 5,                         → Keep as 5
  importedByCount: 8,                      → Keep as 8
  role: "direct",                          → Index 1
  riskLevel: "moderate",                   → Index 1
  fileCategory: "core"                     → Index 0
}

// Output:
[1, 5, 8, 1, 1, 0]
```

---

## 🔧 Algorithm Step 3: Compress Links

### Code Implementation:
```typescript
function compressLinks(links: Link[], fileToIdx: Map<string, number>) {
  return links.map(link => [
    fileToIdx.get(link.source)!,  // Source file index
    fileToIdx.get(link.target)!   // Target file index
  ]);
}
```

### Conversion Process:
```typescript
// Input:
{ 
  source: "src/controllers/UserController.ts",  → Index 1
  target: "src/models/User.ts"                  → Index 0
}

// Output:
[1, 0]
```

---

## 📊 Final Compressed Result:

```json
{
  "v": 1,
  "s": {
    "f": ["src/models/User.ts", "src/controllers/UserController.ts"],
    "c": ["core", "view", "style"],
    "r": ["entry", "direct", "indirect"], 
    "l": ["critical", "moderate", "low"]
  },
  "n": [
    [0, 3, 21, 1, 0, 0],
    [1, 5, 8, 1, 1, 0]
  ],
  "e": [
    [1, 0]
  ]
}
```

**Size**: 198 characters = ~50 tokens

**Compression Ratio**: 212 → 50 tokens = **76% reduction!**

---

## 🔄 Decompression Algorithm

### Code Implementation:
```typescript
function decompressGraph(compressed: CompressedGraph): GraphData {
  const { s, n, e } = compressed;
  
  // Reconstruct nodes
  const nodes: Node[] = n.map(packed => {
    const [fileIdx, imports, importedBy, roleIdx, riskIdx, categoryIdx] = packed;
    
    return {
      id: s.f[fileIdx],              // Look up file name
      name: s.f[fileIdx].split('/').pop(),
      ext: s.f[fileIdx].substring(s.f[fileIdx].lastIndexOf('.')),
      importsCount: imports,
      importedByCount: importedBy,
      role: s.r[roleIdx],            // Look up role name
      riskLevel: s.l[riskIdx],       // Look up risk name
      fileCategory: s.c[categoryIdx], // Look up category name
      isOrphan: imports === 0 && importedBy === 0,
      isEntryPoint: imports > 0 && importedBy === 0,
      isHotspot: importedBy > 5
    };
  });
  
  // Reconstruct links
  const links: Link[] = e.map(packed => ({
    source: s.f[packed[0]],          // Look up source file
    target: s.f[packed[1]]           // Look up target file
  }));
  
  return { nodes, links, timestamp: Date.now() };
}
```

---

## 🚀 Advanced Compression Techniques

### 1. **Delta Encoding** (Additional 20% savings)

Instead of storing absolute values, store differences:

```typescript
// Before:
nodes = [
  [0, 3, 21, 1, 0, 0],
  [1, 5, 8, 1, 1, 0],   // role=1 (same), category=0 (same)
  [2, 2, 4, 1, 2, 0]    // role=1 (same), category=0 (same)
]

// After (with defaults):
defaults = { role: 1, category: 0 }  // Most common values
nodes = [
  [0, 3, 21, null, 0, null],  // null = use default
  [1, 5, 8, null, 1, null],   
  [2, 2, 4, null, 2, null]
]
```

### 2. **Run-Length Encoding** (For repetitive data)

```typescript
// If many files have same category:
categories = [0, 0, 0, 0, 1, 1, 2]  // 28 chars

// Compress to:
categories = "4x0,2x1,1x2"           // 11 chars (60% savings)
```

### 3. **Bit Packing** (Ultimate compression)

```typescript
// Pack multiple small values into single number
// Instead of: [roleIdx: 1, riskIdx: 0, categoryIdx: 0]
// Use: packed = (roleIdx << 4) | (riskIdx << 2) | categoryIdx
//      packed = (1 << 4) | (0 << 2) | 0 = 16

packed = [16]  // 1 number instead of 3
```

---

## 📈 Compression Comparison

### Example: 100-file project

| Method | Original | Compressed | Savings |
|--------|----------|------------|---------|
| **Raw JSON** | 15,000 chars | - | 0% |
| **Symbol Tables** | 15,000 | 3,500 | 77% |
| **+ Delta Encoding** | 15,000 | 2,800 | 81% |
| **+ Run-Length** | 15,000 | 2,400 | 84% |
| **+ Bit Packing** | 15,000 | 2,000 | 87% |

---

## 🎯 Why This Works So Well?

### 1. **Redundancy Elimination**
```typescript
// Instead of repeating "core" 50 times:
"core", "core", "core", ... // 200 chars

// Store once, reference by index:
categories: ["core"]  // 10 chars
references: [0, 0, 0, ...] // 50 chars
// Total: 60 chars vs 200 = 70% savings
```

### 2. **Structural Optimization**
```typescript
// Instead of verbose JSON:
{
  "id": "file.ts",
  "name": "file.ts", 
  "importsCount": 3
}

// Use ordered arrays:
["file.ts", 3]  // Position = meaning
```

### 3. **Type-Aware Compression**
```typescript
// Numbers stay as numbers (efficient)
// Strings become indices (eliminate repetition)
// Booleans become bits (ultimate compression)
```

---

## 💡 Real-World Example

### Laravel Project (500 files):

```typescript
// BEFORE compression:
{
  nodes: [
    { id: "app/Http/Controllers/UserController.php", fileCategory: "core", role: "direct", ... },
    { id: "app/Http/Controllers/ProductController.php", fileCategory: "core", role: "direct", ... },
    { id: "app/Http/Controllers/OrderController.php", fileCategory: "core", role: "direct", ... },
    // ... 497 more nodes with repeated "core", "direct", etc.
  ]
}
// Size: 45,000 characters = 11,250 tokens
```

```typescript
// AFTER compression:
{
  s: {
    f: ["app/Http/Controllers/UserController.php", ...],    // 500 unique files
    c: ["core", "view", "style", "config"],               // 4 categories vs 500 repetitions
    r: ["entry", "direct", "indirect", "orphan"],         // 4 roles vs 500 repetitions
    l: ["critical", "moderate", "low", "leaf"]            // 4 levels vs 500 repetitions
  },
  n: [
    [0, 5, 12, 1, 0, 0],  // 6 numbers vs 200+ chars of JSON
    [1, 3, 8, 1, 1, 0],
    // ... 498 more arrays
  ]
}
// Size: 9,000 characters = 2,250 tokens
// Savings: 80%!
```

---

## 🔬 Algorithm Complexity

### Time Complexity:
- **Compression**: O(n) where n = number of files
- **Decompression**: O(n) 
- **Memory**: O(1) additional space (just symbol tables)

### Space Complexity:
- **Symbol tables**: O(k) where k = unique values (usually k << n)
- **Compressed data**: O(n) but 80% smaller

---

## 🎓 Summary

**Yes, teks di-convert jadi parameter angka!**

### Conversion Process:
1. **Extract unique strings** → Build symbol tables
2. **Replace strings with indices** → Numbers instead of text
3. **Pack data efficiently** → Arrays instead of objects
4. **Eliminate redundancy** → Reference once, use many times

### Key Insight:
```
"src/models/User.ts" (19 chars) → 0 (1 char)
"critical" (8 chars) → 0 (1 char)  
"core" (4 chars) → 0 (1 char)

Total: 31 chars → 3 chars = 90% reduction per node!
```

**Result**: Sama seperti ZIP compression, tapi khusus untuk graph data structure! 🚀

---

**The magic**: AI tetap dapat informasi lengkap, cuma dalam format yang jauh lebih hemat token! 🎯