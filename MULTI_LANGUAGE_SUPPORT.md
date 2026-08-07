# 🌍 Multi-Language Support Documentation

Spider Map MCP server mendukung **15+ bahasa pemrograman** dengan deteksi dependency otomatis.

## ✅ Supported Languages & Frameworks

### 1. **JavaScript/TypeScript** (Full Support)
```javascript
// Detected patterns:
import React from 'react'
import { useState } from 'react'
export * from './utils'
const lib = require('./lib')
const dynamic = await import('./module')
```

**Frameworks**: React, Vue, Angular, Node.js, Next.js, Nuxt, Svelte

---

### 2. **Python** (Full Support)
```python
# Detected patterns:
import os
from pathlib import Path
from .models import User
import package.module
```

**Frameworks**: Django, Flask, FastAPI, Pandas, NumPy

---

### 3. **PHP/Laravel** (Full Support)
```php
// Detected patterns:
use App\Models\User;
require_once 'config.php';
include 'header.php';

// Blade templates
@extends('layouts.app')
@include('partials.header')

// Views
return view('admin.dashboard');
```

**Frameworks**: Laravel, Symfony, WordPress, CodeIgniter

---

### 4. **Dart/Flutter** (Full Support)
```dart
// Detected patterns:
import 'package:flutter/material.dart';
import '../models/user.dart';
part 'user.g.dart';
export 'widgets/button.dart';
```

**Framework**: Flutter

**Convention**: 
- `lib/` folder is root
- Files ending with `_test.dart` marked as test category

---

### 5. **Go** (Full Support)
```go
// Detected patterns:
import "fmt"
import (
    "net/http"
    "github.com/user/repo"
    "./models"
)
```

**Convention**: 
- `go.mod` detected as config
- Internal package imports tracked

---

### 6. **Rust** (Full Support)
```rust
// Detected patterns:
use std::collections::HashMap;
use crate::models::User;
mod utils;
mod tests;
```

**Convention**:
- `Cargo.toml` detected as config
- `mod.rs` used for module resolution
- `lib.rs` as library entry

---

### 7. **Java/Kotlin** (Full Support)
```java
// Detected patterns:
import java.util.List;
import com.example.models.User;
import static org.junit.Assert.*;
```

```kotlin
// Kotlin
import androidx.compose.runtime.*
import com.example.data.User
```

**Frameworks**: Spring Boot, Android, Compose

---

### 8. **C/C++** (Full Support)
```cpp
// Detected patterns:
#include <iostream>
#include "my_header.h"
#include "../utils/helper.hpp"
```

**Convention**: Header files (`.h`, `.hpp`) tracked separately

---

### 9. **C#** (Basic Support)
```csharp
// Not yet parsing C# specific imports
// But files are crawled
```

**Status**: Files crawled, parser coming soon

---

### 10. **Ruby** (Basic Support)
```ruby
# Not yet parsing Ruby requires
# But files are crawled
```

**Status**: Files crawled, parser coming soon

---

### 11. **Swift** (Basic Support)
```swift
// Not yet parsing Swift imports
// But files are crawled
```

**Status**: Files crawled, parser coming soon

---

### 12. **CSS/SCSS/SASS/Less** (Full Support)
```css
/* Detected patterns: */
@import 'variables';
@import url('fonts.css');
background: url('../images/bg.png');
```

---

### 13. **HTML/Vue/Svelte** (Full Support)
```html
<!-- Detected patterns: -->
<link rel="stylesheet" href="style.css">
<script src="app.js"></script>
<img src="../images/logo.png">
```

---

### 14. **Configuration Files** (Detected)
```
package.json      → config
tsconfig.json     → config
Cargo.toml        → config
go.mod            → config
pubspec.yaml      → config (Dart)
composer.json     → config (PHP)
requirements.txt  → config (Python)
```

---

## 📊 File Categories

Setiap file dikategorikan otomatis:

| Category | Description | Examples |
|----------|-------------|----------|
| `core` | Backend/logic code | `.js`, `.ts`, `.py`, `.php`, `.go`, `.rs`, `.java`, `.dart` |
| `view` | Frontend templates | `.blade.php`, `.vue`, `.html`, `.jsx`, `.tsx`, `.svelte` |
| `style` | Styling files | `.css`, `.scss`, `.sass`, `.less` |
| `config` | Configuration | `.json`, `.yml`, `.toml`, `config.js`, `Cargo.toml` |
| `test` | Test files | `*.test.js`, `*.spec.ts`, `*_test.dart`, `test_*.py` |
| `db` | Database | `.sql`, `.prisma`, migrations |
| `doc` | Documentation | `.md`, `.rst`, `.adoc` |
| `utility` | Helper/misc | `.h`, `.hpp`, utility scripts |
| `asset` | Static assets | images, fonts |

---

## 🔍 Detection Examples

### Example 1: Flutter Project
```
lib/
  main.dart                    → core, entry point
  models/
    user.dart                  → core
  widgets/
    button.dart                → core
  screens/
    home_screen.dart           → view
test/
  widget_test.dart             → test
pubspec.yaml                   → config
```

**Result**:
- `main.dart` → imports `models/user.dart`, `screens/home_screen.dart`
- Spider Map tracks all imports across widgets

---

### Example 2: React TypeScript Project
```
src/
  index.tsx                    → core, entry point
  App.tsx                      → view
  components/
    Button.tsx                 → view
  hooks/
    useAuth.ts                 → core
  styles/
    App.css                    → style
package.json                   → config
```

**Result**:
- `index.tsx` imports `App.tsx`
- `App.tsx` imports `Button.tsx`, `App.css`
- CSS imports tracked via `import './App.css'`

---

### Example 3: Go Microservice
```
main.go                        → core, entry point
internal/
  handlers/
    user.go                    → core
  models/
    user.go                    → core
go.mod                         → config
```

**Result**:
- Package imports tracked
- Internal dependencies mapped

---

## 🎯 What AI Gets From This

### Before (without multi-language):
```
AI: "I need to change user.dart"
*AI doesn't know which files import it*
*AI might break Flutter app*
```

### After (with multi-language):
```
AI: simulate_impact "lib/models/user.dart"
→ Returns:
  - Direct: home_screen.dart, profile_widget.dart
  - Indirect: main.dart
  
AI: "Changing user.dart will affect 3 files. 
     I'll update them together to maintain consistency."
```

---

## 🚀 Usage

### Scan Any Project:
```bash
# JavaScript
npm run crawl -- --path "/path/to/react-project"

# Python
npm run crawl -- --path "/path/to/django-project"

# Flutter
npm run crawl -- --path "/path/to/flutter-app"

# Go
npm run crawl -- --path "/path/to/go-service"

# Rust
npm run crawl -- --path "/path/to/rust-project"

# PHP Laravel
npm run crawl -- --path "/path/to/laravel-app"
```

### Via MCP:
```json
{
  "tool": "get_project_map",
  "arguments": {
    "projectRoot": "/path/to/any-project",
    "forceRefresh": false
  }
}
```

---

## 🔧 Adding New Languages

To add support for a new language:

### 1. Add to Crawler (`crawler.ts`):
```typescript
const extensions = [
  // ... existing
  'newlang', // Your new extension
];
```

### 2. Add Parser (`parser.ts`):
```typescript
// Your language import pattern
const newLangImportRegex = /import\s+['"]([^'"]+)['"]/g;

// In parseFileDependencies:
else if (fileExt === '.newlang') {
  while ((match = newLangImportRegex.exec(content)) !== null) {
    resolveAndAdd(match[1], fileDir, allFilesSet, imports);
  }
}
```

### 3. Add to Graph (`graph.ts`):
```typescript
// In file category detection:
else if (['.newlang'].includes(ext)) {
  node.fileCategory = 'core';
}
```

---

## 📈 Performance Notes

### Large Projects:
- **1,000 files**: ~2-5 seconds
- **5,000 files**: ~10-20 seconds
- **10,000+ files**: Use filtering by file type

### Optimization Tips:
```typescript
// Add to ignorePatterns in crawler.ts:
const ignorePatterns = [
  // ... existing
  '**/your-heavy-folder/**',
];
```

---

## 🐛 Known Limitations

1. **External packages not tracked** (by design)
   - `import 'react'` → skipped
   - `import './local'` → tracked ✅

2. **Dynamic imports need static analysis**
   - `import('./dynamic')` → tracked ✅
   - `import(variable)` → not tracked ❌

3. **Conditional imports**
   - Most patterns detected
   - Some edge cases may be missed

4. **Monorepos**
   - Each package should be scanned separately
   - Or use workspace root and filter results

---

## 💡 Best Practices for AI

### 1. Check Impact Before Editing:
```typescript
// Always run impact simulation first
await simulate_impact(projectRoot, fileToChange);
```

### 2. Focus on Hotspots:
```typescript
// Find critical files
const hotspots = nodes.filter(n => n.importedByCount > 5);
```

### 3. Identify Entry Points:
```typescript
// Start analysis from entry points
const entries = nodes.filter(n => n.isEntryPoint);
```

### 4. Handle Orphans:
```typescript
// Check if file is actually used
const orphans = nodes.filter(n => n.isOrphan);
// Consider deleting unused code
```

---

## 🎓 Learning Resources

- **JavaScript/TypeScript**: ESM, CommonJS import patterns
- **Python**: Absolute vs relative imports
- **Dart**: Package imports vs local imports
- **Go**: Module system
- **Rust**: Crate system, mod hierarchy
- **PHP**: PSR-4 autoloading, namespaces

---

## 📝 Contributing

Untuk menambah support bahasa baru:

1. Fork repository
2. Add parser regex pattern
3. Add test case
4. Submit PR dengan example project

---

## ⚡ Quick Reference

| Language | Entry File | Import Pattern | Notes |
|----------|------------|----------------|-------|
| JS/TS | `index.js`, `main.ts` | `import x from 'y'` | Full support |
| Python | `main.py`, `__init__.py` | `from x import y` | Full support |
| PHP | `index.php`, `app.php` | `use App\\X;` | Laravel aware |
| Dart | `main.dart` | `import 'package:x'` | Flutter aware |
| Go | `main.go` | `import "x"` | Module aware |
| Rust | `main.rs`, `lib.rs` | `use crate::x` | Cargo aware |
| Java | `Main.java` | `import x.y.Z` | Package aware |
| C/C++ | `main.c`, `main.cpp` | `#include "x.h"` | Header tracking |

---

**Last Updated**: 2026-08-05  
**Version**: 2.0.0 (Multi-Language Support)
