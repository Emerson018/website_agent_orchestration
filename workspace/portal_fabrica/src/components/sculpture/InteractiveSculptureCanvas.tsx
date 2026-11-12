import React, { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import {
  BreathingPattern,
  BreathState,
  ClickRipple,
  FilamentEdge,
  PhysicsMode,
  RenderMode,
  SculptureNode,
  SynapticPulse,
} from './sculpture';
import { LUMINOUS_PALETTE, SCULPTURE_IMAGE_PATH } from './palette';
import { extractSculptureGraphFromImage } from './extractSculptureGraph';

interface InteractiveSculptureCanvasProps {
  renderMode: RenderMode;
  physicsMode: PhysicsMode;
  activeColorIndex: number | 'cycle';
  pulseIntensity: number;
  lightIntensity?: number;
  brushRadius: number;
  chainClick: boolean;
  persistentHighlight: boolean;
  relaxMode: boolean;
  breathingPattern: BreathingPattern;
  resetSignal: number;
  illuminateAllSignal: number;
  colorBurstSignal: number;
  onStatsChange: (stats: {
    totalPrimary: number;
    awakenedCount: number;
    coloredCount: number;
    fps: number;
  }) => void;
  onBreathStateChange?: (state: BreathState) => void;
  /** Posição horizontal da escultura na área do canvas: 0 = esquerda, 0.5 = centro, 1 = direita. */
  anchorX?: number;
}

function isPrimaryActiveOnViewport(nodeId: number, viewportWidth: number): boolean {
  if (viewportWidth < 640) {
    // Phone mode: keep ~33% of dots so the drawing underneath stays clearly visible
    return nodeId % 3 === 0;
  }
  if (viewportWidth < 960) {
    // Tablet mode: keep ~50% of dots
    return nodeId % 2 === 0;
  }
  return true;
}

function computeBreathingCycle(elapsedSec: number, pattern: BreathingPattern): BreathState {
  if (pattern === 'box_478') {
    // 4s Inhale, 7s Hold, 8s Exhale = 19s total
    const cycleSeconds = 19;
    const t = ((elapsedSec % cycleSeconds) + cycleSeconds) % cycleSeconds;
    if (t < 4) {
      const p = t / 4;
      const smooth = 0.5 - 0.5 * Math.cos(p * Math.PI);
      return {
        phaseLabel: 'Inspirar',
        phaseProgress: p,
        breathValue: smooth,
        cycleSeconds,
      };
    } else if (t < 11) {
      const p = (t - 4) / 7;
      // Subtle serene shimmer at full expansion
      const shimmer = 0.96 + 0.04 * Math.sin(p * Math.PI * 2);
      return {
        phaseLabel: 'Sustentar',
        phaseProgress: p,
        breathValue: shimmer,
        cycleSeconds,
      };
    } else {
      const p = (t - 11) / 8;
      const smooth = 0.5 + 0.5 * Math.cos(p * Math.PI);
      return {
        phaseLabel: 'Expirar',
        phaseProgress: p,
        breathValue: smooth,
        cycleSeconds,
      };
    }
  }

  if (pattern === 'ocean_wave') {
    // 5s Inhale, 2s Hold, 5s Exhale = 12s total
    const cycleSeconds = 12;
    const t = ((elapsedSec % cycleSeconds) + cycleSeconds) % cycleSeconds;
    if (t < 5) {
      const p = t / 5;
      const smooth = 0.5 - 0.5 * Math.cos(p * Math.PI);
      return {
        phaseLabel: 'Inspirar',
        phaseProgress: p,
        breathValue: smooth,
        cycleSeconds,
      };
    } else if (t < 7) {
      const p = (t - 5) / 2;
      return {
        phaseLabel: 'Sustentar',
        phaseProgress: p,
        breathValue: 1,
        cycleSeconds,
      };
    } else {
      const p = (t - 7) / 5;
      const smooth = 0.5 + 0.5 * Math.cos(p * Math.PI);
      return {
        phaseLabel: 'Expirar',
        phaseProgress: p,
        breathValue: smooth,
        cycleSeconds,
      };
    }
  }

  // Default: 'coherence' (Coerência Cardíaca: 5s Inspirar, 5s Expirar = 10s total)
  const cycleSeconds = 10;
  const t = ((elapsedSec % cycleSeconds) + cycleSeconds) % cycleSeconds;
  if (t < 5) {
    const p = t / 5;
    const smooth = 0.5 - 0.5 * Math.cos(p * Math.PI);
    return {
      phaseLabel: 'Inspirar',
      phaseProgress: p,
      breathValue: smooth,
      cycleSeconds,
    };
  } else {
    const p = (t - 5) / 5;
    const smooth = 0.5 + 0.5 * Math.cos(p * Math.PI);
    return {
      phaseLabel: 'Expirar',
      phaseProgress: p,
      breathValue: smooth,
      cycleSeconds,
    };
  }
}

export const InteractiveSculptureCanvas: React.FC<InteractiveSculptureCanvasProps> = ({
  renderMode,
  physicsMode,
  activeColorIndex,
  pulseIntensity,
  lightIntensity = 1.4,
  brushRadius,
  chainClick,
  persistentHighlight,
  relaxMode,
  breathingPattern,
  resetSignal,
  illuminateAllSignal,
  colorBurstSignal,
  onStatsChange,
  onBreathStateChange,
  anchorX = 0.5,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Mutable simulation state stored in refs for 60fps requestAnimationFrame loop
  const imgRef = useRef<HTMLImageElement | HTMLCanvasElement | null>(null);
  const imgSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const nodesRef = useRef<SculptureNode[]>([]);
  const edgesRef = useRef<FilamentEdge[]>([]);
  const ripplesRef = useRef<ClickRipple[]>([]);
  const pulsesRef = useRef<SynapticPulse[]>([]);
  const primaryCountRef = useRef<number>(0);
  const cycleCounterRef = useRef<number>(0);
  const activeSessionColorRef = useRef<number>(0);
  const hoveredNodeIdRef = useRef<number | null>(null);
  const relaxStartTimeRef = useRef<number>(0);
  const lastPhaseLabelRef = useRef<string>('');
  const lastHoldRippleTimeRef = useRef<number>(0);

  // Smooth GSAP-interpolated pointer state + hold-to-awaken state
  const pointerRef = useRef({
    rawX: -9999,
    rawY: -9999,
    x: -9999,
    y: -9999,
    vx: 0,
    vy: 0,
    normX: 0,
    normY: 0,
    active: false,
    isDown: false,
    downStartTime: 0,
    holdRadius: 0,
    holdBaseColorOffset: 0,
    holdActivatedIds: new Set<number>(),
  });

  // GSAP quickTo functions for buttery-smooth cursor & parallax tracking
  const quickPointerX = useRef<gsap.QuickToFunc | null>(null);
  const quickPointerY = useRef<gsap.QuickToFunc | null>(null);
  const quickNormX = useRef<gsap.QuickToFunc | null>(null);
  const quickNormY = useRef<gsap.QuickToFunc | null>(null);

  // Compute artwork bounding box inside viewport (preserving aspect ratio and centering)
  const layoutRef = useRef({
    drawX: 0,
    drawY: 0,
    drawW: 0,
    drawH: 0,
    width: 0,
    height: 0,
  });

  const recomputeNodeBasePositions = useCallback(() => {
    const { drawX, drawY, drawW, drawH } = layoutRef.current;
    const nodes = nodesRef.current;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.baseX = drawX + n.nx * drawW;
      n.baseY = drawY + n.ny * drawH;
      if (n.x === 0 && n.y === 0) {
        n.x = n.baseX;
        n.y = n.baseY;
      }
    }
  }, []);

  // Load image & extract sculpture nodes + filament network
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = SCULPTURE_IMAGE_PATH;

    img.onload = () => {
      // Create a cleaned canvas copy with the 4 stray white dots in the top-left corner masked out
      const cleanCanvas = document.createElement('canvas');
      cleanCanvas.width = img.naturalWidth;
      cleanCanvas.height = img.naturalHeight;
      const cleanCtx = cleanCanvas.getContext('2d');
      if (cleanCtx) {
        cleanCtx.drawImage(img, 0, 0);
        cleanCtx.fillStyle = '#000000';
        cleanCtx.fillRect(
          0,
          0,
          Math.ceil(img.naturalWidth * 0.34),
          Math.ceil(img.naturalHeight * 0.28)
        );
        imgRef.current = cleanCanvas;
      } else {
        imgRef.current = img;
      }
      imgSizeRef.current = { width: img.naturalWidth, height: img.naturalHeight };

      const { nodes, edges, primaryCount } = extractSculptureGraphFromImage(img);
      nodesRef.current = nodes;
      edgesRef.current = edges;
      primaryCountRef.current = primaryCount;

      recomputeNodeBasePositions();
      setIsLoaded(true);

      // Initial subtle awakening of a few signature bridge nodes using GSAP
      const bridgePrimaries = nodes.filter((n) => n.isPrimary && n.region === 'bridge').slice(0, 14);
      bridgePrimaries.forEach((n, idx) => {
        gsap.to(n, {
          highlightLevel: 0.65,
          targetHighlight: 0.65,
          duration: 1.6,
          delay: 0.1 * idx,
          ease: 'power2.out',
        });
      });
    };

    img.onerror = () => {
      setLoadError(true);
    };
  }, [recomputeNodeBasePositions]);

  // Setup GSAP quickTo interpolators on mount
  useEffect(() => {
    const p = pointerRef.current;
    quickPointerX.current = gsap.quickTo(p, 'x', { duration: 0.22, ease: 'power3.out' });
    quickPointerY.current = gsap.quickTo(p, 'y', { duration: 0.22, ease: 'power3.out' });
    quickNormX.current = gsap.quickTo(p, 'normX', { duration: 0.65, ease: 'power2.out' });
    quickNormY.current = gsap.quickTo(p, 'normY', { duration: 0.65, ease: 'power2.out' });
  }, []);

  // When Relaxation Mode toggles on, disable pointer and start fresh breath cycle
  useEffect(() => {
    if (relaxMode) {
      pointerRef.current.active = false;
      pointerRef.current.isDown = false;
      pointerRef.current.holdRadius = 0;
      pointerRef.current.holdActivatedIds.clear();
      hoveredNodeIdRef.current = null;
      quickNormX.current?.(0);
      quickNormY.current?.(0);
      relaxStartTimeRef.current = performance.now() * 0.001;
      lastPhaseLabelRef.current = '';

      // Harmonize uncolored primary nodes with a soft meditative palette tint if none are colored yet
      const nodes = nodesRef.current;
      const anyColored = nodes.some((n) => n.isPrimary && n.colorIndex !== null);
      if (!anyColored) {
        const primaries = nodes.filter((n) => n.isPrimary);
        primaries.forEach((n, idx) => {
          if (idx % 5 === 0) {
            // Assign serene cyan, violet, or emerald accents to key constellation stars
            const sereneSwatches = [0, 3, 4]; // cyan, emerald, violet
            n.colorIndex = sereneSwatches[idx % sereneSwatches.length];
            gsap.to(n, {
              colorBlend: 0.65,
              duration: 2.4,
              ease: 'sine.inOut',
            });
          }
        });
      }
    }
  }, [relaxMode, breathingPattern]);

  // Handle Reset Sculpture action
  useEffect(() => {
    if (resetSignal === 0) return;
    cycleCounterRef.current = 0; // Always start with Red (0) again after reset
    activeSessionColorRef.current = 0;
    const nodes = nodesRef.current;
    nodes.forEach((n) => {
      gsap.killTweensOf(n);
      gsap.to(n, {
        highlightLevel: 0,
        targetHighlight: 0,
        colorBlend: 0,
        gsapScale: 1,
        gsapFlash: 0,
        duration: 0.85,
        ease: 'power2.inOut',
        onComplete: () => {
          n.colorIndex = null;
        },
      });
    });
  }, [resetSignal]);

  // Handle Illuminate All action ("Iluminar Tudo")
  useEffect(() => {
    if (illuminateAllSignal === 0) return;
    const nodes = nodesRef.current;
    const { drawX, drawY, drawW, drawH } = layoutRef.current;
    const centerX = drawX + drawW * 0.5;
    const centerY = drawY + drawH * 0.42;

    nodes.forEach((n) => {
      const dist = Math.hypot(n.baseX - centerX, n.baseY - centerY);
      const normDist = dist / Math.max(1, Math.hypot(drawW, drawH));
      gsap.to(n, {
        highlightLevel: 1,
        targetHighlight: 1,
        gsapScale: n.isPrimary ? 1.28 : 1.05,
        duration: 1.1,
        delay: normDist * 0.9,
        ease: 'power2.out',
      });
    });

    // Spawn a grand expanding ripple from the suspension bridge center
    const ripple: ClickRipple = {
      id: Date.now(),
      x: centerX,
      y: centerY,
      radius: 4,
      maxRadius: Math.max(drawW, drawH) * 0.65,
      alpha: 0.75,
      rgb: [226, 232, 240],
    };
    ripplesRef.current.push(ripple);
    gsap.to(ripple, {
      radius: ripple.maxRadius,
      alpha: 0,
      duration: 1.6,
      ease: 'power2.out',
    });
  }, [illuminateAllSignal]);

  // Handle Chromatic Burst action ("Pulso Cromático")
  useEffect(() => {
    if (colorBurstSignal === 0) return;
    const nodes = nodesRef.current;
    const primaries = nodes.filter((n) => n.isPrimary);
    const step = Math.max(1, Math.floor(primaries.length / 28));
    for (let i = 0; i < primaries.length; i += step) {
      const n = primaries[i];
      const swatchIdx = (i + colorBurstSignal) % LUMINOUS_PALETTE.length;
      n.colorIndex = swatchIdx;
      n.targetHighlight = 1;
      gsap.fromTo(
        n,
        { gsapScale: 2.3, gsapFlash: 0.95 },
        {
          gsapScale: 1.32,
          gsapFlash: 0,
          highlightLevel: 1,
          colorBlend: 1,
          duration: 1.05,
          delay: (i / primaries.length) * 0.55,
          ease: 'elastic.out(1, 0.45)',
        }
      );
    }
  }, [colorBurstSignal]);

  // Trigger color change & GSAP elastic bloom on node click (starts with Red [0], next click switches to Purple [1])
  const triggerNodeClick = useCallback(
    (clickX: number, clickY: number, forcedColorIdx?: number) => {
      if (relaxMode) return;
      const nodes = nodesRef.current;
      if (nodes.length === 0) return;
      const vw = layoutRef.current.width || window.innerWidth;

      let nearestPrimary: SculptureNode | null = null;
      let minPrimaryDist = Infinity;

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (!n.isPrimary || !isPrimaryActiveOnViewport(n.id, vw)) continue;
        const d = Math.hypot(n.x - clickX, n.y - clickY);
        if (d < minPrimaryDist) {
          minPrimaryDist = d;
          nearestPrimary = n;
        }
      }

      if (!nearestPrimary || minPrimaryDist > 140) return;

      let chosenColorIdx: number;
      if (typeof forcedColorIdx === 'number') {
        chosenColorIdx = forcedColorIdx % LUMINOUS_PALETTE.length;
      } else if (nearestPrimary.colorIndex !== null) {
        chosenColorIdx = (nearestPrimary.colorIndex + 1) % LUMINOUS_PALETTE.length;
      } else {
        chosenColorIdx = cycleCounterRef.current % LUMINOUS_PALETTE.length;
      }
      activeSessionColorRef.current = chosenColorIdx;

      const swatch = LUMINOUS_PALETTE[chosenColorIdx];

      const applyColorToNode = (target: SculptureNode, delaySec: number, scalePeak: number) => {
        target.colorIndex = chosenColorIdx;
        target.targetHighlight = 1;

        gsap.killTweensOf(target);
        gsap.fromTo(
          target,
          {
            gsapScale: scalePeak,
            gsapFlash: 0.55,
          },
          {
            gsapScale: 1.26,
            gsapFlash: 0,
            highlightLevel: 1,
            colorBlend: 1,
            duration: 0.95,
            delay: delaySec,
            ease: 'elastic.out(1, 0.38)',
          }
        );

        target.neighbors.forEach((neighborIdx) => {
          const neighbor = nodes[neighborIdx];
          if (!neighbor) return;
          if (!neighbor.isPrimary) {
            neighbor.colorIndex = chosenColorIdx;
            neighbor.colorBlend = 1;
          }
          pulsesRef.current.push({
            fromNode: target.id,
            toNode: neighbor.id,
            progress: 0,
            speed: 0.024 + Math.random() * 0.018,
            rgb: swatch.rgb,
          });
        });
      };

      applyColorToNode(nearestPrimary, 0, 2.2);

      if (chainClick) {
        const secondaryTargets: SculptureNode[] = [];
        for (let i = 0; i < nodes.length; i++) {
          const cand = nodes[i];
          if (!cand.isPrimary || cand.id === nearestPrimary.id) continue;
          const d = Math.hypot(cand.x - nearestPrimary.x, cand.y - nearestPrimary.y);
          if (d < brushRadius * 0.72) {
            secondaryTargets.push(cand);
          }
        }
        secondaryTargets.slice(0, 6).forEach((cand, idx) => {
          applyColorToNode(cand, 0.06 * (idx + 1), 1.85);
        });
      }

      const ripple: ClickRipple = {
        id: Date.now() + Math.random(),
        x: nearestPrimary.x,
        y: nearestPrimary.y,
        radius: 3,
        maxRadius: chainClick ? brushRadius * 1.15 : 48,
        alpha: 0.55,
        rgb: swatch.rgb,
      };
      ripplesRef.current.push(ripple);

      gsap.to(ripple, {
        radius: ripple.maxRadius,
        alpha: 0,
        duration: 0.95,
        ease: 'power3.out',
      });
    },
    [brushRadius, chainClick, relaxMode]
  );

  // Main Canvas Resize + Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTimer = performance.now();
    let breathUiTimer = performance.now();
    let currentFps = 60;

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      // O canvas ocupa a seção que o contém, não a janela inteira
      const host = canvas.parentElement;
      const width = host?.clientWidth || window.innerWidth;
      const height = host?.clientHeight || window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const imgAspect =
        imgSizeRef.current.height > 0
          ? imgSizeRef.current.width / imgSizeRef.current.height
          : 0.8;

      const availH = height * 0.94;
      const availW = width * 0.92;
      let drawH = availH;
      let drawW = drawH * imgAspect;

      if (drawW > availW) {
        drawW = availW;
        drawH = drawW / imgAspect;
      }

      const drawX = (width - drawW) * Math.min(1, Math.max(0, anchorX));
      const drawY = (height - drawH) * 0.52;

      layoutRef.current = { drawX, drawY, drawW, drawH, width, height };
      recomputeNodeBasePositions();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);

    // Fora da tela, o loop continua agendado mas não desenha nada
    let isOnScreen = true;
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      isOnScreen = entry.isIntersecting;
    });
    visibilityObserver.observe(canvas);

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const timeSec = now * 0.001;

      if (!isOnScreen || document.hidden) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const { drawX, drawY, drawW, drawH, width, height } = layoutRef.current;
      const p = pointerRef.current;

      // Compute Autonomous Breathing State when in Relaxation Mode
      const breathState = relaxMode
        ? computeBreathingCycle(timeSec - relaxStartTimeRef.current, breathingPattern)
        : null;

      if (relaxMode && breathState) {
        if (now - breathUiTimer >= 80) {
          breathUiTimer = now;
          onBreathStateChange?.(breathState);
        }

        // Emit a serene expanding ripple at the start of each Inhale or Hold phase
        if (breathState.phaseLabel !== lastPhaseLabelRef.current) {
          lastPhaseLabelRef.current = breathState.phaseLabel;
          if (breathState.phaseLabel === 'Inspirar' || breathState.phaseLabel === 'Sustentar') {
            const bridgeCenterX = drawX + drawW * 0.52;
            const bridgeCenterY = drawY + drawH * 0.36;
            const sereneRipple: ClickRipple = {
              id: Date.now() + Math.random(),
              x: bridgeCenterX,
              y: bridgeCenterY,
              radius: 8,
              maxRadius: Math.min(drawW, drawH) * 0.48,
              alpha: 0.42,
              rgb: breathState.phaseLabel === 'Sustentar' ? [192, 132, 252] : [34, 211, 238],
            };
            ripplesRef.current.push(sereneRipple);
            gsap.to(sereneRipple, {
              radius: sereneRipple.maxRadius,
              alpha: 0,
              duration: 3.6,
              ease: 'sine.out',
            });
          }
        }
      }

      frameCount++;
      if (now - fpsTimer >= 500) {
        currentFps = Math.round((frameCount * 1000) / (now - fpsTimer));
        frameCount = 0;
        fpsTimer = now;

        const nodes = nodesRef.current;
        let awakenedCount = 0;
        let coloredCount = 0;
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          if (!n.isPrimary) continue;
          if (n.highlightLevel >= 0.35 || renderMode === 'full_bloom') awakenedCount++;
          if (n.colorIndex !== null && n.colorBlend > 0.1) coloredCount++;
        }

        onStatsChange({
          totalPrimary: primaryCountRef.current,
          awakenedCount,
          coloredCount,
          fps: currentFps,
        });
      }

      // 1. Clear obsidian background
      ctx.fillStyle = '#050507';
      ctx.fillRect(0, 0, width, height);

      if (!imgRef.current || nodesRef.current.length === 0) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // Subtle atmospheric aura behind sculpture (toned down for lower light intensity)
      const breathVal = breathState ? breathState.breathValue : 0.35;
      const auraRadius = Math.max(drawW, drawH) * (0.52 + breathVal * 0.22);
      const auraGrad = ctx.createRadialGradient(
        drawX + drawW * 0.52,
        drawY + drawH * 0.42,
        12,
        drawX + drawW * 0.52,
        drawY + drawH * 0.42,
        auraRadius
      );
      const auraAlpha = relaxMode ? 0.025 + breathVal * 0.04 : 0.02;
      auraGrad.addColorStop(0, `rgba(239, 68, 68, ${auraAlpha})`);
      auraGrad.addColorStop(0.5, `rgba(27, 0, 75, ${auraAlpha * 0.65})`);
      auraGrad.addColorStop(1, 'rgba(5, 5, 7, 0)');
      ctx.fillStyle = auraGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Render Dynamic Warped Wireframe Slices (in 'hybrid' or 'full_bloom' mode)
      if (renderMode === 'hybrid' || renderMode === 'full_bloom') {
        const img = imgRef.current;
        const srcW = imgSizeRef.current.width || 800;
        const srcH = imgSizeRef.current.height || 1000;
        const numSlices = 76;
        const srcSliceH = srcH / numSlices;
        const dstSliceH = drawH / numSlices;

        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        for (let s = 0; s < numSlices; s++) {
          const ny = (s + 0.5) / numSlices;
          const sliceCenterY = drawY + ny * drawH;
          const isHandZone = ny < 0.36;

          let breatheX = 0;
          let breatheY = 0;
          let sliceScaleW = 1;
          let sliceHighlightBoost = 0;

          if (relaxMode && breathState) {
            const b = breathState.breathValue;
            breatheX = isHandZone ? -b * 6.5 : b * 4.5;
            breatheY = isHandZone ? b * 8.0 : -b * 6.0;
            sliceScaleW = 1 + (b - 0.3) * 0.028 * Math.sin(ny * Math.PI);

            const waveCenterNy = 1 - b * 0.85;
            const distFromWave = Math.abs(ny - waveCenterNy);
            if (distFromWave < 0.32) {
              sliceHighlightBoost = Math.cos((distFromWave / 0.32) * (Math.PI * 0.5)) * 0.14 * b;
            }
          }

          const baseAlpha = renderMode === 'full_bloom' ? 0.42 : 0.25;
          ctx.globalAlpha = Math.min(0.58, baseAlpha + sliceHighlightBoost);

          const scaledW = drawW * sliceScaleW;
          const centerOffsetX = (drawW - scaledW) * 0.5;

          ctx.drawImage(
            img,
            0,
            s * srcSliceH,
            srcW,
            srcSliceH + 0.6,
            drawX + centerOffsetX + breatheX,
            drawY + s * dstSliceH + breatheY,
            scaledW,
            dstSliceH + 0.6
          );
        }
        ctx.restore();
      }

      // 3. Update Node Physics, Progressive Hover Awakening & Autonomous Breathing Choreography
      const nodes = nodesRef.current;
      const brushR = brushRadius;
      const brushRSq = brushR * brushR;
      const sculptureCenterX = drawX + drawW * 0.48;
      const sculptureCenterY = drawY + drawH * 0.46;

      let closestHoverId: number | null = null;
      let closestHoverDist = 48;

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];

        let regionOffsetX = 0;
        let regionOffsetY = 0;

        if (relaxMode && breathState) {
          // AUTONOMOUS RELAXATION CHOREOGRAPHY
          const b = breathState.breathValue; // [0..1]
          const radDx = n.baseX - sculptureCenterX;
          const radDy = n.baseY - sculptureCenterY;

          // Radial lung-like expansion + gentle convergence between hand and head
          if (n.region === 'hand') {
            regionOffsetX = -b * 7.5 + radDx * b * 0.032;
            regionOffsetY = b * 9.5 + Math.sin(timeSec * 0.6 + n.nx * 3) * 2.2;
          } else if (n.region === 'bridge') {
            regionOffsetX = Math.sin(timeSec * 0.75 + n.ny * 6.0) * (3.5 + b * 4.5);
            regionOffsetY = (b - 0.5) * 6.0;
          } else if (n.region === 'head') {
            regionOffsetX = b * 5.0 + radDx * b * 0.038;
            regionOffsetY = -b * 7.0 + radDy * b * 0.032;
          } else {
            // Stardust orbits gently in slow motion
            regionOffsetX = Math.sin(timeSec * 0.45 + n.pulsePhase) * (8 + b * 6);
            regionOffsetY = Math.cos(timeSec * 0.42 + n.pulsePhase) * (8 + b * 6);
          }

          // Autonomous traveling illumination wave synchronized with breathing phase
          let targetRelaxHighlight = 0.15;
          if (breathingPattern === 'ocean_wave') {
            // Wave sweeps vertically from neck (ny=0.95) to hand (ny=0.05) as breathValue goes 0 -> 1
            const waveFrontNy = 0.95 - b * 0.9;
            const distNy = Math.abs(n.ny - waveFrontNy);
            const waveBand = 0.28;
            if (distNy < waveBand) {
              const waveIntensity = Math.cos((distNy / waveBand) * (Math.PI * 0.5));
              targetRelaxHighlight = 0.2 + waveIntensity * 0.8;
            } else if (n.ny > waveFrontNy) {
              targetRelaxHighlight = 0.18 + b * 0.45;
            }
          } else {
            // Radial & bridge-centered harmonic illumination
            const normDistFromBridge = Math.hypot(n.nx - 0.5, n.ny - 0.38);
            const phaseWave = Math.max(0, Math.cos(normDistFromBridge * 3.2 - b * Math.PI * 0.85));
            targetRelaxHighlight = 0.12 + b * 0.72 * phaseWave + (n.region === 'bridge' ? b * 0.25 : 0);
          }

          n.targetHighlight = Math.min(1, Math.max(0.08, targetRelaxHighlight));
        }

        let targetX = n.baseX + regionOffsetX;
        let targetY = n.baseY + regionOffsetY;

        if (!relaxMode && p.active) {
          const dx = targetX - p.x;
          const dy = targetY - p.y;
          const d2 = dx * dx + dy * dy;

          // If mouse button is held down, progressively expand the awakening + coloring wave
          if (p.isDown) {
            const holdElapsed = Math.max(0, timeSec - p.downStartTime);
            // Slower, gentler wave expansion on mobile screens so lights turn on more gradually
            const linearSpeed = width < 640 ? 90 : 195;
            const accelSpeed = width < 640 ? 12 : 32;
            const currentHoldR =
              brushR * (width < 640 ? 0.32 : 0.45) +
              holdElapsed * linearSpeed +
              holdElapsed * holdElapsed * accelSpeed;
            p.holdRadius = Math.min(Math.max(drawW, drawH) * 1.15, currentHoldR);

            const holdRSq = p.holdRadius * p.holdRadius;
            if (d2 <= holdRSq) {
              const chosenIdx = p.holdBaseColorOffset % LUMINOUS_PALETTE.length;

              // Awaken and color this node gradually as the hold wave reaches it
              if (n.isPrimary && !p.holdActivatedIds.has(n.id)) {
                p.holdActivatedIds.add(n.id);
                n.colorIndex = chosenIdx;
                n.targetHighlight = 1;

                if (isPrimaryActiveOnViewport(n.id, width)) {
                  gsap.killTweensOf(n);
                  gsap.fromTo(
                    n,
                    {
                      gsapScale: width < 640 ? 1.35 : 1.9,
                      gsapFlash: width < 640 ? 0.32 : 0.45,
                    },
                    {
                      gsapScale: width < 640 ? 1.08 : 1.24,
                      gsapFlash: 0,
                      highlightLevel: 1,
                      colorBlend: 1,
                      duration: width < 640 ? 1.35 : 0.85,
                      ease: width < 640 ? 'power2.out' : 'elastic.out(1, 0.42)',
                    }
                  );

                  // Emit synaptic spark along a connected filament with this wave's color
                  if (n.neighbors.length > 0 && Math.random() < (width < 640 ? 0.2 : 0.5)) {
                    const nbIdx = n.neighbors[Math.floor(Math.random() * n.neighbors.length)];
                    const neighbor = nodes[nbIdx];
                    if (neighbor) {
                      pulsesRef.current.push({
                        fromNode: n.id,
                        toNode: neighbor.id,
                        progress: 0,
                        speed: width < 640 ? 0.014 + Math.random() * 0.01 : 0.022 + Math.random() * 0.016,
                        rgb: LUMINOUS_PALETTE[chosenIdx].rgb,
                      });
                    }
                  }
                } else {
                  // Keep viewport-filtered primary nodes in sync with the wave so edges on mobile never show stale colors
                  n.highlightLevel = 1;
                  n.colorBlend = 1;
                }
              } else if (!n.isPrimary) {
                n.colorIndex = chosenIdx;
                n.colorBlend = 1;
                n.targetHighlight = 1;
                n.highlightLevel = Math.max(n.highlightLevel, 0.65);
              }
            }
          }

          // Hover awakening radius strictly proportional to the mouse cursor size (~14px radius)
          const cursorHoverR = width < 640 ? 12 : 14;
          const cursorHoverRSq = cursorHoverR * cursorHoverR;
          if (d2 <= cursorHoverRSq) {
            const dCursor = Math.sqrt(d2) || 0.001;
            const normCursor = 1 - dCursor / cursorHoverR;
            const smoothCursor = normCursor * normCursor * (3 - 2 * normCursor);

            const primaryGain = width < 640 ? 1.5 : 3.2;
            const secondaryGain = width < 640 ? 0.95 : 2.0;
            const awakenGain = (n.isPrimary ? primaryGain : secondaryGain) * smoothCursor * dt;
            n.targetHighlight = Math.min(1, n.targetHighlight + awakenGain);
            n.highlightLevel = Math.min(1, Math.max(n.highlightLevel, n.targetHighlight));

            if (n.isPrimary && isPrimaryActiveOnViewport(n.id, width) && dCursor < closestHoverDist) {
              closestHoverDist = dCursor;
              closestHoverId = n.id;
            }
          }

          if (d2 < brushRSq) {
            const d = Math.sqrt(d2) || 0.001;
            const norm = 1 - d / brushR;
            const smoothFactor = norm * norm * (3 - 2 * norm);

            const strength = (n.isPrimary ? 24 : 15) * smoothFactor;
            if (physicsMode === 'attract') {
              targetX -= (dx / d) * strength * 0.75;
              targetY -= (dy / d) * strength * 0.75;
            } else if (physicsMode === 'repel') {
              targetX += (dx / d) * strength * 0.9;
              targetY += (dy / d) * strength * 0.9;
            } else {
              const angle = Math.atan2(dy, dx) + 0.55 * smoothFactor;
              targetX +=
                Math.cos(angle) * strength * 0.42 +
                Math.sin(timeSec * 3.2 + n.pulsePhase) * 4.5 * smoothFactor;
              targetY +=
                Math.sin(angle) * strength * 0.42 +
                Math.cos(timeSec * 2.8 + n.pulsePhase) * 4.5 * smoothFactor;
            }
          }
        }

        if (
          !relaxMode &&
          !persistentHighlight &&
          n.colorIndex === null &&
          renderMode !== 'full_bloom'
        ) {
          n.targetHighlight = Math.max(0, n.targetHighlight - dt * 0.14);
        }

        const targetH = renderMode === 'full_bloom' ? 1 : n.targetHighlight;
        const highlightLerpSpeed = relaxMode ? 2.8 : width < 640 ? 3.4 : 6.5;
        n.highlightLevel += (targetH - n.highlightLevel) * Math.min(1, dt * highlightLerpSpeed);

        const springK = relaxMode ? 0.06 : 0.12;
        const damping = relaxMode ? 0.86 : 0.80;
        n.vx = (n.vx + (targetX - n.x) * springK) * damping;
        n.vy = (n.vy + (targetY - n.y) * springK) * damping;
        n.x += n.vx;
        n.y += n.vy;
      }

      hoveredNodeIdRef.current = relaxMode ? null : closestHoverId;

      // 4. Render Connecting Wireframe Filaments (Edges)
      const edges = edgesRef.current;
      const currentSessionIdx = activeSessionColorRef.current % LUMINOUS_PALETTE.length;
      ctx.lineCap = 'round';

      for (let i = 0; i < edges.length; i++) {
        const e = edges[i];
        if (renderMode === 'tension' && !e.isBridgeThread) {
          const na = nodes[e.a];
          const nb = nodes[e.b];
          if (!na.isPrimary && !nb.isPrimary) continue;
        }

        const na = nodes[e.a];
        const nb = nodes[e.b];

        const avgHighlight = (na.highlightLevel + nb.highlightLevel) * 0.5;
        const baseEdgeAlpha =
          renderMode === 'constellation'
            ? 0.14
            : renderMode === 'tension'
            ? e.isBridgeThread
              ? 0.26
              : 0.09
            : 0.05;

        const alpha = (baseEdgeAlpha + avgHighlight * 0.26) * (1 - e.distNorm * 0.35);

        if (alpha < 0.015) continue;

        ctx.beginPath();
        ctx.moveTo(na.x, na.y);

        if (e.isBridgeThread) {
          const swaySpeed = relaxMode ? 0.75 : 1.8;
          const midX =
            (na.x + nb.x) * 0.5 +
            Math.sin(timeSec * swaySpeed + na.pulsePhase) * (4 + avgHighlight * 5);
          const midY = (na.y + nb.y) * 0.5 + 3.5;
          ctx.quadraticCurveTo(midX, midY, nb.x, nb.y);
        } else {
          ctx.lineTo(nb.x, nb.y);
        }

        const idxA = na.colorIndex;
        const idxB = nb.colorIndex;

        if (idxA !== null || idxB !== null) {
          // Use the endpoint's color; if one endpoint just transitioned to the new session color, match it so lines and balls never clash
          const resolvedIdx =
            idxA !== null && idxB !== null
              ? idxA === currentSessionIdx || idxB === currentSessionIdx
                ? currentSessionIdx
                : idxA
              : (idxA ?? idxB)!;
          const rgb = LUMINOUS_PALETTE[resolvedIdx].rgb;
          ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${Math.min(0.55, alpha * 1.15)})`;
          ctx.lineWidth = e.isBridgeThread ? 1.15 : 0.8 + avgHighlight * 0.4;
        } else {
          const lumVal = Math.round(185 + avgHighlight * 50);
          ctx.strokeStyle = `rgba(${lumVal}, ${lumVal + 4}, 255, ${Math.min(0.48, alpha)})`;
          ctx.lineWidth = e.isBridgeThread
            ? 0.75 + avgHighlight * 0.5
            : 0.45 + avgHighlight * 0.45;
        }

        ctx.stroke();
      }

      // 5. Update and Render Traveling Synaptic Light Pulses along Filaments
      const pulses = pulsesRef.current;
      const spawnProb = relaxMode ? 0.18 : 0.12;
      if (Math.random() < spawnProb && edges.length > 0) {
        const randomEdge = edges[Math.floor(Math.random() * edges.length)];
        const na = nodes[randomEdge.a];
        const nb = nodes[randomEdge.b];
        if (randomEdge.isBridgeThread || na.highlightLevel > 0.35 || nb.highlightLevel > 0.35) {
          const rgb: [number, number, number] =
            na.colorIndex !== null
              ? LUMINOUS_PALETTE[na.colorIndex].rgb
              : nb.colorIndex !== null
              ? LUMINOUS_PALETTE[nb.colorIndex].rgb
              : [215, 228, 242];

          const flowUpward = !breathState || breathState.phaseLabel !== 'Expirar';
          const fromNode = flowUpward
            ? na.ny > nb.ny
              ? na.id
              : nb.id
            : na.ny < nb.ny
            ? na.id
            : nb.id;
          const toNode = fromNode === na.id ? nb.id : na.id;

          pulses.push({
            fromNode,
            toNode,
            progress: 0,
            speed: relaxMode ? 0.009 + Math.random() * 0.008 : 0.016 + Math.random() * 0.018,
            rgb,
          });
        }
      }

      for (let i = pulses.length - 1; i >= 0; i--) {
        const sp = pulses[i];
        sp.progress += sp.speed;
        if (sp.progress >= 1) {
          pulses.splice(i, 1);
          continue;
        }
        const na = nodes[sp.fromNode];
        const nb = nodes[sp.toNode];
        if (!na || !nb) continue;

        const px = na.x + (nb.x - na.x) * sp.progress;
        const py = na.y + (nb.y - na.y) * sp.progress;
        const sinAlpha = Math.sin(sp.progress * Math.PI);

        ctx.beginPath();
        ctx.arc(px, py, relaxMode ? 1.8 : 1.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${sp.rgb[0]}, ${sp.rgb[1]}, ${sp.rgb[2]}, ${sinAlpha * 0.58})`;
        ctx.fill();
      }

      // 6. Render Secondary Mesh Vertices & Pulsing Primary White Nodes
      const isPhone = width < 640;
      const mobileRadiusScale = isPhone ? 0.54 : width < 960 ? 0.76 : 1.0;
      const mobileHaloScale = isPhone ? 0.62 : width < 960 ? 0.82 : 1.0;

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];

        if (!n.isPrimary) {
          // On phone screens, keep secondary structural dots subtle so they don't clutter
          if (isPhone && i % 2 !== 0) continue;
          const vAlpha =
            ((renderMode === 'constellation' ? 0.26 : 0.12) + n.highlightLevel * 0.28) *
            lightIntensity;
          if (vAlpha < 0.03) continue;

          ctx.beginPath();
          ctx.arc(
            n.x,
            n.y,
            n.radius * mobileRadiusScale * (0.8 + n.highlightLevel * 0.3),
            0,
            Math.PI * 2
          );
          ctx.fillStyle = `rgba(220, 228, 240, ${Math.min(0.65, vAlpha)})`;
          ctx.fill();
          continue;
        }

        // Skip excess primary dots on phone/tablet so colored balls never obscure the sculpture drawing
        if (!isPrimaryActiveOnViewport(n.id, width)) continue;

        let normPulse: number;
        if (relaxMode && breathState) {
          const spatialPhase = (1 - n.ny) * 1.6;
          const gentleRipple = Math.sin(timeSec * 0.9 - spatialPhase) * 0.15;
          normPulse = Math.min(1, Math.max(0, breathState.breathValue * 0.85 + gentleRipple + 0.1));
        } else {
          const pulseWave = Math.sin(timeSec * n.pulseSpeed * pulseIntensity + n.pulsePhase);
          normPulse = (pulseWave + 1) * 0.5;
        }

        const highlightBoost = n.highlightLevel * 0.42;
        const effectivePulseIntensity = relaxMode ? 0.9 : pulseIntensity;
        const dynamicRadius =
          n.radius *
          mobileRadiusScale *
          (0.76 + normPulse * 0.38 * effectivePulseIntensity + highlightBoost) *
          n.gsapScale;

        let r = 244;
        let g = 246;
        let b = 252;

        if (n.colorIndex !== null && n.colorBlend > 0.01) {
          const targetRgb = LUMINOUS_PALETTE[n.colorIndex].rgb;
          r = Math.round(r + (targetRgb[0] - r) * n.colorBlend);
          g = Math.round(g + (targetRgb[1] - g) * n.colorBlend);
          b = Math.round(b + (targetRgb[2] - b) * n.colorBlend);
        }

        const haloRadius =
          dynamicRadius *
          mobileHaloScale *
          (1.85 + normPulse * 0.95 + n.highlightLevel * 1.05 + n.gsapFlash * 1.5);
        const haloAlpha =
          (0.08 +
            normPulse * 0.10 * effectivePulseIntensity +
            n.highlightLevel * 0.18 +
            (n.colorIndex !== null ? 0.11 : 0)) *
          lightIntensity;

        const grad = ctx.createRadialGradient(n.x, n.y, dynamicRadius * 0.2, n.x, n.y, haloRadius);
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${Math.min(0.85, haloAlpha)})`);
        grad.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, ${Math.min(0.45, haloAlpha * 0.42)})`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

        ctx.beginPath();
        ctx.arc(n.x, n.y, haloRadius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        const coreAlpha = Math.min(
          0.95,
          (0.42 + normPulse * 0.18 + n.highlightLevel * 0.24 + (n.colorIndex !== null ? 0.22 : 0)) *
            Math.max(0.35, lightIntensity)
        );
        ctx.beginPath();
        ctx.arc(n.x, n.y, dynamicRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${coreAlpha})`;
        ctx.fill();

        if (n.highlightLevel > 0.35 || n.colorIndex !== null) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, Math.max(0.65, dynamicRadius * 0.38), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.9, 0.72 * lightIntensity)})`;
          ctx.fill();
        }
      }

      // 7. Render Hovered Node Reticle Ring (Only when not in Relax Mode)
      if (!relaxMode && hoveredNodeIdRef.current !== null && p.active) {
        const hn = nodes[hoveredNodeIdRef.current];
        if (hn) {
          const ringR = hn.radius * 3.2 + Math.sin(timeSec * 6) * 1.4;
          ctx.beginPath();
          ctx.arc(hn.x, hn.y, ringR, 0, Math.PI * 2);
          const previewIdx =
            activeColorIndex === 'cycle'
              ? cycleCounterRef.current % LUMINOUS_PALETTE.length
              : activeColorIndex;
          const previewRgb = LUMINOUS_PALETTE[previewIdx].rgb;
          ctx.strokeStyle = `rgba(${previewRgb[0]}, ${previewRgb[1]}, ${previewRgb[2]}, 0.78)`;
          ctx.lineWidth = 1.25;
          ctx.stroke();
        }
      }

      // 8. Render GSAP Click & Breath Shockwave Ripples
      const ripples = ripplesRef.current;
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        if (rp.alpha <= 0.01) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rp.rgb[0]}, ${rp.rgb[1]}, ${rp.rgb[2]}, ${rp.alpha})`;
        ctx.lineWidth = relaxMode ? 1.25 : 1.6;
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [
    activeColorIndex,
    breathingPattern,
    brushRadius,
    lightIntensity,
    onBreathStateChange,
    onStatsChange,
    persistentHighlight,
    physicsMode,
    pulseIntensity,
    recomputeNodeBasePositions,
    relaxMode,
    renderMode,
    anchorX,
  ]);

  // Pointer event handlers (disabled when relaxMode is active)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (relaxMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const p = pointerRef.current;
    p.vx = x - p.rawX;
    p.vy = y - p.rawY;
    p.rawX = x;
    p.rawY = y;

    if (!p.active) {
      p.x = x;
      p.y = y;
      p.active = true;
    }

    quickPointerX.current?.(x);
    quickPointerY.current?.(y);

    const normX = (x / Math.max(1, rect.width) - 0.5) * 2;
    const normY = (y / Math.max(1, rect.height) - 0.5) * 2;
    quickNormX.current?.(normX);
    quickNormY.current?.(normY);
  };

  const handlePointerLeave = () => {
    pointerRef.current.active = false;
    pointerRef.current.isDown = false;
    pointerRef.current.holdRadius = 0;
    pointerRef.current.holdActivatedIds.clear();
    quickNormX.current?.(0);
    quickNormY.current?.(0);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (relaxMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Determine color for this click/hold: starts with Red (0), next click switches to Purple (1)
    const sessionColorIdx = cycleCounterRef.current % LUMINOUS_PALETTE.length;
    cycleCounterRef.current = (cycleCounterRef.current + 1) % LUMINOUS_PALETTE.length;
    activeSessionColorRef.current = sessionColorIdx;

    const p = pointerRef.current;
    p.active = true;
    p.rawX = x;
    p.rawY = y;
    p.x = x;
    p.y = y;
    p.isDown = true;
    p.downStartTime = performance.now() * 0.001;
    p.holdRadius = brushRadius * 0.45;
    p.holdBaseColorOffset = sessionColorIdx;
    p.holdActivatedIds.clear();
    lastHoldRippleTimeRef.current = p.downStartTime;

    triggerNodeClick(x, y, sessionColorIdx);
  };

  const handlePointerUp = () => {
    const p = pointerRef.current;
    p.isDown = false;
    p.holdRadius = 0;
    p.holdActivatedIds.clear();
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[#050507] overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`block w-full h-full touch-pan-y ${
          relaxMode ? 'cursor-default' : 'cursor-crosshair'
        }`}
        aria-label={
          relaxMode
            ? 'Modo Relaxamento ativo: a escultura pulsa autonomamente em padrões de respiração.'
            : 'Escultura interativa em malha de pontos pulsantes. Passe o mouse para despertar os pontos aos poucos e clique ou segure nos pontos brancos para espalhar a cor.'
        }
      />

      {/* Se a malha não carregar, mostra a escultura parada */}
      {loadError && (
        <img
          src={SCULPTURE_IMAGE_PATH}
          alt=""
          className="absolute inset-0 h-full w-full object-contain"
          style={{ objectPosition: `${Math.round(anchorX * 100)}% 52%` }}
        />
      )}
    </div>
  );
};
