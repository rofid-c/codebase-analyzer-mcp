import type { GraphData, Node } from '../core/types.js';

declare const ForceGraph3D: any;
declare const ForceGraph: any;
declare const THREE: any;

// ─── GRAFIK DUMMY (DATA PALSU) ────────────────────────────────────────────────
function generateDummyGraph(): GraphData {
  const nodes: Node[] = [];
  const links: { source: string; target: string }[] = [];

  nodes.push({ id: 'src/main.ts', name: 'main.ts', ext: '.ts', importsCount: 5, importedByCount: 0, isOrphan: false, isEntryPoint: true, isHotspot: false });
  nodes.push({ id: 'src/app.ts', name: 'app.ts', ext: '.ts', importsCount: 4, importedByCount: 1, isOrphan: false, isEntryPoint: false, isHotspot: false });

  const services = ['auth', 'api', 'logger', 'db', 'cache'];
  services.forEach(s => {
    nodes.push({ id: `src/services/${s}.ts`, name: `${s}.ts`, ext: '.ts', importsCount: 2, importedByCount: 0, isOrphan: false, isEntryPoint: false, isHotspot: false });
  });

  nodes.push({ id: 'src/utils/helpers.ts', name: 'helpers.ts', ext: '.ts', importsCount: 0, importedByCount: 9, isOrphan: false, isEntryPoint: false, isHotspot: true });
  nodes.push({ id: 'src/utils/validators.ts', name: 'validators.ts', ext: '.ts', importsCount: 1, importedByCount: 7, isOrphan: false, isEntryPoint: false, isHotspot: true });
  nodes.push({ id: 'src/types/index.ts', name: 'index.ts', ext: '.ts', importsCount: 0, importedByCount: 12, isOrphan: false, isEntryPoint: false, isHotspot: true });

  for (let i = 0; i < 12; i++) {
    nodes.push({ id: `src/components/Widget${i}.tsx`, name: `Widget${i}.tsx`, ext: '.tsx', importsCount: 3, importedByCount: 1, isOrphan: false, isEntryPoint: false, isHotspot: false });
  }

  nodes.push({ id: 'src/legacy/old.ts', name: 'old.ts', ext: '.ts', importsCount: 0, importedByCount: 0, isOrphan: true, isEntryPoint: false, isHotspot: false });
  nodes.push({ id: 'src/legacy/deprecated.ts', name: 'deprecated.ts', ext: '.ts', importsCount: 0, importedByCount: 0, isOrphan: true, isEntryPoint: false, isHotspot: false });

  links.push({ source: 'src/main.ts', target: 'src/app.ts' });
  services.forEach(s => {
    links.push({ source: 'src/app.ts', target: `src/services/${s}.ts` });
    links.push({ source: `src/services/${s}.ts`, target: 'src/utils/helpers.ts' });
    links.push({ source: `src/services/${s}.ts`, target: 'src/types/index.ts' });
  });
  links.push({ source: 'src/services/api.ts', target: 'src/utils/validators.ts' });
  links.push({ source: 'src/services/auth.ts', target: 'src/utils/validators.ts' });

  for (let i = 0; i < 12; i++) {
    links.push({ source: 'src/app.ts', target: `src/components/Widget${i}.tsx` });
    links.push({ source: `src/components/Widget${i}.tsx`, target: 'src/utils/helpers.ts' });
    links.push({ source: `src/components/Widget${i}.tsx`, target: 'src/types/index.ts' });
    if (i % 3 === 0) links.push({ source: `src/components/Widget${i}.tsx`, target: 'src/utils/validators.ts' });
  }

  return { nodes, links, timestamp: Date.now() };
}

// ─── POLA BUG (PENDETEKSI MASALAH) ────────────────────────────────────────────
interface BugPattern { type: string; severity: 'critical' | 'warning' | 'info'; files: string[]; message: string; }

function detectBugPatterns(graph: GraphData): BugPattern[] {
  const patterns: BugPattern[] = [];
  const hotspots = graph.nodes.filter(n => n.importedByCount > 6);
  if (hotspots.length > 0) patterns.push({ type: 'high-risk-hotspot', severity: 'critical', files: hotspots.map(n => n.id), message: `${hotspots.length} file hotspot dengan fan-in tinggi.` });
  const orphans = graph.nodes.filter(n => n.isOrphan);
  if (orphans.length > 0) patterns.push({ type: 'orphan-cluster', severity: 'warning', files: orphans.map(n => n.id), message: `${orphans.length} file terisolasi. Kemungkinan kode mati.` });

  const adjMap = new Map<string, Set<string>>();
  for (const link of graph.links) {
    const src = typeof link.source === 'object' ? (link.source as any).id : link.source;
    const tgt = typeof link.target === 'object' ? (link.target as any).id : link.target;
    if (!adjMap.has(src)) adjMap.set(src, new Set());
    adjMap.get(src)!.add(tgt);
  }
  const circularPairs: string[] = [];
  for (const [src, targets] of adjMap) {
    for (const tgt of targets) {
      if (adjMap.get(tgt)?.has(src)) {
        const pair = [src, tgt].sort().join(' ↔ ');
        if (!circularPairs.includes(pair)) circularPairs.push(pair);
      }
    }
  }
  if (circularPairs.length > 0) patterns.push({ type: 'circular', severity: 'critical', files: circularPairs, message: `${circularPairs.length} pasang dependensi sirkular.` });
  const deepChains = graph.nodes.filter(n => n.isEntryPoint && n.importsCount > 4);
  if (deepChains.length > 0) patterns.push({ type: 'deep-chain', severity: 'warning', files: deepChains.map(n => n.id), message: `${deepChains.length} titik masuk (entry) dengan rantai dalam.` });
  return patterns;
}

// ─── PENGATURAN WARNA ─────────────────────────────────────────────────────────
let colorMode: 'fileCategory' | 'risk' | 'role' = 'fileCategory';

function getNodeColor(node: Node): string {
  // Simulasi dampak menimpa (override) warna asli
  if (node.impactState === 'source') return '#ff2255';
  if (node.impactState === 'direct') return '#ff9900';
  if (node.impactState === 'indirect') return '#4488ff';

  if (colorMode === 'fileCategory') {
    if (node.role === 'orphan') return '#555566'; // Selalu gelap untuk file orphan (yatim/tidak terhubung)
    const cat = node.fileCategory;
    if (cat === 'core') return '#00ddff';     // Biru Muda/Cyan
    if (cat === 'view') return '#ff5577';     // Merah Muda/Coral
    if (cat === 'style') return '#ffaa00';    // Oranye
    if (cat === 'config') return '#ffdd00';   // Kuning
    if (cat === 'db') return '#00ff66';       // Hijau Zamrud
    if (cat === 'doc') return '#ffffff';      // Putih
    if (cat === 'test') return '#cc88ff';     // Ungu Muda
    if (cat === 'asset') return '#ff00aa';    // Magenta/Merah Keunguan
    return '#8888aa'; // Bawaan (Utilitas)
  }

  if (colorMode === 'risk') {
    if (node.role === 'orphan') return '#555566';
    if (node.riskLevel === 'critical') return '#ff0044'; // Merah
    if (node.riskLevel === 'moderate') return '#ff8800'; // Oranye
    if (node.riskLevel === 'low') return '#ffdd00';      // Kuning
    return '#00ccff'; // Aman (Daun/Leaf)
  }

  if (colorMode === 'role') {
    if (node.role === 'trigger') return '#ff2255';
    if (node.role === 'entry') return '#aa44ff';
    if (node.role === 'orphan') return '#555566';
    if (node.role === 'circular') return '#ff00aa';
    if (node.role === 'direct') return '#00ffcc';
    return '#8888aa'; // Tidak Langsung (Indirect)
  }

  return '#00ffcc';
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getLinkColor(link: any, nodes: Node[]): string {
  const srcId = typeof link.source === 'object' ? link.source.id : link.source;
  const srcNode = nodes.find(n => n.id === srcId);
  return srcNode ? getNodeColor(srcNode) : '#00ffcc';
}

let glowTexture: any = null;
function getGlowTexture() {
  if (glowTexture) return glowTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.2, 'rgba(255,255,255,0.8)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.2)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(64, 64, 64, 0, Math.PI * 2);
  ctx.fill();
  glowTexture = new THREE.CanvasTexture(canvas);
  return glowTexture;
}

// ─── SIMULASI DAMPAK (IMPACT SIMULATION) ──────────────────────────────────────
function simulateImpact(graph: GraphData, changedFileId: string): GraphData {
  const importedByMap = new Map<string, Set<string>>();
  for (const link of graph.links) {
    const src = typeof link.source === 'object' ? (link.source as any).id : link.source;
    const tgt = typeof link.target === 'object' ? (link.target as any).id : link.target;
    if (!importedByMap.has(tgt)) importedByMap.set(tgt, new Set());
    importedByMap.get(tgt)!.add(src);
  }
  const direct = new Set<string>(), indirect = new Set<string>();
  const queue = [changedFileId]; const visited = new Set([changedFileId]); let isDirect = true;
  while (queue.length) {
    const sz = queue.length;
    for (let i = 0; i < sz; i++) {
      const cur = queue.shift()!;
      const imps = importedByMap.get(cur);
      if (imps) for (const imp of imps) {
        if (!visited.has(imp)) { visited.add(imp); queue.push(imp); if (isDirect) direct.add(imp); else indirect.add(imp); }
      }
    }
    isDirect = false;
  }
  const sim: GraphData = JSON.parse(JSON.stringify(graph));
  sim.nodes.forEach(n => {
    if (n.id === changedFileId) n.impactState = 'source';
    else if (direct.has(n.id)) n.impactState = 'direct';
    else if (indirect.has(n.id)) n.impactState = 'indirect';
    else if (n.isOrphan) n.impactState = 'orphan';
    else n.impactState = 'safe';
  });
  return sim;
}

// ─── APLIKASI UTAMA (MAIN APP) ────────────────────────────────────────────────
async function init() {
  const container3D = document.getElementById('graph-container-3d')!;
  const container2D = document.getElementById('graph-container-2d')!;

  // ─── TAMPILAN ERROR ───────────────────────────────────────────────────────────
  function showError(msg: string) {
    const errDiv = document.createElement('div');
    errDiv.style.position = 'fixed';
    errDiv.style.top = '10px';
    errDiv.style.left = '50%';
    errDiv.style.transform = 'translateX(-50%)';
    errDiv.style.background = 'rgba(255, 0, 0, 0.8)';
    errDiv.style.color = 'white';
    errDiv.style.padding = '10px 20px';
    errDiv.style.borderRadius = '8px';
    errDiv.style.zIndex = '9999';
    errDiv.style.fontFamily = 'monospace';
    errDiv.innerText = msg;
    document.body.appendChild(errDiv);
  }
  window.addEventListener('error', (e) => showError(`Runtime Error: ${e.message}`));
  window.addEventListener('unhandledrejection', (e) => showError(`Promise Error: ${e.reason}`));

  let originalData: GraphData;
  try {
    const res = await fetch('/graph.json');
    if (res.ok) { originalData = await res.json(); } else { throw new Error(''); }
  } catch { originalData = generateDummyGraph(); }

  let is3DMode = true;
  let selectedNode: Node | null = null;
  const bugPatterns = detectBugPatterns(originalData);

  const w = window.innerWidth;
  const h = window.innerHeight;

  // Mengambil fungsi konstruktor dari objek global window (dimuat via tag script html)
  const Graph3DFn = (window as any).ForceGraph3D;
  const Graph2DFn = (window as any).ForceGraph;

  // 1. Inisialisasi Grafik 3D dengan distribusi spatial yang lebih baik
  const graph3D = Graph3DFn()(container3D)
    .width(w).height(h)
    .backgroundColor('#000000ff')
    .graphData(JSON.parse(JSON.stringify(originalData)))
    .nodeId('id')
    .nodeLabel((n: any) => (n as Node).name)
    .numDimensions(3) // Wajib pastikan mode 3 dimensi
    .d3Force('center', null) // Hapus center force agar distribusi lebih menyebar
    .nodeThreeObject((n: any) => {
      const node = n as Node;
      const color = getNodeColor(node);
      const baseR = Math.max(4, ((node.importedByCount || 0) + 4));
      
      if (node.isOrphan) {
        const bhGroup = new THREE.Group();
        
        // Event Horizon (Pusat Hitam Pekat - Agak membesar)
        const horizon = new THREE.Mesh(
          new THREE.SphereGeometry(baseR * 1.5, 32, 32),
          new THREE.MeshBasicMaterial({ color: 0x000000 })
        );
        bhGroup.add(horizon);
        
        // Cakram Akresi Lapis 1 (Cahaya Super Terang Core)
        const ringMatCore = new THREE.SpriteMaterial({
          map: getGlowTexture(),
          color: new THREE.Color(0xffffff),
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          opacity: 1.0
        });
        const ringCore = new THREE.Sprite(ringMatCore);
        
        // Cakram Akresi Lapis 2 (Warna Warni Raksasa)
        const ringMat = new THREE.SpriteMaterial({
          map: getGlowTexture(),
          color: new THREE.Color(0xaa33ff),
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          opacity: 1.0
        });
        const ring = new THREE.Sprite(ringMat);
        
        // Berdenyut perlahan dengan skala super ekstrem
        ring.onBeforeRender = () => {
          const time = Date.now() / 300;
          const nx = typeof n.x === 'number' && isFinite(n.x) ? n.x : 0;
          const p = 1 + Math.sin(time + nx) * 0.2;
          
          // SKALA EKSTREM: 25x lebih besar dari baseR
          ring.scale.set(baseR * 25 * p, baseR * 25 * p, 1);
          ringCore.scale.set(baseR * 10 * p, baseR * 10 * p, 1);
          
          // Animasi pergeseran warna neon yang mencolok
          const hue = 0.75 + 0.2 * Math.sin(time * 0.4 + nx);
          ringMat.color.setHSL(hue, 1.0, 0.6); // Lightness 0.6 agar sangat cerah
        };
        
        bhGroup.add(ring);
        bhGroup.add(ringCore);
        return bhGroup;
      }

      const group = new THREE.Group();
      
      // Inti cahaya terang di tengah
      const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      group.add(new THREE.Mesh(new THREE.SphereGeometry(baseR * 0.4, 16, 16), coreMat));

      // Efek gelembung kaca
      const bubbleMat = new THREE.MeshPhysicalMaterial({
        color: color,
        transparent: true,
        opacity: 0.6,
        roughness: 0,
        transmission: 0.9,
        thickness: 0.5,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        emissive: color,
        emissiveIntensity: 0.3
      });
      group.add(new THREE.Mesh(new THREE.SphereGeometry(baseR, 32, 32), bubbleMat));

      // Lapisan cahaya berpendar (Sprite glow)
      const spriteMat = new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color: color,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.9
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(baseR * 4, baseR * 4, 1);
      
      sprite.onBeforeRender = () => {
        const time = Date.now() / 300;
        const nx = typeof n.x === 'number' && isFinite(n.x) ? n.x : 0;
        const ny = typeof n.y === 'number' && isFinite(n.y) ? n.y : 0;
        const pulse = 1 + Math.sin(time + nx) * 0.2;
        // Efek cahaya (glow) dilebarkan dan diterangkan agar tetap silau meski node saling berjauhan
        sprite.scale.set(baseR * 14 * pulse, baseR * 14 * pulse, 1);
        spriteMat.opacity = 0.9 + 0.1 * Math.sin(time * 1.5 + ny);
      };
      
      group.add(sprite);

      return group;
    })
    .linkWidth(1.5)
    .linkResolution(8)
    .linkMaterial((link: any) => {
      const srcId = typeof link.source === 'object' ? link.source.id : link.source;
      const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
      const srcNode = originalData.nodes.find(n => n.id === srcId);
      const tgtNode = originalData.nodes.find(n => n.id === tgtId);
      
      const srcColor = new THREE.Color(srcNode ? getNodeColor(srcNode) : '#00ffcc');
      const tgtColor = new THREE.Color(tgtNode ? getNodeColor(tgtNode) : '#00ffcc');
      
      const uniforms = {
        color1: { value: srcColor },
        color2: { value: tgtColor },
        time: { value: 0 }
      };

      const mat = new THREE.ShaderMaterial({
        uniforms: uniforms,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 color1;
          uniform vec3 color2;
          uniform float time;
          varying vec2 vUv;
          void main() {
            vec3 mixed = mix(color1, color2, vUv.x);
            float pulse = 0.5 + 0.5 * sin(time * 4.0 + vUv.x * 6.0);
            gl_FragColor = vec4(mixed, pulse * 0.9);
          }
        `
      });
      
      // Menganimasikan waktu untuk shader material
      mat.onBeforeRender = () => {
        uniforms.time.value = Date.now() / 1000;
      };
      
      return mat;
    })
    .onNodeClick((n: any) => handleNodeClick(n as Node))
    .warmupTicks(30)
    .cooldownTicks(60);

  // Meningkatkan sensitivitas scroll zoom 3D
  setTimeout(() => {
    try {
      const controls = graph3D.controls() as any;
      if (controls) controls.zoomSpeed = 8.0;
    } catch {}
  }, 100);

  // Implementasi Geser (Pan) dengan 2 Jari / Scroll Mouse di Mode 3D
  container3D.addEventListener('wheel', (e) => {
    // Pinch-to-zoom biasanya mengirimkan ctrlKey=true di trackpad browser
    // Jika tidak ada ctrlKey, kita asumsikan ini adalah 2-finger swipe (pan)
    if (e.ctrlKey) return;

    e.preventDefault();
    e.stopPropagation();

    try {
      const controls = graph3D.controls() as any;
      const camera = graph3D.camera();
      
      // Faktor kecepatan geser
      const panSpeed = 1.2;
      
      // Mengubah delta menjadi pergeseran (Y dibalik agar natural)
      const moveX = e.deltaX * panSpeed;
      const moveY = -e.deltaY * panSpeed;
      
      const vec = new THREE.Vector3(moveX, moveY, 0);
      vec.applyQuaternion(camera.quaternion);
      
      camera.position.add(vec);
      controls.target.add(vec);
    } catch (err) {
      console.warn('Gagal melakukan pan', err);
    }
  }, { passive: false });

  // Kalibrasi Fisika 3D: Murni 3-Dimensi Bola (Full 3D Spherical Depth)
  const charge3D = graph3D.d3Force('charge') as any;
  if (charge3D) {
    charge3D.strength((n: any) => -600 - (n.importedByCount || 0) * 200);
    charge3D.distanceMax(1000);
  }
  
  // Scatter Force: Beri dorongan acak di sumbu Z agar tidak terjebak di bidang datar z=0
  graph3D.d3Force('scatterZ', () => {
    const nodes = graph3D.graphData().nodes;
    nodes.forEach((node: any) => {
      if (!node.vz && (node.z === 0 || node.z === undefined || node.z === null)) {
        node.z = (Math.random() - 0.5) * 50;
        node.vz = (Math.random() - 0.5) * 5;
      }
    });
  });

  graph3D.d3Force('link')?.distance((l: any) => {
    const srcComplexity = (l.source.importedByCount || 0);
    const tgtComplexity = (l.target.importedByCount || 0);
    return 180 + (srcComplexity + tgtComplexity) * 20;
  });

  graph3D.d3AlphaDecay(0.02);

  setTimeout(() => { try { graph3D.zoomToFit(1200, 10); } catch {} }, 1000);

  // 2. Inisialisasi Grafik 2D
  const graph2D = Graph2DFn()(container2D)
    .width(w).height(h)
    .backgroundColor('#020208')
    .graphData(JSON.parse(JSON.stringify(originalData)))
    .nodeId('id')
    .nodeLabel((n: any) => (n as Node).name)
    .nodeCanvasObjectMode(() => 'replace')
    .nodeCanvasObject((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as Node;
      // Membuat ukuran gelembung cukup besar seperti permata
      const baseR = Math.max(8, (n.importedByCount || 0) * 1.5 + 8);
      const color = getNodeColor(n);

      const nx = typeof node.x === 'number' && isFinite(node.x) ? node.x : 0;
      const ny = typeof node.y === 'number' && isFinite(node.y) ? node.y : 0;

      // Menganimasikan pendaran node 2D
      const time = Date.now() / 300;
      const pulse = 1 + Math.sin(time + nx) * 0.15;
      const dynamicR = baseR * pulse;

      ctx.save();
      if (!n.isOrphan) {
        // Pendaran cahaya luar (glow diperbesar dan diterangkan)
        const haloGrad = ctx.createRadialGradient(nx, ny, 0, nx, ny, dynamicR * 8);
        haloGrad.addColorStop(0, hexToRgba(color, 0.9));
        haloGrad.addColorStop(0.5, hexToRgba(color, 0.4));
        haloGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(nx, ny, dynamicR * 8, 0, Math.PI * 2);
        ctx.fill();

        // Garis tepi gelembung (efek pantulan kaca)
        ctx.strokeStyle = hexToRgba(color, 0.9);
        ctx.lineWidth = baseR * 0.1;
        ctx.beginPath();
        ctx.arc(nx, ny, baseR, 0, Math.PI * 2);
        ctx.stroke();

        // Bagian dalam permata yang berkilau
        const gemGrad = ctx.createRadialGradient(nx, ny, 0, nx, ny, baseR);
        gemGrad.addColorStop(0, 'rgba(255,255,255,1)');
        gemGrad.addColorStop(0.2, 'rgba(255,255,255,0.8)');
        gemGrad.addColorStop(0.6, hexToRgba(color, 0.7));
        gemGrad.addColorStop(0.8, hexToRgba(color, 0.4));
        gemGrad.addColorStop(1, hexToRgba(color, 0.2));
        ctx.fillStyle = gemGrad;
        ctx.beginPath();
        ctx.arc(nx, ny, baseR, 0, Math.PI * 2);
        ctx.fill();

        // Titik kilau cahaya putih di atas
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath();
        ctx.ellipse(nx - baseR * 0.35, ny - baseR * 0.35, baseR * 0.3, baseR * 0.15, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();

        // Titik kilau kecil sekunder di bawah
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.arc(nx + baseR * 0.4, ny + baseR * 0.4, baseR * 0.08, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Efek Black Hole - Cahaya tebal berlapis warna-warni
        const time = Date.now() / 400;
        const hue = Math.floor(270 + 60 * Math.sin(time * 0.3 + nx));
        const mixedColor = `hsla(${hue}, 100%, 60%, 0.85)`;
        
        const bhGrad = ctx.createRadialGradient(nx, ny, 0, nx, ny, baseR * 5); // Radius cahaya lebih tebal
        bhGrad.addColorStop(0, '#000000'); // Event horizon (batas pusaran gelap)
        bhGrad.addColorStop(0.2, '#000000');
        bhGrad.addColorStop(0.4, mixedColor); // Bagian dalam cincin pusaran (berwarna-warni terang)
        bhGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = bhGrad;
        ctx.beginPath();
        ctx.arc(nx, ny, baseR * 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Garis batas ungu terluar
        ctx.strokeStyle = `hsla(${hue}, 100%, 70%, 0.6)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(nx, ny, baseR * 0.8, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Hanya tampilkan nama file jika di-zoom dari dekat
      if (globalScale > 2) {
        const fontSize = Math.max(3, 10 / globalScale);
        ctx.font = `500 ${fontSize}px 'Inter', sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.textAlign = 'center';
        ctx.fillText(n.name, nx, ny + baseR * 1.5 + fontSize);
      }
      ctx.restore();
    })
    .linkCanvasObjectMode(() => 'replace')
    .linkCanvasObject((link: any, ctx: CanvasRenderingContext2D) => {
      const src = link.source;
      const tgt = link.target;
      if (typeof src.x !== 'number' || typeof tgt.x !== 'number') return;
      
      const srcNode = originalData.nodes.find(n => n.id === (typeof link.source === 'object' ? link.source.id : link.source));
      const tgtNode = originalData.nodes.find(n => n.id === (typeof link.target === 'object' ? link.target.id : link.target));
      const srcColor = srcNode ? getNodeColor(srcNode) : '#00ffcc';
      const tgtColor = tgtNode ? getNodeColor(tgtNode) : '#00ffcc';
      
      const grad = ctx.createLinearGradient(src.x, src.y, tgt.x, tgt.y);
      grad.addColorStop(0, hexToRgba(srcColor, 0.8));
      grad.addColorStop(1, hexToRgba(tgtColor, 0.8));
      
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      
      // Garis tipis bersih dengan pendaran cahaya
      ctx.lineWidth = 1;
      ctx.strokeStyle = grad;
      ctx.stroke();
    })
    .linkColor((link: any) => {
      const srcId = typeof link.source === 'object' ? link.source.id : link.source;
      const srcNode = originalData.nodes.find(n => n.id === srcId);
      return srcNode ? hexToRgba(getNodeColor(srcNode), 0.6) : 'rgba(0,255,204,0.5)';
    })
    .linkWidth(2)
    .linkDirectionalParticles(2)
    .linkDirectionalParticleWidth(1.5)
    .linkDirectionalParticleColor((link: any) => {
      const srcId = typeof link.source === 'object' ? link.source.id : link.source;
      const srcNode = originalData.nodes.find(n => n.id === srcId);
      return srcNode ? getNodeColor(srcNode) : '#00ffcc';
    })
    .linkDirectionalParticleSpeed(0.005)
    .onNodeClick((n: any) => handleNodeClick(n as Node))
    .cooldownTicks(120);

  try {
    // Kalibrasi Fisika 2D: Spasi sangat lega (2D butuh tolakan lebih kuat dari 3D)
    const charge2D = graph2D.d3Force('charge') as any;
    if (charge2D) {
      charge2D.strength((n: any) => -1500 - (n.importedByCount || 0) * 400);
      charge2D.distanceMax(1500);
    }
    graph2D.d3Force('link')?.distance((l: any) => 300 + ((l.source.importedByCount || 0) + (l.target.importedByCount || 0)) * 40);
    graph2D.d3AlphaDecay(0.02);
  } catch {}

  setTimeout(() => { try { graph2D.zoomToFit(800, 20); } catch {} }, 300);

  // ─── PERBARUI KEDUA GRAFIK DENGAN DATA BARU ───────────────────────────────────
  function updateData(newData: GraphData) {
    // PENTING: Harus memberikan salinan (deep copy) yang BERBEDA untuk 3D dan 2D.
    // Jika tidak, mesin fisika 2D akan secara paksa me-reset nilai Z menjadi 0 pada objek yang sama di memori!
    const json3D = JSON.parse(JSON.stringify(newData));
    const json2D = JSON.parse(JSON.stringify(newData));
    
    graph3D.graphData(json3D);
    graph2D.graphData(json2D);
    
    // Beri dorongan energi agar grafik mengembang ulang secara natural
    graph3D.d3ReheatSimulation();
    graph2D.d3ReheatSimulation();
  }

  function refreshVisuals() {
    try {
      graph3D.nodeThreeObject(graph3D.nodeThreeObject());
      graph3D.linkMaterial(graph3D.linkMaterial());
    } catch {}
  }

  // ─── RENDER STRUKTUR FILE (TAMPILAN SIDEBAR) ──────────────────────────────────
  function renderFileTree(data: GraphData) {
    const oldTreeContainer = document.getElementById('file-tree');
    if (!oldTreeContainer) return;
    
    // Gunakan trik cloneNode untuk menghapus semua event listener lama
    const treeContainer = oldTreeContainer.cloneNode(false) as HTMLElement;
    oldTreeContainer.parentNode?.replaceChild(treeContainer, oldTreeContainer);
    
    const sortedNodes = [...data.nodes].sort((a, b) => a.name.localeCompare(b.name));
    
    // OPTIMASI: Bangun string HTML sekaligus (Mencegah 10.000+ kali DOM Repaint)
    let html = '';
    for (const node of sortedNodes) {
      html += `<div class="file-tree-item" data-id="${node.id}" id="tree-node-${node.id}">${node.name}</div>`;
    }
    treeContainer.innerHTML = html;
    
    // OPTIMASI: Event Delegation (1 listener untuk 10.000 elemen, hemat RAM & CPU)
    treeContainer.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target && target.classList.contains('file-tree-item')) {
        const nodeId = target.getAttribute('data-id');
        if (!nodeId) return;
        
        // Cari elemen node di dalam instance grafik yang aktif
        const currentData = is3DMode ? graph3D.graphData() : graph2D.graphData();
        const graphNode = currentData.nodes.find((n: any) => String(n.id) === String(nodeId));
        
        if (graphNode) {
          handleNodeClick(graphNode as Node);
        }
      }
    });
  }
  
  renderFileTree(originalData);

  // ─── TOMBOL PENGUBAH MODE 2D/3D ───────────────────────────────────────────────
  const btnModeToggle = document.getElementById('btn-mode-toggle')!;
  btnModeToggle.addEventListener('click', () => {
    is3DMode = !is3DMode;
    if (is3DMode) {
      container3D.style.visibility = 'visible';
      container3D.style.zIndex = '2';
      container2D.style.visibility = 'hidden';
      container2D.style.zIndex = '1';
      btnModeToggle.textContent = 'Beralih ke Mode 2D';
      try {
        graph3D.width(window.innerWidth).height(window.innerHeight);
        graph3D.zoomToFit(300, 10);
      } catch {}
    } else {
      container3D.style.visibility = 'hidden';
      container3D.style.zIndex = '1';
      container2D.style.visibility = 'visible';
      container2D.style.zIndex = '2';
      btnModeToggle.textContent = 'Beralih ke Mode 3D';
      try {
        graph2D.width(window.innerWidth).height(window.innerHeight);
        graph2D.zoomToFit(300, 20);
      } catch {}
    }
  });

  // ─── TOMBOL MUAT ULANG (REFRESH) ──────────────────────────────────────────────
  const btnRefresh = document.getElementById('btn-refresh');
  
  async function fetchAndUpdateGraph() {
    try {
      const res = await fetch('/graph.json', { cache: 'no-cache' });
      if (res.ok) {
        originalData = await res.json();
        updateData(originalData);
        renderFileTree(originalData);
        if (is3DMode) graph3D.zoomToFit(1000, 10);
        else graph2D.zoomToFit(1000, 20);
      }
    } catch (e) {
      console.error('Refresh error:', e);
    }
  }

  btnRefresh?.addEventListener('click', fetchAndUpdateGraph);

  // ─── AUTO-INDEXING (LIVE SYNC) ────────────────────────────────────────────────
  // Memeriksa perubahan graph.json setiap 3 detik secara ringan (hanya ambil Header)
  let lastModifiedTime = '';
  setInterval(async () => {
    try {
      const res = await fetch('/graph.json', { method: 'HEAD', cache: 'no-cache' });
      if (res.ok) {
        const currentModified = res.headers.get('last-modified') || res.headers.get('etag');
        if (lastModifiedTime && currentModified && lastModifiedTime !== currentModified) {
          console.log('🔄 Perubahan terdeteksi! Melakukan Auto-Sync...');
          // Tambahkan indikator visual singkat di tombol Muat Ulang
          if (btnRefresh) {
            const oldText = btnRefresh.innerHTML;
            btnRefresh.innerHTML = '🔄 Auto-Syncing...';
            btnRefresh.style.color = '#00ffcc';
            await fetchAndUpdateGraph();
            setTimeout(() => {
              btnRefresh.innerHTML = oldText;
              btnRefresh.style.color = '';
            }, 2000);
          } else {
            await fetchAndUpdateGraph();
          }
        }
        if (currentModified) lastModifiedTime = currentModified;
      }
    } catch (e) {
      // Abaikan error jaringan saat polling
    }
  }, 3000);

  // ─── PENGATURAN LOGIKA MENU SIDEBAR & TOMBOL ──────────────────────────────────
  const nodePanel = document.getElementById('node-panel')!;
  const nodeId = document.getElementById('node-id')!;
  const nodeStats = document.getElementById('node-stats')!;
  const btnSimulate = document.getElementById('btn-simulate')!;
  const btnReset = document.getElementById('btn-reset')!;
  const statsTotal = document.getElementById('stats-total')!;
  const statsEdges = document.getElementById('stats-edges')!;
  const statsHotspots = document.getElementById('stats-hotspots')!;
  const statsOrphans = document.getElementById('stats-orphans')!;
  const bugList = document.getElementById('bug-list')!;
  const impactSummary = document.getElementById('impact-summary')!;

  statsTotal.textContent = String(originalData.nodes.length);
  statsEdges.textContent = String(originalData.links.length);
  statsHotspots.textContent = String(originalData.nodes.filter(n => n.isHotspot).length);
  statsOrphans.textContent = String(originalData.nodes.filter(n => n.isOrphan).length);

  bugList.innerHTML = '';
  if (bugPatterns.length === 0) {
    bugList.innerHTML = '<div class="no-bugs">✓ Tidak ada pola bug terdeteksi</div>';
  } else {
    bugPatterns.forEach(p => {
      const div = document.createElement('div');
      div.className = `bug-item ${p.severity}`;
      const icons: Record<string, string> = { 'circular': '🔄', 'high-risk-hotspot': '🔥', 'orphan-cluster': '💤', 'deep-chain': '⛓' };
      div.innerHTML = `<span class="bug-icon">${icons[p.type] || '⚠'}</span><span class="bug-msg">${p.message}</span>`;
      div.addEventListener('click', () => {
        const set = new Set(p.files);
        [graph3D.graphData().nodes, graph2D.graphData().nodes].forEach(nodes => {
          nodes.forEach((n: any) => {
            n.impactState = set.has(n.id) ? 'source' : 'safe';
          });
        });
        refreshVisuals();
      });
      bugList.appendChild(div);
    });
  }

  // Pembaru Keterangan Teks (Legend Updater)
  const legendContainer = document.getElementById('legend-container')!;
  const colorModeSelect = document.getElementById('color-mode') as HTMLSelectElement;
  
  function updateLegend() {
    let html = '';
    if (colorMode === 'fileCategory') {
      html = `
        <div class="legend-item"><span class="leg-dot" style="background:#00ddff"></span><span>Logika / Backend (.js, .php)</span></div>
        <div class="legend-item"><span class="leg-dot" style="background:#ff5577"></span><span>Tampilan (.blade, .html)</span></div>
        <div class="legend-item"><span class="leg-dot" style="background:#ffaa00"></span><span>Gaya / CSS (.css)</span></div>
        <div class="legend-item"><span class="leg-dot" style="background:#ffdd00"></span><span>Konfigurasi (.json, .env)</span></div>
        <div class="legend-item"><span class="leg-dot" style="background:#00ff66"></span><span>Basis Data (.sql)</span></div>
        <div class="legend-item"><span class="leg-dot" style="background:#cc88ff"></span><span>Pengujian (Tests)</span></div>
        <div class="legend-item"><span class="leg-dot" style="background:#000;border:1px solid #428;box-shadow:0 0 6px #428"></span><span>Terisolasi (Tidak Dipakai)</span></div>
      `;
    } else if (colorMode === 'risk') {
      html = `
        <div class="legend-item"><span class="leg-dot" style="background:#ff0044"></span><span>Pusat Kritis (Fan-in > 10)</span></div>
        <div class="legend-item"><span class="leg-dot" style="background:#ff8800"></span><span>Risiko Menengah</span></div>
        <div class="legend-item"><span class="leg-dot" style="background:#ffdd00"></span><span>Risiko Rendah</span></div>
        <div class="legend-item"><span class="leg-dot" style="background:#00ccff"></span><span>Node Daun (Aman)</span></div>
        <div class="legend-item"><span class="leg-dot" style="background:#000;border:1px solid #428;box-shadow:0 0 6px #428"></span><span>Terisolasi</span></div>
      `;
    } else if (colorMode === 'role') {
      html = `
        <div class="legend-item"><span class="leg-dot" style="background:#aa44ff"></span><span>Titik Masuk (Entry Point)</span></div>
        <div class="legend-item"><span class="leg-dot" style="background:#ff00aa"></span><span>Anggota Sirkular</span></div>
        <div class="legend-item"><span class="leg-dot" style="background:#00ffcc"></span><span>Node Langsung</span></div>
        <div class="legend-item"><span class="leg-dot" style="background:#8888aa"></span><span>Node Tak Langsung</span></div>
        <div class="legend-item"><span class="leg-dot" style="background:#000;border:1px solid #428;box-shadow:0 0 6px #428"></span><span>Terisolasi</span></div>
      `;
    }
    
    html += `
      <hr style="border-color: rgba(255,255,255,0.1); margin: 4px 0;" />
      <div class="legend-item"><span class="leg-dot" style="background:#ff2255"></span><span>Dampak: Sumber</span></div>
      <div class="legend-item"><span class="leg-dot" style="background:#ff9900"></span><span>Dampak: Langsung</span></div>
      <div class="legend-item"><span class="leg-dot" style="background:#4488ff"></span><span>Dampak: Tak Langsung</span></div>
    `;
    legendContainer.innerHTML = html;
  }

  colorModeSelect.addEventListener('change', (e) => {
    colorMode = (e.target as HTMLSelectElement).value as any;
    updateLegend();
    refreshVisuals();
  });
  updateLegend();


  function handleNodeClick(node: Node) {
    selectedNode = node;
    nodePanel.classList.remove('hidden');
    nodeId.textContent = node.id;
    
    // Beri warna latar (highlight) pada nama file di menu kiri saat diklik
    document.querySelectorAll('.file-tree-item').forEach(el => el.classList.remove('active'));
    const treeItem = document.getElementById(`tree-node-${node.id}`);
    if (treeItem) {
      treeItem.classList.add('active');
      treeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const typeLabel = node.role === 'orphan' ? '💤 Orphan' : node.role === 'entry' ? '⚡ Entry' : node.riskLevel === 'critical' ? '🔥 Critical Hub' : '◉ Regular';
    
    nodeStats.innerHTML = `
      <span class="badge" style="background: ${getNodeColor(node)}">${typeLabel}</span>
      <hr style="border-color: rgba(255,255,255,0.1); margin: 8px 0;">
      <div style="font-size: 11px; margin-bottom: 8px; color: #8892bf;">MULTI-DIMENSIONAL STATUS</div>
      <div class="stat-row"><span>Graph Role</span><span style="text-transform: capitalize">${node.role || 'Unknown'}</span></div>
      <div class="stat-row"><span>Risk Level</span><span style="text-transform: capitalize">${node.riskLevel || 'Unknown'}</span></div>
      <div class="stat-row"><span>File Category</span><span style="text-transform: capitalize">${node.fileCategory || 'Unknown'}</span></div>
      <div class="stat-row"><span>Confidence</span><span>Confirmed (Static)</span></div>
      <hr style="border-color: rgba(255,255,255,0.1); margin: 8px 0;">
      <div class="stat-row"><span>Fan-in (Imported By)</span><span>${node.importedByCount}</span></div>
      <div class="stat-row"><span>Fan-out (Imports)</span><span>${node.importsCount}</span></div>
    `;
    impactSummary.classList.add('hidden');

    // ─── CAMERA CENTERING & TARGET LOCK UI ───
    // Cari node aktif yang memiliki koordinat live (x, y, z)
    const activeNodes = is3DMode ? graph3D.graphData().nodes : graph2D.graphData().nodes;
    const liveNode = activeNodes.find((n: any) => String(n.id) === String(node.id)) || node;

    const nx = typeof (liveNode as any).x === 'number' && isFinite((liveNode as any).x) ? (liveNode as any).x : null;
    const ny = typeof (liveNode as any).y === 'number' && isFinite((liveNode as any).y) ? (liveNode as any).y : null;
    const nz = typeof (liveNode as any).z === 'number' && isFinite((liveNode as any).z) ? (liveNode as any).z : null;
    
    // Hitung ukuran node agar jarak zoom dinamis
    const baseR = Math.max(4, ((node.importedByCount || 0) + 4));

    if (nx !== null && ny !== null) {
      if (is3DMode && nz !== null) {
        // Ambil posisi kamera saat ini untuk mempertahankan sudut pandang (viewing angle)
        const currentCamPos = graph3D.cameraPosition();
        const dx = currentCamPos.x - nx;
        const dy = currentCamPos.y - ny;
        const dz = currentCamPos.z - nz;
        const currentDist = Math.hypot(dx, dy, dz) || 1;
        
        // Jarak target yang nyaman (minimal 250 unit)
        const targetDist = Math.max(250, baseR * 20);
        const ratio = targetDist / currentDist;

        // Hitung posisi kamera baru di sepanjang garis pandang saat ini
        const newCamX = nx + dx * ratio;
        const newCamY = ny + dy * ratio;
        const newCamZ = nz + dz * ratio;

        graph3D.cameraPosition(
          { x: newCamX, y: newCamY, z: newCamZ }, // Posisi kamera presisi
          { x: nx, y: ny, z: nz }, // LookAt tepat pada titik koordinat node
          1000
        );
      } else {
        graph2D.centerAt(nx, ny, 1000);
        const zoomLevel = Math.max(0.5, 12 / baseR);
        graph2D.zoom(zoomLevel, 1000);
      }
    }

    // Tampilkan Target Lock Crosshair
    const targetLock = document.getElementById('target-lock');
    const targetLockName = document.getElementById('target-lock-name');
    if (targetLock && targetLockName) {
      targetLockName.textContent = node.name;
      targetLock.style.opacity = '1';
      
      // Clear timeout lama jika ada
      if ((window as any)._targetLockTimeout) clearTimeout((window as any)._targetLockTimeout);
      (window as any)._targetLockTimeout = setTimeout(() => {
        targetLock.style.opacity = '0';
      }, 3000);
    }
  }

  btnSimulate.addEventListener('click', () => {
    if (!selectedNode) return;
    const sim = simulateImpact(originalData, selectedNode.id);
    const dc = sim.nodes.filter(n => n.impactState === 'direct').length;
    const ic = sim.nodes.filter(n => n.impactState === 'indirect').length;

    const impactStateMap = new Map(sim.nodes.map(n => [n.id, n.impactState]));
    [graph3D.graphData().nodes, graph2D.graphData().nodes].forEach(nodes => {
      nodes.forEach((n: any) => {
        n.impactState = impactStateMap.get(n.id);
      });
    });
    refreshVisuals();

    impactSummary.innerHTML = `<div class="impact-row critical"><span>Direct</span><strong>${dc} files</strong></div><div class="impact-row warning"><span>Indirect</span><strong>${ic} files</strong></div>`;
    impactSummary.classList.remove('hidden');
  });

  btnReset.addEventListener('click', () => {
    selectedNode = null;
    nodePanel.classList.add('hidden');
    impactSummary.classList.add('hidden');

    [graph3D.graphData().nodes, graph2D.graphData().nodes].forEach(nodes => {
      nodes.forEach((n: any) => {
        n.impactState = undefined;
      });
    });
    refreshVisuals();
  });

  window.addEventListener('resize', () => {
    graph3D.width(window.innerWidth).height(window.innerHeight);
    graph2D.width(window.innerWidth).height(window.innerHeight);
  });
}

init().catch(err => console.error('[SpiderMap] Fatal:', err));
