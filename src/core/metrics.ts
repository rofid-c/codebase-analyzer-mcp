import fs from 'fs-extra';
import path from 'path';
import { Node } from './types.js';

// ============================================
// ANTARMUKA METRIK KODE (CODE METRICS INTERFACE)
// ============================================

export interface CodeMetrics {
  filePath: string;
  linesOfCode: number;
  complexity: number;
  testCoverage: 'covered' | 'uncovered' | 'partial' | 'unknown';
  hasTest: boolean;
  testFile?: string;
  cyclomaticComplexity: number;
  functionCount: number;
  classCount: number;
  commentLines: number;
  blankLines: number;
  codeToCommentRatio: number;
}

export interface ChangeData {
  filePath: string;
  changed: boolean;
  lastModified: number;
  changeType?: 'added' | 'modified' | 'deleted';
  sizeDiff?: number;
  linesDiff?: number;
}

// ============================================
// KALKULATOR KOMPLEKSITAS (COMPLEXITY CALCULATOR)
// ============================================

export function calculateComplexity(content: string, fileExt: string): number {
  let complexity = 1; // Kompleksitas dasar (base)

  const fileExtLower = fileExt.toLowerCase();

  // Hitung titik keputusan (if, else, switch, case, catch, dll)
  const decisions = (content.match(/\b(if|else|for|while|do|switch|case|catch|finally|throw)\b/gi) || []).length;
  complexity += Math.floor(decisions / 2);

  // Hitung operator logika (&&, ||, ?:, dll)
  const operators = (content.match(/(\&\&|\|\||[?:])/g) || []).length;
  complexity += Math.floor(operators / 3);

  // Hitung perulangan (loops)
  const loops = (content.match(/\b(for|while|do|forEach|map|filter|reduce)\b/gi) || []).length;
  complexity += Math.floor(loops / 2);

  // Penyesuaian khusus bahasa pemrograman
  if (['.ts', '.tsx', '.js', '.jsx'].includes(fileExtLower)) {
    // Callback bersarang akan meningkatkan kompleksitas
    const callbacks = (content.match(/(\(\)\s*=>|function\s*\()/g) || []).length;
    complexity += Math.floor(callbacks / 3);

    // Operator Ternary
    const ternary = (content.match(/\?.*:/g) || []).length;
    complexity += ternary;
  } else if (fileExtLower === '.py') {
    // Sintaks comprehension Python
    const comprehensions = (content.match(/\[.*for.*in.*\]/g) || []).length;
    complexity += comprehensions;

    // Penanganan eksepsi (Exception handling)
    const exceptions = (content.match(/except\s+/gi) || []).length;
    complexity += exceptions;
  } else if (['.php', '.blade.php'].includes(fileExtLower)) {
    // Struktur bersarang PHP
    const nested = (content.match(/\{.*\{/g) || []).length;
    complexity += Math.floor(nested / 2);
  }

  return Math.max(1, Math.min(complexity, 50)); // Batasi maksimal 50
}

// ============================================
// KALKULATOR BARIS KODE (LINES OF CODE CALCULATOR)
// ============================================

export function calculateLOC(content: string): { total: number; code: number; comment: number; blank: number } {
  const lines = content.split('\n');
  let code = 0;
  let comment = 0;
  let blank = 0;
  let inBlockComment = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Periksa baris kosong
    if (trimmed.length === 0) {
      blank++;
      continue;
    }

    // Periksa komentar blok (block comments)
    if (trimmed.startsWith('/*') || trimmed.startsWith('/**')) {
      inBlockComment = true;
      comment++;
      if (trimmed.endsWith('*/')) {
        inBlockComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      comment++;
      if (trimmed.endsWith('*/')) {
        inBlockComment = false;
      }
      continue;
    }

    // Periksa komentar baris (line comments)
    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('--')) {
      comment++;
      continue;
    }

    // Baris kode biasa
    code++;
  }

  return {
    total: lines.length,
    code,
    comment,
    blank,
  };
}

// ============================================
// PENGHITUNG FUNGSI & KELAS (FUNCTION & CLASS COUNTER)
// ============================================

export function countFunctionsAndClasses(content: string, fileExt: string): { functions: number; classes: number } {
  let functions = 0;
  let classes = 0;

  const fileExtLower = fileExt.toLowerCase();

  if (['.ts', '.tsx', '.js', '.jsx'].includes(fileExtLower)) {
    // Deklarasi fungsi (Function declarations)
    functions += (content.match(/\b(?:function|const|let|var)\s+\w+\s*=\s*(?:async\s*)?\(/g) || []).length;
    functions += (content.match(/\b(?:function)\s+\w+\s*\(/g) || []).length;
    functions += (content.match(/\w+\s*\(\s*\)\s*=>\s*{/g) || []).length; // Fungsi Arrow (Arrow functions)

    // Definisi kelas (Class definitions)
    classes += (content.match(/\bclass\s+\w+/g) || []).length;
  } else if (fileExtLower === '.py') {
    // Fungsi Python
    functions += (content.match(/^\s*def\s+\w+/gm) || []).length;

    // Kelas Python
    classes += (content.match(/^\s*class\s+\w+/gm) || []).length;
  } else if (['.php', '.blade.php'].includes(fileExtLower)) {
    // Fungsi PHP
    functions += (content.match(/\bfunction\s+\w+\s*\(/g) || []).length;

    // Kelas PHP
    classes += (content.match(/\bclass\s+\w+/g) || []).length;
  } else if (fileExtLower === '.go') {
    // Fungsi Go
    functions += (content.match(/\bfunc\s+\(?\w*\)?\s+\w+\s*\(/g) || []).length;

    // Struct Go (mirip dengan kelas)
    classes += (content.match(/\btype\s+\w+\s+struct/g) || []).length;
  } else if (fileExtLower === '.rs') {
    // Fungsi Rust
    functions += (content.match(/\bfn\s+\w+\s*\(/g) || []).length;

    // Struct/Enum/Trait Rust
    classes += (content.match(/\b(?:struct|enum|trait|impl)\s+\w+/g) || []).length;
  } else if (fileExtLower === '.java') {
    // Metode Java (hitungan sederhana)
    functions += (content.match(/\b(?:public|private|protected)?\s+\w+\s+\w+\s*\(/g) || []).length;

    // Kelas Java
    classes += (content.match(/\bclass\s+\w+/g) || []).length;
  } else if (fileExtLower === '.rb') {
    // Metode Ruby
    functions += (content.match(/^\s*def\s+\w+/gm) || []).length;

    // Kelas Ruby
    classes += (content.match(/^\s*class\s+\w+/gm) || []).length;
  }

  return { functions, classes };
}

// ============================================
// DETEKSI FILE PENGUJIAN (TEST FILE DETECTION)
// ============================================

export function detectTestFile(filePath: string): boolean {
  const fileName = path.basename(filePath).toLowerCase();
  const fileDir = path.dirname(filePath).toLowerCase();

  // Pola pengujian umum (Common test patterns)
  const testPatterns = [
    /\.test\./,       // .test.ts, .test.js
    /\.spec\./,       // .spec.ts, .spec.js
    /_test\./,        // _test.go
    /test_/,          // test_something.py
    /^test/,          // test.ts, test.go
    /_test$/,         // something_test
    /\.test$/,        // something.test
  ];

  return testPatterns.some(pattern => pattern.test(fileName)) ||
    fileDir.includes('test') ||
    fileDir.includes('spec') ||
    fileDir.includes('__tests__');
}

export function findTestFile(sourceFile: string, allFiles: Set<string>): string | undefined {
  const dirName = path.dirname(sourceFile);
  const baseName = path.basename(sourceFile);
  const nameWithoutExt = baseName.replace(/\.[^.]+$/, '');
  const extension = path.extname(sourceFile);

  // Pola file pengujian umum
  const testFilePatterns = [
    `${dirName}/${nameWithoutExt}.test${extension}`,
    `${dirName}/${nameWithoutExt}.spec${extension}`,
    `${dirName}/__tests__/${nameWithoutExt}${extension}`,
    `${dirName}/__tests__/${nameWithoutExt}.test${extension}`,
    `${dirName}/test_${nameWithoutExt}${extension}`,
    `${dirName}/${nameWithoutExt}_test${extension}`,
  ];

  for (const pattern of testFilePatterns) {
    if (allFiles.has(pattern)) {
      return pattern;
    }
  }

  return undefined;
}

// ============================================
// HITUNG METRIK UNTUK FILE (CALCULATE METRICS)
// ============================================

export async function calculateFileMetrics(
  filePath: string,
  projectRoot: string,
  allFiles: Set<string>,
  node?: Node
): Promise<CodeMetrics> {
  const fullPath = path.join(projectRoot, filePath);
  let content = '';

  try {
    content = await fs.readFile(fullPath, 'utf-8');
  } catch {
    return {
      filePath,
      linesOfCode: 0,
      complexity: 0,
      testCoverage: 'unknown',
      hasTest: false,
      cyclomaticComplexity: 0,
      functionCount: 0,
      classCount: 0,
      commentLines: 0,
      blankLines: 0,
      codeToCommentRatio: 0,
    };
  }

  const ext = path.extname(filePath);
  const loc = calculateLOC(content);
  const complexity = calculateComplexity(content, ext);
  const { functions, classes } = countFunctionsAndClasses(content, ext);
  const isTest = detectTestFile(filePath);
  const testFile = isTest ? undefined : findTestFile(filePath, allFiles);
  const hasTest = isTest || testFile !== undefined;

  const codeToCommentRatio = loc.code > 0 ? Math.round((loc.comment / loc.code) * 100) : 0;

  // Tentukan cakupan pengujian (test coverage)
  let testCoverage: 'covered' | 'uncovered' | 'partial' | 'unknown' = 'unknown';
  if (isTest) {
    testCoverage = 'covered';
  } else if (hasTest && testFile) {
    testCoverage = 'covered';
  } else if (classes > 0 || functions > 5) {
    testCoverage = 'uncovered'; // Kemungkinan tidak ter-cover jika bukan file test
  } else if (functions > 0) {
    testCoverage = 'partial';
  }

  return {
    filePath,
    linesOfCode: loc.code,
    complexity,
    testCoverage,
    hasTest,
    testFile,
    cyclomaticComplexity: complexity,
    functionCount: functions,
    classCount: classes,
    commentLines: loc.comment,
    blankLines: loc.blank,
    codeToCommentRatio,
  };
}

// ============================================
// PELACAKAN PERUBAHAN (CHANGE TRACKING)
// ============================================

export interface ChangeLog {
  timestamp: number;
  previousHash: Map<string, string>; // pathFile -> hash (nilai sebelumnya)
  currentHash: Map<string, string>;
  changes: ChangeData[];
}

export async function hashFile(filePath: string, projectRoot: string): Promise<string> {
  const crypto = await import('crypto');
  const fullPath = path.join(projectRoot, filePath);

  try {
    const content = await fs.readFile(fullPath, 'utf-8');
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch {
    return '';
  }
}

export async function detectChanges(
  currentFiles: Set<string>,
  projectRoot: string,
  previousHashes?: Map<string, string>
): Promise<ChangeData[]> {
  const changes: ChangeData[] = [];
  const currentHashes = new Map<string, string>();

  for (const file of currentFiles) {
    const hash = await hashFile(file, projectRoot);
    currentHashes.set(file, hash);

    if (!previousHashes) {
      continue;
    }

    const previousHash = previousHashes.get(file);

    if (!previousHash) {
      // File baru
      changes.push({
        filePath: file,
        changed: true,
        changeType: 'added',
        lastModified: Date.now(),
      });
    } else if (previousHash !== hash) {
      // File yang dimodifikasi
      changes.push({
        filePath: file,
        changed: true,
        changeType: 'modified',
        lastModified: Date.now(),
      });
    }
  }

  // Deteksi file yang dihapus
  if (previousHashes) {
    for (const [file] of previousHashes) {
      if (!currentFiles.has(file)) {
        changes.push({
          filePath: file,
          changed: true,
          changeType: 'deleted',
          lastModified: Date.now(),
        });
      }
    }
  }

  return changes;
}

export async function loadChangeLog(projectRoot: string): Promise<ChangeLog | null> {
  try {
    const changeLogPath = path.join(projectRoot, '.spidermap', 'changelog.json');
    const data = await fs.readFile(changeLogPath, 'utf-8');
    const parsed = JSON.parse(data);

    return {
      timestamp: parsed.timestamp,
      previousHash: new Map(parsed.previousHash),
      currentHash: new Map(parsed.currentHash),
      changes: parsed.changes,
    };
  } catch {
    return null;
  }
}

export async function saveChangeLog(
  projectRoot: string,
  changeLog: ChangeLog
): Promise<void> {
  const changeLogPath = path.join(projectRoot, '.spidermap', 'changelog.json');

  await fs.ensureDir(path.dirname(changeLogPath));
  await fs.writeFile(
    changeLogPath,
    JSON.stringify({
      timestamp: changeLog.timestamp,
      previousHash: Array.from(changeLog.previousHash.entries()),
      currentHash: Array.from(changeLog.currentHash.entries()),
      changes: changeLog.changes,
    }, null, 2)
  );
}
