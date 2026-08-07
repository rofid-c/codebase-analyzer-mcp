# 🚀 Token Optimization - Usage Guide

## 📊 Response Modes Comparison

| Mode | Tokens | Savings | Use When |
|------|--------|---------|----------|
| `summary` | 500 | 96% | Need project overview |
| `compressed` | 2,500 | 80% | Need full data, token-efficient |
| `critical-only` | 1,500 | 90% | Focus on high-risk files |
| `full` | 12,500 | 0% | Small projects or debugging |

---

## 🎯 Usage Examples

### Example 1: First Time Analysis (Recommended Flow)

```json
// Step 1: Get summary (500 tokens)
{
  "tool": "get_project_map",
  "arguments": {
    "projectRoot": "/path/to/project",
    "responseMode": "summary"
  }
}
```

**Response**:
```json
{
  "mode": "summary",
  "info": "Summary mode - 96% token reduction",
  "tokenSavings": {
    "full": { "tokens": 12500 },
    "summary": { "tokens": 500, "savings": "96.0%" }
  },
  "data": {
    "version": "2.0.0",
    "stats": {
      "totalFiles": 532,
      "totalLinks": 1247,
      "criticalFiles": 5,
      "hotspots": 8,
      "orphans": 157,
      "entryPoints": 47
    },
    "topCritical": [
      { "id": "src/models/User.ts", "importedBy": 21 },
      { "id": "src/controllers/BaseController.ts", "importedBy": 18 }
    ]
  }
}
```

```json
// Step 2: Query specific file (200 tokens)
{
  "tool": "query_file",
  "arguments": {
    "projectRoot": "/path/to/project",
    "fileId": "src/models/User.ts"
  }
}
```

**Total**: 700 tokens instead of 12,500 = **94% savings!**

---

### Example 2: Analyzing Critical Files Only

```json
{
  "tool": "get_project_map",
  "arguments": {
    "projectRoot": "/path/to/project",
    "responseMode": "critical-only"
  }
}
```

**Response**:
```json
{
  "mode": "critical-only",
  "info": "Critical-only mode - 90% token reduction",
  "data": {
    "stats": { ... },
    "criticalFiles": [
      { "id": "src/models/User.ts", "importedBy": 21, "role": "direct" },
      { "id": "app/Http/Controllers/Controller.php", "importedBy": 18 }
    ],
    "hotspots": [
      { "id": "resources/views/layouts/app.blade.php", "importedBy": 24 },
      { "id": "src/services/AuthService.ts", "importedBy": 15 }
    ]
  }
}
```

**Use case**: Focus on high-risk files that need attention

---

### Example 3: Compressed Format for Full Data

```json
{
  "tool": "get_project_map",
  "arguments": {
    "projectRoot": "/path/to/project",
    "responseMode": "compressed"
  }
}
```

**Response**:
```json
{
  "mode": "compressed",
  "info": "Compressed mode - 80% token reduction",
  "data": {
    "v": 1,
    "s": {
      "f": ["src/models/User.ts", "src/controllers/UserController.ts"],
      "c": ["core", "view", "style"],
      "r": ["entry", "direct", "indirect"],
      "l": ["critical", "moderate", "low"]
    },
    "n": [
      [0, 3, 21, 1, 0, 0],  // User.ts: 3 imports, 21 importedBy, direct, critical, core
      [1, 5, 3, 1, 1, 0]    // UserController.ts
    ],
    "e": [
      [1, 0],  // UserController imports User
      [2, 0]
    ]
  }
}
```

**Use case**: Need all data but want token efficiency

---

### Example 4: Query Specific File

```json
{
  "tool": "query_file",
  "arguments": {
    "projectRoot": "/path/to/project",
    "fileId": "src/models/User.ts"
  }
}
```

**Response**:
```json
{
  "file": {
    "id": "src/models/User.ts",
    "name": "User.ts",
    "ext": ".ts",
    "importsCount": 3,
    "importedByCount": 21,
    "role": "direct",
    "riskLevel": "critical",
    "fileCategory": "core"
  },
  "imports": [
    "src/utils/validator.ts",
    "src/interfaces/IUser.ts",
    "src/config/database.ts"
  ],
  "importedBy": [
    "src/controllers/UserController.ts",
    "src/services/AuthService.ts",
    "src/middleware/auth.ts",
    // ... 18 more
  ],
  "impactRadius": {
    "direct": 21,
    "indirect": 47,
    "total": 68
  }
}
```

**Use case**: Deep dive into specific file

---

## 🎓 AI Conversation Examples

### Scenario 1: Understanding Large Codebase

**AI Prompt**: "Analyze this 500-file React project"

**Optimal Flow**:
```
1. get_project_map(responseMode: "summary") → 500 tokens
   AI sees: 500 files, 1200 links, 8 hotspots, 5 critical

2. AI asks: "What are the critical files?"
   → Already in summary response

3. query_file("src/components/App.tsx") → 200 tokens
   AI sees: This component is imported by 45 files

4. simulate_impact("src/components/App.tsx") → 300 tokens
   AI sees: Changing this affects 78 files total

Total: 1,000 tokens vs 12,500 tokens = 92% savings
```

---

### Scenario 2: Refactoring Task

**AI Prompt**: "I want to refactor User model"

**Optimal Flow**:
```
1. get_project_map(responseMode: "summary") → 500 tokens
   AI finds: User.ts is in top critical

2. query_file("src/models/User.ts") → 200 tokens
   AI sees: 21 direct importers

3. simulate_impact("src/models/User.ts") → 300 tokens
   AI sees: 68 files total affected

4. For each critical importer:
   query_file("src/controllers/UserController.ts") → 200 tokens

Total: ~1,500 tokens vs 12,500+ = 88% savings
```

---

### Scenario 3: Code Review

**AI Prompt**: "Review PR that modifies AuthService.ts"

**Optimal Flow**:
```
1. query_file("src/services/AuthService.ts") → 200 tokens
   AI: "This file is imported by 15 components"

2. simulate_impact("src/services/AuthService.ts") → 300 tokens
   AI: "Changes will affect 32 files total"

3. get_project_map(responseMode: "critical-only") → 1,500 tokens
   AI: "This is a hotspot - needs extra review"

Total: 2,000 tokens vs 12,500 = 84% savings
```

---

## 💡 Best Practices

### 1. Start with Summary
Always begin with `responseMode: "summary"` to get overview.

### 2. Query On-Demand
Use `query_file` for specific files instead of loading everything.

### 3. Use Critical-Only for Reviews
When reviewing changes, use `responseMode: "critical-only"` to focus on high-risk files.

### 4. Compressed for Archiving
If you need to save the full graph, use `compressed` mode.

### 5. Avoid Full Mode
Only use `responseMode: "full"` for small projects (<100 files).

---

## 🔍 Token Comparison Table

### Small Project (100 files)

| Mode | Tokens | Best For |
|------|--------|----------|
| summary | 300 | Quick overview |
| query_file | 150 | Specific file |
| compressed | 800 | Full data |
| critical-only | 500 | Risk assessment |
| full | 2,500 | OK for small projects |

### Medium Project (500 files)

| Mode | Tokens | Best For |
|------|--------|----------|
| summary | 500 | Quick overview ⭐ |
| query_file | 200 | Specific file ⭐ |
| compressed | 2,500 | Full data |
| critical-only | 1,500 | Risk assessment |
| full | 12,500 | ❌ Too expensive |

### Large Project (1000+ files)

| Mode | Tokens | Best For |
|------|--------|----------|
| summary | 800 | Quick overview ⭐ |
| query_file | 250 | Specific file ⭐ |
| compressed | 5,000 | Full data |
| critical-only | 2,000 | Risk assessment ⭐ |
| full | 25,000+ | ❌ Never use |

---

## 🚨 Common Mistakes

### ❌ Don't Do This:
```json
// Loading full graph for large project
{
  "tool": "get_project_map",
  "arguments": {
    "projectRoot": "/large/project",
    "responseMode": "full"
  }
}
// Cost: 25,000 tokens!
```

### ✅ Do This Instead:
```json
// Step 1: Summary
{
  "responseMode": "summary"  // 800 tokens
}

// Step 2: Query what you need
{
  "tool": "query_file",
  "arguments": { "fileId": "specific/file.ts" }  // 250 tokens
}
// Total: 1,050 tokens (96% savings!)
```

---

## 📈 Real-World Results

### Case Study: 500-file React Project

**Before optimization**:
- Every query: 12,500 tokens
- 5 queries per session: 62,500 tokens
- Cost: ~$0.75 per session (at GPT-4 pricing)

**After optimization**:
- Summary: 500 tokens
- 3x query_file: 600 tokens  
- 1x simulate_impact: 300 tokens
- Total: 1,400 tokens
- Cost: ~$0.02 per session

**Savings**: 97.8% reduction, **$0.73 saved per session**

---

## 🎯 Quick Reference

```typescript
// Overview only
get_project_map({ responseMode: "summary" })          // 500 tokens

// Need specific file
query_file({ fileId: "src/models/User.ts" })          // 200 tokens

// Focus on risks
get_project_map({ responseMode: "critical-only" })    // 1,500 tokens

// Full data, efficient
get_project_map({ responseMode: "compressed" })       // 2,500 tokens

// Impact analysis
simulate_impact({ targetFile: "src/models/User.ts" }) // 300 tokens
```

---

## 📝 Summary

**Key Takeaway**: 
> With proper response modes, you can reduce token usage by **80-98%** while maintaining full functionality.

**Recommended Default Flow**:
1. Start with `summary` (500 tokens)
2. Use `query_file` for specifics (200 tokens each)
3. Use `simulate_impact` when needed (300 tokens)

**Average savings**: **92-96% token reduction** for typical workflows!

---

**Made possible by intelligent data compression and on-demand querying** 🚀
