import { FilamentEdge, SculptureNode } from './sculpture';

interface ExtractedGraph {
  nodes: SculptureNode[];
  edges: FilamentEdge[];
  primaryCount: number;
}

function classifyRegion(nx: number, ny: number): 'hand' | 'bridge' | 'head' | 'dust' {
  // In the image:
  // Top-right / upper-center is the reaching hand (ny < 0.36, nx > 0.34)
  if (ny < 0.25 && nx > 0.32) return 'hand';
  if (ny >= 0.25 && ny < 0.39 && nx > 0.62) return 'hand';
  // The delicate suspension threads between the fingertips and the face
  if (ny >= 0.20 && ny <= 0.48 && nx >= 0.25 && nx <= 0.82) {
    // Check if it's in the gap between fingers and forehead/nose/chin
    const inHandCore = ny < 0.28 && nx > 0.45;
    const inFaceCore = ny > 0.36 && nx < 0.64 && nx > 0.16;
    if (!inHandCore && !inFaceCore) {
      return 'bridge';
    }
  }
  // Head & neck region
  if (ny >= 0.32 && nx >= 0.08 && nx <= 0.78) {
    return 'head';
  }
  return 'dust';
}

export function extractSculptureGraphFromImage(img: HTMLImageElement): ExtractedGraph {
  const sampleW = 360;
  const sampleH = Math.round((img.naturalHeight / img.naturalWidth) * sampleW) || 450;

  const offscreen = document.createElement('canvas');
  offscreen.width = sampleW;
  offscreen.height = sampleH;
  const ctx = offscreen.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    return { nodes: [], edges: [], primaryCount: 0 };
  }

  ctx.drawImage(img, 0, 0, sampleW, sampleH);
  // Remove the 4 isolated white dots in the top-left corner of the source artwork
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, Math.ceil(sampleW * 0.34), Math.ceil(sampleH * 0.28));

  const imgData = ctx.getImageData(0, 0, sampleW, sampleH).data;

  const lum = new Float32Array(sampleW * sampleH);
  for (let i = 0; i < sampleW * sampleH; i++) {
    const idx = i * 4;
    // Perceived brightness
    lum[i] = 0.299 * imgData[idx] + 0.587 * imgData[idx + 1] + 0.114 * imgData[idx + 2];
  }

  const nodes: SculptureNode[] = [];
  const occupiedPrimary = new Uint8Array(sampleW * sampleH);

  const markOccupied = (cx: number, cy: number, radius: number, grid: Uint8Array) => {
    const r2 = radius * radius;
    const minY = Math.max(0, cy - radius);
    const maxY = Math.min(sampleH - 1, cy + radius);
    const minX = Math.max(0, cx - radius);
    const maxX = Math.min(sampleW - 1, cx + radius);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r2) {
          grid[y * sampleW + x] = 1;
        }
      }
    }
  };

  // 1. Detect bright white local maxima (the distinct white dots in the sculpture & floating dust)
  interface Candidate {
    x: number;
    y: number;
    val: number;
    prominence: number;
  }
  const primaryCandidates: Candidate[] = [];

  for (let y = 3; y < sampleH - 3; y++) {
    for (let x = 3; x < sampleW - 3; x++) {
      // Skip top-left void where the 4 stray dots existed
      if (x / sampleW < 0.34 && y / sampleH < 0.28) continue;
      const val = lum[y * sampleW + x];
      if (val < 168) continue;

      // Check 5x5 neighborhood for local maximum
      let isMax = true;
      let sumSurrounding = 0;
      let countSurrounding = 0;

      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nVal = lum[(y + dy) * sampleW + (x + dx)];
          if (nVal > val) {
            isMax = false;
            break;
          }
          sumSurrounding += nVal;
          countSurrounding++;
        }
        if (!isMax) break;
      }

      if (isMax) {
        const avgSurrounding = sumSurrounding / countSurrounding;
        const prominence = val - avgSurrounding * 0.45;
        primaryCandidates.push({ x, y, val, prominence });
      }
    }
  }

  // Sort by prominence & brightness so isolated bright dots and key mesh intersections come first
  primaryCandidates.sort((a, b) => b.prominence - a.prominence);

  const maxPrimaryNodes = 430;
  for (const cand of primaryCandidates) {
    if (nodes.length >= maxPrimaryNodes) break;
    if (occupiedPrimary[cand.y * sampleW + cand.x]) continue;

    // Minimum distance between primary white dots (in sample pixels)
    const minSep = cand.val > 230 ? 7 : 9;
    markOccupied(cand.x, cand.y, minSep, occupiedPrimary);

    const nx = cand.x / sampleW;
    const ny = cand.y / sampleH;
    const region = classifyRegion(nx, ny);
    const normLum = Math.min(1, Math.max(0.2, cand.val / 255));

    nodes.push({
      id: nodes.length,
      nx,
      ny,
      baseX: 0,
      baseY: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      gsapScale: 1,
      gsapFlash: 0,
      z: normLum,
      luminance: cand.val,
      isPrimary: true,
      region,
      radius: 1.9 + normLum * 2.1,
      pulsePhase: (cand.x * 0.13 + cand.y * 0.19) % (Math.PI * 2),
      pulseSpeed: 1.6 + ((cand.x * 7 + cand.y * 13) % 10) * 0.18,
      highlightLevel: 0,
      targetHighlight: 0,
      colorIndex: null,
      colorBlend: 0,
      neighbors: [],
    });
  }

  const primaryCount = nodes.length;

  // 2. Sample secondary structural wireframe vertices so the entire hand & head geometry is rich
  const occupiedSecondary = new Uint8Array(occupiedPrimary);
  const secondaryCandidates: { x: number; y: number; val: number }[] = [];

  for (let y = 4; y < sampleH - 4; y += 3) {
    for (let x = 4; x < sampleW - 4; x += 3) {
      if (occupiedSecondary[y * sampleW + x]) continue;
      const val = lum[y * sampleW + x];
      if (val < 46) continue;
      secondaryCandidates.push({ x, y, val });
    }
  }

  // Deterministic shuffle + luminance weighting
  secondaryCandidates.sort((a, b) => {
    const hashA = ((a.x * 73856093) ^ (a.y * 19349663)) & 0xffff;
    const hashB = ((b.x * 73856093) ^ (b.y * 19349663)) & 0xffff;
    return b.val * 0.6 + (hashB % 100) - (a.val * 0.6 + (hashA % 100));
  });

  const maxTotalNodes = 1480;
  for (const cand of secondaryCandidates) {
    if (nodes.length >= maxTotalNodes) break;
    if (occupiedSecondary[cand.y * sampleW + cand.x]) continue;

    markOccupied(cand.x, cand.y, 5, occupiedSecondary);

    const nx = cand.x / sampleW;
    const ny = cand.y / sampleH;
    const region = classifyRegion(nx, ny);
    const normLum = Math.min(1, Math.max(0.1, cand.val / 255));

    nodes.push({
      id: nodes.length,
      nx,
      ny,
      baseX: 0,
      baseY: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      gsapScale: 1,
      gsapFlash: 0,
      z: normLum * 0.85,
      luminance: cand.val,
      isPrimary: false,
      region,
      radius: 0.75 + normLum * 0.9,
      pulsePhase: (cand.x * 0.23 + cand.y * 0.31) % (Math.PI * 2),
      pulseSpeed: 1.2 + ((cand.x + cand.y) % 8) * 0.15,
      highlightLevel: 0,
      targetHighlight: 0,
      colorIndex: null,
      colorBlend: 0,
      neighbors: [],
    });
  }

  // 3. Build filament edges between nodes
  const edges: FilamentEdge[] = [];
  const edgeSet = new Set<string>();

  const addEdge = (i: number, j: number, distNorm: number, isBridgeThread: boolean) => {
    const a = Math.min(i, j);
    const b = Math.max(i, j);
    const key = `${a}:${b}`;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    edges.push({ a, b, distNorm, isBridgeThread });
    nodes[a].neighbors.push(b);
    nodes[b].neighbors.push(a);
  };

  // Connect local mesh neighborhoods
  const maxLocalDist = 0.048;
  const maxLocalDistSq = maxLocalDist * maxLocalDist;

  for (let i = 0; i < nodes.length; i++) {
    const ni = nodes[i];
    // Find closest neighbors
    const candidates: { idx: number; d2: number }[] = [];
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const nj = nodes[j];
      const dx = ni.nx - nj.nx;
      const dy = ni.ny - nj.ny;
      const d2 = dx * dx + dy * dy;
      if (d2 <= maxLocalDistSq) {
        candidates.push({ idx: j, d2 });
      }
    }
    candidates.sort((a, b) => a.d2 - b.d2);
    const maxLinks = ni.isPrimary ? 5 : 3;
    for (let k = 0; k < Math.min(maxLinks, candidates.length); k++) {
      const c = candidates[k];
      const distNorm = Math.sqrt(c.d2) / maxLocalDist;
      const isBridge =
        ni.region === 'bridge' || nodes[c.idx].region === 'bridge';
      addEdge(i, c.idx, distNorm, isBridge);
    }
  }

  // Also connect long suspension filaments across the bridge zone (between hand fingertips and face)
  const bridgeAndPrimary = nodes.filter(
    (n) => n.isPrimary && n.ny >= 0.14 && n.ny <= 0.56 && n.nx >= 0.18 && n.nx <= 0.85
  );

  for (let i = 0; i < bridgeAndPrimary.length; i++) {
    const a = bridgeAndPrimary[i];
    if (a.region !== 'hand' && a.region !== 'bridge') continue;

    let bestTarget: SculptureNode | null = null;
    let bestScore = Infinity;

    for (let j = 0; j < bridgeAndPrimary.length; j++) {
      if (i === j) continue;
      const b = bridgeAndPrimary[j];
      // Look for downward-left or downward connections (from hand toward face/bridge)
      const dy = b.ny - a.ny;
      const dx = b.nx - a.nx;
      if (dy < 0.03 || dy > 0.18) continue;
      if (dx > 0.06 || dx < -0.14) continue;

      const dist = Math.hypot(dx, dy);
      if (dist < bestScore) {
        bestScore = dist;
        bestTarget = b;
      }
    }

    if (bestTarget) {
      addEdge(a.id, bestTarget.id, Math.min(1, bestScore / 0.18), true);
    }
  }

  return { nodes, edges, primaryCount };
}
