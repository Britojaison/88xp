'use client';

import { useEffect, useState } from 'react';
import { FallingLeaves } from 'falling-leaves/react';
import type { LeafShape } from 'falling-leaves';

/**
 * Checks if current month is fall (September=8, October=9, November=10).
 */
export function isFall(): boolean {
  const month = new Date().getMonth();
  return month >= 8 && month <= 10;
}

export interface FallingLeavesEffectProps {
  /**
   * Only show leaves in the fall (September, October, November).
   * Defaults to false so the effect is visible whenever desired.
   */
  onlyInFall?: boolean;
  /** Number of leaves on screen at once. Default 30. */
  count?: number;
  /** Built-in leaf shapes to mix: 'maple', 'oak', 'ginkgo', 'birch', 'oval'. Default: ['maple', 'oak', 'ginkgo', 'birch'] */
  shapes?: LeafShape[];
  /** Custom leaf colors. Default is the rich autumn palette */
  colors?: string[];
  /** Steady sideways drift in pixels per frame. Negative blows left. Default: [-0.3, 0.8] */
  wind?: number | [number, number];
  /** Fall speed in pixels per frame. Default: [0.6, 1.5] */
  speed?: number | [number, number];
  /** Leaf size in CSS pixels. Default: [14, 30] */
  size?: number | [number, number];
  /** Sway amount. Default: [0.4, 1.4] */
  sway?: number | [number, number];
  /** Custom leaf images */
  images?: CanvasImageSource[];
  /** zIndex of the fullScreen overlay. Default: 9999 (pointer-events: none is applied) */
  zIndex?: number;
  /** Leaf opacity, 0–1. Default 1 */
  opacity?: number;
}

export default function FallingLeavesEffect({
  onlyInFall = false,
  count = 32,
  shapes = ['maple', 'oak', 'ginkgo', 'birch'],
  colors,
  wind = [-0.3, 0.8],
  speed = [0.6, 1.5],
  size = [16, 32],
  sway = [0.5, 1.5],
  images,
  zIndex = 9999,
  opacity = 0.9,
}: FallingLeavesEffectProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (onlyInFall && !isFall()) {
    return null;
  }

  return (
    <FallingLeaves
      fullScreen
      count={count}
      shapes={shapes}
      colors={colors}
      wind={wind}
      speed={speed}
      size={size}
      sway={sway}
      images={images}
      zIndex={zIndex}
      opacity={opacity}
    />
  );
}

