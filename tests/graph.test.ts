import { describe, it, expect } from 'vitest';
import { buildGraph, simulateImpact } from '../src/core/graph.js';

// ============================================
// TEST: buildGraph
// ============================================

describe('buildGraph', () => {
  it('creates nodes with correct metrics', () => {
    const files = ['src/a.ts', 'src/b.ts', 'src/c.ts'];
    const dependencies = [
      { source: 'src/a.ts', targets: ['src/b.ts'] },
      { source: 'src/c.ts', targets: ['src/b.ts'] },
    ];

    const graph = buildGraph(files, dependencies);

    expect(graph.nodes).toHaveLength(3);
    expect(graph.links).toHaveLength(2);

    // b.ts diimpor oleh 2 file (a.ts dan c.ts)
    const nodeB = graph.nodes.find(n => n.id === 'src/b.ts')!;
    expect(nodeB.importedByCount).toBe(2);
    expect(nodeB.importsCount).toBe(0);

    // a.ts mengimpor 1 file, tidak diimpor siapapun
    const nodeA = graph.nodes.find(n => n.id === 'src/a.ts')!;
    expect(nodeA.importsCount).toBe(1);
    expect(nodeA.importedByCount).toBe(0);
  });

  it('classifies orphan nodes correctly', () => {
    const files = ['src/a.ts', 'src/lonely.ts'];
    const dependencies = [
      { source: 'src/a.ts', targets: [] },
    ];

    const graph = buildGraph(files, dependencies);
    const lonely = graph.nodes.find(n => n.id === 'src/lonely.ts')!;

    expect(lonely.isOrphan).toBe(true);
    expect(lonely.role).toBe('orphan');
  });

  it('identifies entry points', () => {
    const files = ['src/main.ts', 'src/utils.ts'];
    const dependencies = [
      { source: 'src/main.ts', targets: ['src/utils.ts'] },
    ];

    const graph = buildGraph(files, dependencies);
    const main = graph.nodes.find(n => n.id === 'src/main.ts')!;

    expect(main.isEntryPoint).toBe(true);
    expect(main.role).toBe('entry');
  });

  it('classifies risk levels by fan-in', () => {
    const files = ['src/core.ts', ...Array.from({ length: 12 }, (_, i) => `src/dep${i}.ts`)];
    const dependencies = files.slice(1).map(f => ({
      source: f,
      targets: ['src/core.ts'],
    }));

    const graph = buildGraph(files, dependencies);
    const core = graph.nodes.find(n => n.id === 'src/core.ts')!;

    expect(core.riskLevel).toBe('critical'); // importedByCount > 10
    expect(core.isHotspot).toBe(true); // importedByCount > 5
  });

  it('assigns correct file categories', () => {
    const files = [
      'src/app.ts',           // core
      'src/App.vue',          // view
      'src/style.css',        // style
      'package.json',         // config
      'README.md',            // doc
      'src/app.test.ts',      // test
    ];

    const graph = buildGraph(files, []);

    const check = (id: string, expectedCat: string) => {
      const node = graph.nodes.find(n => n.id === id)!;
      expect(node.fileCategory).toBe(expectedCat);
    };

    check('src/app.ts', 'core');
    check('src/style.css', 'style');
    check('package.json', 'config');
    check('README.md', 'doc');
  });
});

// ============================================
// TEST: simulateImpact (BFS)
// ============================================

describe('simulateImpact', () => {
  it('finds directly affected files', () => {
    const files = ['src/a.ts', 'src/b.ts', 'src/c.ts'];
    const dependencies = [
      { source: 'src/b.ts', targets: ['src/a.ts'] },
      { source: 'src/c.ts', targets: ['src/a.ts'] },
    ];

    const graph = buildGraph(files, dependencies);
    const impact = simulateImpact(graph, 'src/a.ts');

    expect(impact.directlyAffected).toContain('src/b.ts');
    expect(impact.directlyAffected).toContain('src/c.ts');
    expect(impact.totalAffectedCount).toBe(2);
  });

  it('finds indirectly affected files via BFS', () => {
    // Chain: d.ts → c.ts → b.ts → a.ts
    const files = ['src/a.ts', 'src/b.ts', 'src/c.ts', 'src/d.ts'];
    const dependencies = [
      { source: 'src/b.ts', targets: ['src/a.ts'] },
      { source: 'src/c.ts', targets: ['src/b.ts'] },
      { source: 'src/d.ts', targets: ['src/c.ts'] },
    ];

    const graph = buildGraph(files, dependencies);
    const impact = simulateImpact(graph, 'src/a.ts');

    // Direct: b.ts (imports a.ts)
    expect(impact.directlyAffected).toContain('src/b.ts');
    // Indirect: c.ts (imports b.ts), d.ts (imports c.ts)
    expect(impact.indirectlyAffected).toContain('src/c.ts');
    expect(impact.indirectlyAffected).toContain('src/d.ts');
    expect(impact.totalAffectedCount).toBe(3);
  });

  it('handles orphan files with no impact', () => {
    const files = ['src/a.ts', 'src/orphan.ts'];
    const graph = buildGraph(files, []);
    const impact = simulateImpact(graph, 'src/orphan.ts');

    expect(impact.directlyAffected).toHaveLength(0);
    expect(impact.indirectlyAffected).toHaveLength(0);
    expect(impact.totalAffectedCount).toBe(0);
  });

  it('does not revisit nodes in cycles', () => {
    // Circular: a → b → c → a
    const files = ['src/a.ts', 'src/b.ts', 'src/c.ts'];
    const dependencies = [
      { source: 'src/a.ts', targets: ['src/b.ts'] },
      { source: 'src/b.ts', targets: ['src/c.ts'] },
      { source: 'src/c.ts', targets: ['src/a.ts'] },
    ];

    const graph = buildGraph(files, dependencies);
    const impact = simulateImpact(graph, 'src/a.ts');

    // Tidak boleh infinite loop — BFS harus handle visited
    expect(impact.totalAffectedCount).toBeLessThanOrEqual(3);
  });
});
