import { describe, it, expect } from 'vitest';
import {
  maxJumpHeight,
  maxJumpDistance,
  isReachable,
  isReachableAtGap,
  safeStepUp,
  safeGap,
} from '@/systems/jumpGeometry';
import { LEVEL_1_LEDGES, FLOOR_TOP_Y, GAME, PLAYER_START, worstCaseGap } from '@/config';

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

describe('уступ достижим синхронно по высоте и времени, а не только по пределам', () => {
  // isReachable проверяет stepUp и gap независимо — этого недостаточно.
  // Баг: уступ считался «достижимым» по обоим пределам, но игрок всё равно
  // не допрыгивал, потому что к моменту, когда он долетал горизонтально
  // до передней грани уступа, высоты уже не хватало — он врезался в торец.
  // https://github.com/vladimirssss-git/pushok — devlog 2026-08-05.

  it('прыжок с разбега (от дальнего края) долетает уже на нужной высоте', () => {
    for (let i = 1; i < LEVEL_1_LEDGES.length; i += 1) {
      const from = LEVEL_1_LEDGES[i - 1]!;
      const to = LEVEL_1_LEDGES[i]!;
      const stepUp = from.topY - to.topY;
      const bestCaseGap = to.leftX - (from.leftX + from.tiles * GAME.tileSize);

      expect(
        isReachableAtGap(stepUp, bestCaseGap),
        `уступ ${i} недостижим с разбега`,
      ).toBe(true);
    }
  });

  it('прыжок без разбега (сразу после посадки у ближнего края) тоже долетает', () => {
    for (let i = 1; i < LEVEL_1_LEDGES.length; i += 1) {
      const from = LEVEL_1_LEDGES[i - 1]!;
      const to = LEVEL_1_LEDGES[i]!;
      const stepUp = from.topY - to.topY;

      expect(
        isReachableAtGap(stepUp, worstCaseGap()),
        `уступ ${i} недостижим без разбега — игрок мог приземлиться у ближнего края`,
      ).toBe(true);
    }
  });

  it('первый прыжок (пол → уступ 1) от старта игрока не впритык', () => {
    const first = LEVEL_1_LEDGES[0]!;
    const stepUp = FLOOR_TOP_Y - first.topY;
    const gapFromStart = first.leftX - PLAYER_START.x;

    expect(isReachableAtGap(stepUp, gapFromStart)).toBe(true);
  });
});
