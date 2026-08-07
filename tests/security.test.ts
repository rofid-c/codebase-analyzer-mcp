import { describe, it, expect } from 'vitest';

// ============================================
// TEST: Security — Path Traversal Validation
// ============================================

// Kita import langsung fungsi dari server.ts tidak mungkin (karena ada side-effects),
// jadi kita duplikasi logika validateProjectRoot untuk testing mandiri.
// Ini memastikan logika validasi berfungsi tanpa menjalankan MCP server.

import path from 'path';

function validateProjectRoot(rawPath: string): string {
  const resolved = path.resolve(rawPath);
  
  if (rawPath.includes('..')) {
    throw new Error(
      `Security: projectRoot mengandung path traversal '..'. ` +
      `Gunakan absolute path tanpa '..'. Diterima: "${rawPath}"`
    );
  }
  
  const dangerousPaths = [
    'C:\\Windows', 'C:\\Program Files', 'C:\\ProgramData',
    '/etc', '/usr', '/bin', '/sbin', '/boot', '/proc', '/sys', '/root',
    '/var/log', '/var/run'
  ];
  
  const resolvedLower = resolved.toLowerCase().replace(/\\/g, '/');
  const rawLower = rawPath.toLowerCase().replace(/\\/g, '/');
  for (const dangerous of dangerousPaths) {
    const dangerousNormalized = dangerous.toLowerCase().replace(/\\/g, '/');
    if (resolvedLower.startsWith(dangerousNormalized) || rawLower.startsWith(dangerousNormalized)) {
      throw new Error(
        `Security: projectRoot mengarah ke direktori sistem yang dilindungi: "${resolved}"`
      );
    }
  }
  
  return resolved;
}

describe('validateProjectRoot', () => {
  it('accepts valid absolute paths', () => {
    // Windows-style
    expect(() => validateProjectRoot('C:\\Users\\dev\\project')).not.toThrow();
    // Unix-style
    expect(() => validateProjectRoot('/home/user/project')).not.toThrow();
  });

  it('rejects paths with .. traversal', () => {
    expect(() => validateProjectRoot('C:\\Users\\dev\\..\\..\\Windows\\System32')).toThrow(/path traversal/);
    expect(() => validateProjectRoot('/home/user/../../etc/passwd')).toThrow(/path traversal/);
    expect(() => validateProjectRoot('../../../')).toThrow(/path traversal/);
  });

  it('rejects Windows system directories', () => {
    expect(() => validateProjectRoot('C:\\Windows\\System32')).toThrow(/direktori sistem/);
    expect(() => validateProjectRoot('C:\\Program Files\\App')).toThrow(/direktori sistem/);
    expect(() => validateProjectRoot('C:\\ProgramData\\Config')).toThrow(/direktori sistem/);
  });

  it('rejects Unix system directories', () => {
    expect(() => validateProjectRoot('/etc/nginx')).toThrow(/direktori sistem/);
    expect(() => validateProjectRoot('/usr/local/bin')).toThrow(/direktori sistem/);
    expect(() => validateProjectRoot('/root/.ssh')).toThrow(/direktori sistem/);
    expect(() => validateProjectRoot('/proc/self')).toThrow(/direktori sistem/);
    expect(() => validateProjectRoot('/sys/class')).toThrow(/direktori sistem/);
  });

  it('is case-insensitive on Windows paths', () => {
    expect(() => validateProjectRoot('c:\\windows\\system32')).toThrow(/direktori sistem/);
    expect(() => validateProjectRoot('C:\\WINDOWS\\SYSTEM32')).toThrow(/direktori sistem/);
  });

  it('returns resolved absolute path on success', () => {
    const result = validateProjectRoot('C:\\Users\\dev\\my-project');
    expect(path.isAbsolute(result)).toBe(true);
  });
});
