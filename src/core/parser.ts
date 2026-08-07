import fs from 'fs-extra';
import path from 'path';

export interface FileDependency {
  sourceFile: string; // File yang melakukan impor
  targetFile: string; // File yang diimpor (path relatif yang sudah diselesaikan)
}

export async function parseFileDependencies(
  filePath: string,
  projectRoot: string,
  allFilesSet: Set<string>
): Promise<string[]> {
  const fullPath = path.join(projectRoot, filePath);
  let content = '';
  try {
    content = await fs.readFile(fullPath, 'utf-8');
  } catch {
    return [];
  }

  const imports: string[] = [];
  const fileDir = path.dirname(filePath);
  const fileExt = path.extname(filePath).toLowerCase();

  // === JavaScript/TypeScript ===
  const jsTsImportRegex = /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  
  // Pola JS/TS terbaru
  const asyncComponentRegex = /component:\s*\(\)\s*=>\s*import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  const lazyImportRegex = /(?:lazy|loadable)\s*\(\s*\(\)\s*=>\s*import\s*\(\s*['"]([^'"]+)['"]\s*\)\s*\)/g;
  const webpackImportRegex = /import\s*\(\s*\/\*.*?\*\/\s*['"]([^'"]+)['"]\s*\)/g;

  // === Python ===
  const pyImportRegex = /from\s+([.\w]+)\s+import/g;
  const pyDirectImportRegex = /^import\s+([.\w]+)/gm;
  
  // Pola Python lanjutan
  const pyRelativeImportRegex = /from\s+(\.+[\w.]*)\s+import/g; // dari modul relatif (from ..module import)
  const pyConditionalImportRegex = /^(\s+)?import\s+([.\w]+)/gm; // Impor menjorok (di dalam fungsi/kelas)
  const pyTryImportRegex = /try:\s*\n\s+import\s+([.\w]+)/g; // Impor di dalam blok try-except
  const pyAsyncImportRegex = /async\s+def\s+\w+.*?import\s+([.\w]+)/gs; // Impor di dalam fungsi async
  const pyImportAsRegex = /import\s+([.\w]+)\s+as\s+\w+/g; // import X sebagai Y

  // === Ruby ===
  const rubyRequireRegex = /require\s+['"]([^'"]+)['"]/g;
  const rubyRequireRelativeRegex = /require_relative\s+['"]([^'"]+)['"]/g;
  const rubyLoadRegex = /load\s+['"]([^'"]+)['"]/g;
  const rubyGemRegex = /gem\s+['"]([^'"]+)['"]/g; // Entri Gemfile

  // === Swift ===
  const swiftImportRegex = /import\s+([A-Za-z_]\w*)/g;
  const swiftFrameworkRegex = /@_exported\s+import\s+([A-Za-z_]\w*)/g;
  const swiftRelativeImportRegex = /import\s+"([^"]+)"/g; // Impor relatif

  // === Kotlin ===
  const kotlinImportRegex = /import\s+([a-z_.]+)/g;
  const kotlinImportAsRegex = /import\s+([a-z_.]+)\s+as\s+\w+/g;

  // === C# ===
  const csharpUsingRegex = /using\s+([A-Za-z_.]+);/g;
  const csharpExternAliasRegex = /extern\s+alias\s+(\w+);/g;

  // === PHP/Laravel ===
  const phpIncludeRegex = /(?:require|include)(?:_once)?\s*\(?\s*['"]([^'"]+)['"]/g;
  const bladeRegex = /@(?:extends|include)\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  const phpUseRegex = /use\s+([^;]+);/g;
  const phpViewRegex = /view\s*\(\s*['"]([^'"]+)['"]/g;
  
  // Pola Laravel/PHP terbaru
  const phpFacadeRegex = /(?:Config|DB|Cache|Auth|Route|View|Storage|Log|Mail|Notification|Queue|Storage|Artisan|Hash|Crypt|File|Schema|Validator|Request|Response|Session|Cookie)::/g;
  const phpRelationRegex = /(?:hasMany|belongsTo|hasOne|belongsToMany|morphTo|morphMany|morphToMany|morphedByMany)\s*\(\s*['"]?([^'",\s)]+)/g;
  const phpRouteRegex = /Route::(?:get|post|put|delete|patch|any|match|resource|apiResource)\s*\(\s*['"]([^'"]+)['"]\s*,\s*(?:\[([^\]]+)\]|['"]([^'"]+)['"])/g;
  
  // === Dart/Flutter ===
  const dartImportRegex = /import\s+['"]([^'"]+)['"]/g;
  const dartPartRegex = /(?:part|export)\s+['"]([^'"]+)['"]/g;
  
  // === Go ===
  const goImportRegex = /import\s+(?:\(\s*[\s\S]*?\)|['"]([^'"]+)['"])/g;
  const goMultiImportRegex = /import\s+\(([\s\S]*?)\)/g;
  
  // === Rust ===
  const rustUseRegex = /use\s+(?:crate::)?([^;]+);/g;
  const rustModRegex = /mod\s+(\w+);/g;
  
  // === Java ===
  const javaImportRegex = /import\s+(?:static\s+)?([^;]+);/g;
  
  // === C/C++ ===
  const cIncludeRegex = /#include\s+["<]([^">]+)[">]/g;

  // === HTML/Web ===
  const htmlAssetRegex = /<(?:link|script|img)[^>]+(?:href|src)\s*=\s*['"]([^'"]+)['"]/g;
  
  // === CSS/SCSS ===
  const cssImportRegex = /@import\s+['"]([^'"]+)['"]/g;
  const cssUrlRegex = /url\s*\(\s*['"]?([^'")]+)['"]?\s*\)/g;

  let match: RegExpExecArray | null;

  // === Process based on file type ===
  
  // JavaScript/TypeScript/JSX/TSX
  if (['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(fileExt)) {
    while ((match = jsTsImportRegex.exec(content)) !== null) {
      resolveAndAdd(match[1], fileDir, allFilesSet, imports);
    }
    while ((match = requireRegex.exec(content)) !== null) {
      resolveAndAdd(match[1], fileDir, allFilesSet, imports);
    }
    while ((match = dynamicImportRegex.exec(content)) !== null) {
      resolveAndAdd(match[1], fileDir, allFilesSet, imports);
    }
    
    // Enhanced JS/TS patterns
    while ((match = asyncComponentRegex.exec(content)) !== null) {
      resolveAndAdd(match[1], fileDir, allFilesSet, imports);
    }
    while ((match = lazyImportRegex.exec(content)) !== null) {
      resolveAndAdd(match[1], fileDir, allFilesSet, imports);
    }
    while ((match = webpackImportRegex.exec(content)) !== null) {
      resolveAndAdd(match[1], fileDir, allFilesSet, imports);
    }
  }
  
  // Python
  else if (fileExt === '.py') {
    while ((match = pyImportRegex.exec(content)) !== null) {
      const rawPath = match[1].replace(/\./g, '/');
      resolveAndAdd(rawPath, fileDir, allFilesSet, imports);
    }
    while ((match = pyDirectImportRegex.exec(content)) !== null) {
      const rawPath = match[1].replace(/\./g, '/');
      resolveAndAdd(rawPath, '', allFilesSet, imports);
    }
    
    // Enhanced Python patterns
    while ((match = pyRelativeImportRegex.exec(content)) !== null) {
      const rawPath = match[1].replace(/\./g, '/');
      resolveAndAdd(rawPath, fileDir, allFilesSet, imports);
    }
    while ((match = pyImportAsRegex.exec(content)) !== null) {
      const rawPath = match[1].replace(/\./g, '/');
      resolveAndAdd(rawPath, '', allFilesSet, imports);
    }
    while ((match = pyTryImportRegex.exec(content)) !== null) {
      const rawPath = match[1].replace(/\./g, '/');
      resolveAndAdd(rawPath, '', allFilesSet, imports);
    }
  }
  
  // PHP/Blade
  else if (fileExt === '.php' || filePath.endsWith('.blade.php')) {
    while ((match = phpIncludeRegex.exec(content)) !== null) {
      resolveAndAdd(match[1], fileDir, allFilesSet, imports);
    }
    while ((match = bladeRegex.exec(content)) !== null) {
      const rawPath = match[1].replace(/\./g, '/');
      resolveAndAdd(rawPath, fileDir, allFilesSet, imports);
    }
    while ((match = phpUseRegex.exec(content)) !== null) {
      let rawPath = match[1].replace(/\\/g, '/').trim();
      if (rawPath.startsWith('App/')) rawPath = 'app/' + rawPath.substring(4);
      resolveAndAdd(rawPath, '', allFilesSet, imports);
    }
    while ((match = phpViewRegex.exec(content)) !== null) {
      const rawPath = match[1].replace(/\./g, '/');
      resolveAndAdd(rawPath, fileDir, allFilesSet, imports);
    }
    
    // Enhanced Laravel patterns
    while ((match = phpFacadeRegex.exec(content)) !== null) {
      // Facades are service bindings - record but don't resolve to files
      // This helps identify high-usage files
    }
    while ((match = phpRelationRegex.exec(content)) !== null) {
      const modelName = match[1];
      // Try to find model file
      resolveAndAdd(`app/Models/${modelName}`, '', allFilesSet, imports);
      resolveAndAdd(`app/${modelName}`, '', allFilesSet, imports);
    }
    while ((match = phpRouteRegex.exec(content)) !== null) {
      // Route definitions point to controllers
      if (match[2]) { // Controller class format
        const controllerPath = match[2].replace(/Controller::class/, '').replace(/\\/g, '/');
        resolveAndAdd(`app/Http/Controllers/${controllerPath}Controller`, '', allFilesSet, imports);
      }
    }
  }
  
  // Dart/Flutter
  else if (fileExt === '.dart') {
    while ((match = dartImportRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (!importPath.startsWith('dart:') && !importPath.startsWith('package:')) {
        resolveAndAdd(importPath, fileDir, allFilesSet, imports);
      }
    }
    while ((match = dartPartRegex.exec(content)) !== null) {
      resolveAndAdd(match[1], fileDir, allFilesSet, imports);
    }
  }
  
  // Go
  else if (fileExt === '.go') {
    // Single import
    while ((match = goImportRegex.exec(content)) !== null) {
      if (match[1]) resolveAndAdd(match[1], fileDir, allFilesSet, imports);
    }
    // Multi-line import
    while ((match = goMultiImportRegex.exec(content)) !== null) {
      const imports = match[1].match(/['"]([^'"]+)['"]/g);
      if (imports) {
        imports.forEach(imp => {
          const clean = imp.replace(/['"]/g, '');
          resolveAndAdd(clean, fileDir, allFilesSet, imports);
        });
      }
    }
  }
  
  // Rust
  else if (fileExt === '.rs') {
    while ((match = rustUseRegex.exec(content)) !== null) {
      const usePath = match[1].replace(/::/g, '/').split(' ')[0];
      resolveAndAdd(usePath, fileDir, allFilesSet, imports);
    }
    while ((match = rustModRegex.exec(content)) !== null) {
      resolveAndAdd(match[1], fileDir, allFilesSet, imports);
    }
  }
  
  // Java
  else if (fileExt === '.java') {
    while ((match = javaImportRegex.exec(content)) !== null) {
      const javaPath = match[1].replace(/\./g, '/').trim();
      resolveAndAdd(javaPath, '', allFilesSet, imports);
    }
  }
  
  // C/C++
  else if (['.c', '.cpp', '.cc', '.h', '.hpp'].includes(fileExt)) {
    while ((match = cIncludeRegex.exec(content)) !== null) {
      resolveAndAdd(match[1], fileDir, allFilesSet, imports);
    }
  }
  
  // HTML
  else if (fileExt === '.html' || fileExt === '.vue') {
    while ((match = htmlAssetRegex.exec(content)) !== null) {
      resolveAndAdd(match[1], fileDir, allFilesSet, imports);
    }
  }
  
  // CSS/SCSS
  else if (['.css', '.scss', '.sass', '.less'].includes(fileExt)) {
    while ((match = cssImportRegex.exec(content)) !== null) {
      resolveAndAdd(match[1], fileDir, allFilesSet, imports);
    }
    while ((match = cssUrlRegex.exec(content)) !== null) {
      resolveAndAdd(match[1], fileDir, allFilesSet, imports);
    }
  }
  
  // Ruby
  else if (fileExt === '.rb') {
    while ((match = rubyRequireRegex.exec(content)) !== null) {
      resolveAndAdd(match[1], '', allFilesSet, imports);
    }
    while ((match = rubyRequireRelativeRegex.exec(content)) !== null) {
      resolveAndAdd(match[1], fileDir, allFilesSet, imports);
    }
    while ((match = rubyLoadRegex.exec(content)) !== null) {
      resolveAndAdd(match[1], fileDir, allFilesSet, imports);
    }
    while ((match = rubyGemRegex.exec(content)) !== null) {
      // Gem entries are external dependencies - track but don't resolve to local files
    }
  }
  
  // Swift
  else if (fileExt === '.swift') {
    while ((match = swiftImportRegex.exec(content)) !== null) {
      // Skip standard library imports
      if (!['Foundation', 'UIKit', 'AppKit', 'Combine', 'SwiftUI'].includes(match[1])) {
        resolveAndAdd(match[1], '', allFilesSet, imports);
      }
    }
    while ((match = swiftFrameworkRegex.exec(content)) !== null) {
      resolveAndAdd(match[1], '', allFilesSet, imports);
    }
    while ((match = swiftRelativeImportRegex.exec(content)) !== null) {
      resolveAndAdd(match[1], fileDir, allFilesSet, imports);
    }
  }
  
  // Kotlin
  else if (fileExt === '.kt' || fileExt === '.kts') {
    while ((match = kotlinImportRegex.exec(content)) !== null) {
      const kotlinPath = match[1].replace(/\./g, '/');
      resolveAndAdd(kotlinPath, '', allFilesSet, imports);
    }
    while ((match = kotlinImportAsRegex.exec(content)) !== null) {
      const kotlinPath = match[1].replace(/\./g, '/');
      resolveAndAdd(kotlinPath, '', allFilesSet, imports);
    }
  }
  
  // C#
  else if (fileExt === '.cs') {
    while ((match = csharpUsingRegex.exec(content)) !== null) {
      const csPath = match[1].replace(/\./g, '/');
      resolveAndAdd(csPath, '', allFilesSet, imports);
    }
    while ((match = csharpExternAliasRegex.exec(content)) !== null) {
      resolveAndAdd(match[1], '', allFilesSet, imports);
    }
  }

  return imports;
}

function resolveAndAdd(
  rawImport: string,
  fileDir: string,
  allFilesSet: Set<string>,
  importsList: string[]
) {
  // Skip external packages and URLs
  if (
    rawImport.startsWith('http://') ||
    rawImport.startsWith('https://') ||
    rawImport.startsWith('//') ||
    rawImport.startsWith('data:') ||
    rawImport.includes('node_modules') ||
    rawImport.includes('dart:') ||
    rawImport.includes('package:')
  ) {
    return;
  }

  // Strip known extensions from import path
  const strippedImport = rawImport.replace(/\.(js|jsx|ts|tsx|mjs|cjs|php|blade\.php|py|dart|go|rs|java|c|cpp|cc|h|hpp|css|scss|sass|less|html|vue|rb|swift|kt|kts|cs)$/, '');
  
  // Language-specific extensions to try
  const possibleExtensions = [
    '', 
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
    '.py', 
    '.php', '.blade.php',
    '.dart',
    '.go',
    '.rs',
    '.java', '.kt', '.kts',
    '.c', '.cpp', '.cc', '.h', '.hpp',
    '.cs',
    '.rb',
    '.swift',
    '.css', '.scss', '.sass', '.less',
    '.html', '.vue',
    '.json',
    '/index.ts', '/index.js', '/index.tsx', '/index.jsx',
    '/index.php', '/index.html',
    '/mod.rs', // Rust convention
    '/lib.dart', // Dart convention
    '/index.rb', // Ruby convention
  ];
  
  // Try resolving relative to current file
  const resolvedRelative = path.normalize(path.join(fileDir, strippedImport)).replace(/\\/g, '/');
  for (const ext of possibleExtensions) {
    const candidate = resolvedRelative + ext;
    if (allFilesSet.has(candidate)) {
      if (!importsList.includes(candidate)) importsList.push(candidate);
      return;
    }
  }

  // Try resolving relative to project root
  const rootCandidates = [
    path.normalize(strippedImport).replace(/\\/g, '/'),
    path.normalize(path.join('resources/views', strippedImport)).replace(/\\/g, '/'),
    path.normalize(path.join('resources', strippedImport)).replace(/\\/g, '/'),
    path.normalize(path.join('public', strippedImport)).replace(/\\/g, '/'),
    path.normalize(path.join('lib', strippedImport)).replace(/\\/g, '/'), // Dart
    path.normalize(path.join('src', strippedImport)).replace(/\\/g, '/'),
  ];

  for (const base of rootCandidates) {
    for (const ext of possibleExtensions) {
      const candidate = base + ext;
      if (allFilesSet.has(candidate)) {
        if (!importsList.includes(candidate)) importsList.push(candidate);
        return;
      }
    }
  }

  // Also try the original (non-stripped) path
  const resolvedOriginal = path.normalize(path.join(fileDir, rawImport)).replace(/\\/g, '/');
  if (allFilesSet.has(resolvedOriginal) && !importsList.includes(resolvedOriginal)) {
    importsList.push(resolvedOriginal);
  }
}
