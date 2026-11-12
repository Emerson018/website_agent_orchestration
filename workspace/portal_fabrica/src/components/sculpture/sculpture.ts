export type RenderMode = 'hybrid' | 'constellation' | 'tension' | 'full_bloom';

export type PhysicsMode = 'fluid' | 'attract' | 'repel';

export type BreathingPattern = 'coherence' | 'box_478' | 'ocean_wave';

export interface BreathState {
  phaseLabel: 'Inspirar' | 'Sustentar' | 'Expirar';
  phaseProgress: number; // 0..1 within current phase
  breathValue: number; // 0..1 overall lung/sculpture expansion
  cycleSeconds: number;
}

export interface ColorSwatch {
  id: string;
  name: string;
  hex: string;
  rgb: [number, number, number];
  glowHex: string;
}

export interface SculptureNode {
  id: number;
  // Normalized image coordinates [0..1]
  nx: number;
  ny: number;
  // Base canvas coordinates
  baseX: number;
  baseY: number;
  // Current animated canvas coordinates
  x: number;
  y: number;
  // Velocity for smooth spring return
  vx: number;
  vy: number;
  // GSAP-driven extra offset & scale
  gsapScale: number;
  gsapFlash: number;
  // Depth [0..1] derived from luminance
  z: number;
  // Luminance [0..255]
  luminance: number;
  // Whether this is one of the bright white focal points vs fine background mesh vertex
  isPrimary: boolean;
  // Anatomical region for organic counter-breathing
  region: 'hand' | 'bridge' | 'head' | 'dust';
  // Base radius
  radius: number;
  // Pulse phase and speed
  pulsePhase: number;
  pulseSpeed: number;
  // Progressive highlight level [0..1] from hovering over the sculpture
  highlightLevel: number;
  // Target highlight level
  targetHighlight: number;
  // Assigned color when clicked (null = pure luminous white)
  colorIndex: number | null;
  // Color transition blend [0..1] animated by GSAP
  colorBlend: number;
  // Connected neighbor node indices
  neighbors: number[];
}

export interface FilamentEdge {
  a: number;
  b: number;
  distNorm: number;
  isBridgeThread: boolean;
}

export interface ClickRipple {
  id: number;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  rgb: [number, number, number];
}

export interface SynapticPulse {
  fromNode: number;
  toNode: number;
  progress: number;
  speed: number;
  rgb: [number, number, number];
}
