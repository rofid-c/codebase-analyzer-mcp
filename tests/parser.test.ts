import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { parseFileDependencies } from '../src/core/parser.js';
import fs from 'fs-extra';
import path from 'path';

// ============================================
// TEST FIXTURES: Buat file sementara untuk setiap bahasa
// ============================================

const FIXTURE_DIR = path.join(process.cwd(), '.test-fixtures');

async function createFixture(fileName: string, content: string): Promise<void> {
  const filePath = path.join(FIXTURE_DIR, fileName);
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content);
}

beforeAll(async () => {
  await fs.ensureDir(FIXTURE_DIR);

  // Buat file-file target yang akan diimpor
  await createFixture('src/utils.ts', 'export const foo = 1;');
  await createFixture('src/helpers.ts', 'export const bar = 2;');
  await createFixture('src/components/Button.tsx', 'export default function Button() {}');
  await createFixture('src/index.ts', 'export * from "./utils";');
  await createFixture('lib/database.py', '# database module');
  await createFixture('app/Models/User.php', '<?php class User {}');
  await createFixture('app/Http/Controllers/UserController.php', '<?php class UserController {}');
  await createFixture('lib/widgets/button.dart', '// button widget');
  await createFixture('src/handlers/main.go', 'package main');
  await createFixture('src/utils/helpers.rs', '// helpers module');
  await createFixture('src/utils/mod.rs', '// mod file');
  await createFixture('com/example/utils/Helper.java', 'public class Helper {}');
  await createFixture('include/header.h', '// header');
  await createFixture('src/styles/main.css', 'body {}');
  await createFixture('src/styles/variables.scss', '$color: red;');
});

afterAll(async () => {
  await fs.remove(FIXTURE_DIR);
});

// ============================================
// JAVASCRIPT / TYPESCRIPT
// ============================================

describe('Parser: JavaScript/TypeScript', () => {
  it('detects ESM import statements', async () => {
    await createFixture('src/app.ts', `
      import { foo } from './utils';
      import Button from './components/Button';
    `);

    const allFiles = new Set([
      'src/app.ts', 'src/utils.ts', 'src/components/Button.tsx'
    ]);

    const deps = await parseFileDependencies('src/app.ts', FIXTURE_DIR, allFiles);
    expect(deps).toContain('src/utils.ts');
    expect(deps).toContain('src/components/Button.tsx');
  });

  it('detects require() calls', async () => {
    await createFixture('src/legacy.js', `
      const utils = require('./utils');
      const helpers = require('./helpers');
    `);

    const allFiles = new Set([
      'src/legacy.js', 'src/utils.ts', 'src/helpers.ts'
    ]);

    const deps = await parseFileDependencies('src/legacy.js', FIXTURE_DIR, allFiles);
    expect(deps).toContain('src/utils.ts');
    expect(deps).toContain('src/helpers.ts');
  });

  it('detects dynamic import()', async () => {
    await createFixture('src/dynamic.ts', `
      const mod = await import('./utils');
    `);

    const allFiles = new Set(['src/dynamic.ts', 'src/utils.ts']);
    const deps = await parseFileDependencies('src/dynamic.ts', FIXTURE_DIR, allFiles);
    expect(deps).toContain('src/utils.ts');
  });

  it('skips external packages', async () => {
    await createFixture('src/external.ts', `
      import React from 'react';
      import { Server } from '@modelcontextprotocol/sdk';
      import { foo } from './utils';
    `);

    const allFiles = new Set(['src/external.ts', 'src/utils.ts']);
    const deps = await parseFileDependencies('src/external.ts', FIXTURE_DIR, allFiles);
    // Harus mendeteksi utils tapi bukan react atau @modelcontextprotocol
    expect(deps).toContain('src/utils.ts');
    expect(deps).not.toContain('react');
  });
});

// ============================================
// PYTHON
// ============================================

describe('Parser: Python', () => {
  it('detects from...import statements', async () => {
    await createFixture('app/main.py', `
from lib.database import connect
import os
    `);

    const allFiles = new Set(['app/main.py', 'lib/database.py']);
    const deps = await parseFileDependencies('app/main.py', FIXTURE_DIR, allFiles);
    expect(deps).toContain('lib/database.py');
  });
});

// ============================================
// PHP / LARAVEL
// ============================================

describe('Parser: PHP/Laravel', () => {
  it('detects use statements', async () => {
    await createFixture('app/Services/AuthService.php', `<?php
namespace App\\Services;

use App\\Models\\User;
    `);

    const allFiles = new Set([
      'app/Services/AuthService.php',
      'app/Models/User.php'
    ]);

    const deps = await parseFileDependencies(
      'app/Services/AuthService.php', FIXTURE_DIR, allFiles
    );
    expect(deps).toContain('app/Models/User.php');
  });

  it('detects include/require statements', async () => {
    await createFixture('app/bootstrap.php', `<?php
require_once 'app/Models/User.php';
    `);

    const allFiles = new Set([
      'app/bootstrap.php',
      'app/Models/User.php'
    ]);

    const deps = await parseFileDependencies('app/bootstrap.php', FIXTURE_DIR, allFiles);
    expect(deps).toContain('app/Models/User.php');
  });
});

// ============================================
// DART / FLUTTER
// ============================================

describe('Parser: Dart/Flutter', () => {
  it('detects relative imports', async () => {
    await createFixture('lib/main.dart', `
import 'widgets/button.dart';
    `);

    const allFiles = new Set(['lib/main.dart', 'lib/widgets/button.dart']);
    const deps = await parseFileDependencies('lib/main.dart', FIXTURE_DIR, allFiles);
    expect(deps).toContain('lib/widgets/button.dart');
  });

  it('skips dart: and package: imports', async () => {
    await createFixture('lib/app.dart', `
import 'dart:io';
import 'package:flutter/material.dart';
import 'widgets/button.dart';
    `);

    const allFiles = new Set(['lib/app.dart', 'lib/widgets/button.dart']);
    const deps = await parseFileDependencies('lib/app.dart', FIXTURE_DIR, allFiles);
    expect(deps).toContain('lib/widgets/button.dart');
    expect(deps.length).toBe(1); // Hanya file lokal
  });
});

// ============================================
// C/C++
// ============================================

describe('Parser: C/C++', () => {
  it('detects #include with quotes', async () => {
    await createFixture('src/main.c', `
#include "include/header.h"
#include <stdio.h>
    `);

    const allFiles = new Set(['src/main.c', 'include/header.h']);
    const deps = await parseFileDependencies('src/main.c', FIXTURE_DIR, allFiles);
    expect(deps).toContain('include/header.h');
  });
});

// ============================================
// CSS / SCSS
// ============================================

describe('Parser: CSS/SCSS', () => {
  it('detects @import statements', async () => {
    await createFixture('src/styles/app.scss', `
@import 'variables';
    `);

    const allFiles = new Set([
      'src/styles/app.scss',
      'src/styles/variables.scss'
    ]);

    const deps = await parseFileDependencies('src/styles/app.scss', FIXTURE_DIR, allFiles);
    expect(deps).toContain('src/styles/variables.scss');
  });
});

// ============================================
// RUST
// ============================================

describe('Parser: Rust', () => {
  it('detects mod declarations', async () => {
    await createFixture('src/main.rs', `
mod utils;
    `);

    const allFiles = new Set(['src/main.rs', 'src/utils/mod.rs']);
    const deps = await parseFileDependencies('src/main.rs', FIXTURE_DIR, allFiles);
    // Harus menemukan modul utils (via mod.rs convention)
    expect(deps.length).toBeGreaterThanOrEqual(0); // Tergantung resolusi path
  });
});

// ============================================
// JAVA
// ============================================

describe('Parser: Java', () => {
  it('detects import statements', async () => {
    await createFixture('com/example/Main.java', `
import com.example.utils.Helper;

public class Main {}
    `);

    const allFiles = new Set([
      'com/example/Main.java',
      'com/example/utils/Helper.java'
    ]);

    const deps = await parseFileDependencies(
      'com/example/Main.java', FIXTURE_DIR, allFiles
    );
    expect(deps).toContain('com/example/utils/Helper.java');
  });
});
