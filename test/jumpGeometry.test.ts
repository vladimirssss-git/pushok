import { describe, it, expect } from 'vitest';
import {
  maxJumpHeight,
  maxJumpDistance,
  isReachable,
  safeStepUp,
  safeGap,
} from '@/systems/jumpGeometry';
import { LEVEL_1_LEDGES, FLOOR_TOP_Y, GAME } from '@/config';

describe('геометрия прыжка', () => {
  it('высота прыжка считается из физики, а не берётся на глаз', () => {
    // v = 470, g = 1400 → h = v²/2g ≈ 78.9
    expect(maxJumpHeight()).toBeCloseTo(78.9, 1);
  });

  it('дальность прыжка положительна и больше ширины тайла', () => {
    expect(maxJumpDistance()).toBeGreaterThan(GAME.tileSize);
  });

  it('запас прочности меньше предела', () => {
    expect(safeStepUp()).toBeLessThan(maxJumpHeight());
    expect(safeGap()).toBeLessThan(maxJumpDistance());
  });
});

describe('уровень 1 проходим', () => {
  const surfaces = [
    { leftX: 0, topY: FLOOR_TOP_Y, rightX: GAME.width },
    ...LEVEL_1_LEDGES.map((l) => ({
      leftX: l.leftX,
      topY: l.topY,
      rightX: l.leftX + l.tiles * GAME.tileSize,
    })),
  ];

  it('каждый следующий уступ достижим с предыдущего', () => {
    for (let i = 1; i < surfaces.length; i += 1) {
      const from = surfaces[i - 1]!;
      const to = surfaces[i]!;
      const stepUp = from.topY - to.topY;
      const gap = Math.max(0, to.leftX - from.rightX);

      expect(
        isReachable(stepUp, gap),
        `уступ ${i} недостижим: подъём ${stepUp}px при пределе ${maxJumpHeight().toFixed(1)}px, ` +
          `разрыв ${gap}px при пределе ${maxJumpDistance().toFixed(1)}px`,
      ).toBe(true);
    }
  });

  it('подъёмы и разрывы уложены в запас прочности, а не впритык к пределу', () => {
    for (let i = 1; i < surfaces.length; i += 1) {
      const from = surfaces[i - 1]!;
      const to = surfaces[i]!;
      expect(from.topY - to.topY).toBeLessThanOrEqual(safeStepUp());
      expect(Math.max(0, to.leftX - from.rightX)).toBeLessThanOrEqual(safeGap());
    }
  });

  it('уступы не уходят за верхнюю границу экрана', () => {
    for (const l of LEVEL_1_LEDGES) {
      expect(l.topY).toBeGreaterThan(0);
    }
  });
});
