import glob from 'fast-glob';
import path from 'path';

export async function crawlDirectory(projectRoot: string): Promise<string[]> {
  const ignorePatterns = [
    '**/node_modules/**',
    '**/vendor/**',
    '**/public/**',
    '**/storage/**',
    '**/venv/**',
    '**/.idea/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/.spidermap/**',
    '**/coverage/**',
    '**/*.min.js',
    '**/*.bundle.js',
    '**/target/**', // Rust
    '**/bin/**',
    '**/obj/**', // C#
    '**/.dart_tool/**', // Dart
    '**/pkg/**', // Go
  ];

  // Dukungan komprehensif untuk berbagai bahasa pemrograman
  const extensions = [
    // Ekosistem JavaScript/TypeScript
    'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
    // Python
    'py', 'pyw', 'pyx',
    // PHP
    'php', 'blade.php',
    // Dart/Flutter
    'dart',
    // Go
    'go',
    // Rust
    'rs',
    // Java/Kotlin
    'java', 'kt', 'kts',
    // C/C++
    'c', 'cpp', 'cc', 'cxx', 'h', 'hpp', 'hxx',
    // C#
    'cs',
    // Ruby
    'rb',
    // Swift
    'swift',
    // Gaya Tampilan (Styles)
    'css', 'scss', 'sass', 'less', 'styl',
    // Markup/Konfigurasi
    'json', 'yaml', 'yml', 'toml', 'xml',
    'html', 'vue', 'svelte',
    // Dokumentasi
    'md', 'mdx', 'rst', 'adoc',
  ];

  const files = await glob(`**/*.{${extensions.join(',')}}`, {
    cwd: projectRoot,
    ignore: ignorePatterns,
    onlyFiles: true,
    caseSensitiveMatch: false,
  });

  return files.map((file) => file.replace(/\\/g, '/'));
}
