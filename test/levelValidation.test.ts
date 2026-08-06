import { describe, it, expect } from 'vitest';
import { validateLevel, snapToGrid, ledgesTooClose, hasHeadroomBelow, isLedgeReachableFrom } from '@/systems/levelValidation';
import { generateLevel } from '@/systems/levelGenerator';
import { safeStepUp, gapWindowForStepUp } from '@/systems/jumpGeometry';
import { GAME, PLAYER_START, FLOOR_TOP_Y, PLAYER } from '@/config';
import type { Ledge } from '@/config/level';

function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

describe('snapToGrid', () => {
  it('округляет к ближайшему узлу сетки', () => {
    expect(snapToGrid(10, 10, 32)).toEqual({ x: 0, y: 0 });
    expect(snapToGrid(20, 50, 32)).toEqual({ x: 32, y: 64 });
    expect(snapToGrid(40, 40, 32)).toEqual({ x: 32, y: 32 });
  });

  it('по умолчанию использует размер тайла игры', () => {
    expect(snapToGrid(GAME.tileSize + 5, 0)).toEqual({ x: GAME.tileSize, y: 0 });
  });
});

describe('ledgesTooClose', () => {
  const a: Ledge = { leftX: 100, topY: 200, tiles: 2 };

  it('пересекающиеся уступы считаются слишком близкими', () => {
    const b: Ledge = { leftX: 110, topY: 200, tiles: 2 };
    expect(ledgesTooClose(a, b)).toBe(true);
  });

  it('уступы на достаточном расстоянии — не слишком близко', () => {
    const b: Ledge = { leftX: 100 + 2 * GAME.tileSize + 100, topY: 200, tiles: 2 };
    expect(ledgesTooClose(a, b)).toBe(false);
  });

  it('уступы на разной высоте (без пересечения по Y) не считаются близкими, даже вплотную по X', () => {
    const b: Ledge = { leftX: 100, topY: 200 + GAME.tileSize + 50, tiles: 2 };
    expect(ledgesTooClose(a, b)).toBe(false);
  });
});

describe('validateLevel', () => {
  it('уровень из процедурного генератора всегда допрыгиваем, без пересечений и в границах экрана', () => {
    // Генератор строит одну цепочку прыжков (jump-path), а не структуру для
    // хождения понизу — запас по высоте под уступом (noHeadroom) для него
    // не гарантирован и намеренно не проверяется здесь. Это дополнительная
    // проверка специально для редактора (ручная расстановка может создать
    // проходы понизу, которые должны оставаться проходимыми).
    for (const seed of [1, 2, 3, 42]) {
      const { ledges } = generateLevel(2, seeded(seed));
      const result = validateLevel(ledges, PLAYER_START, FLOOR_TOP_Y);
      const msg = `seed=${seed}: ${JSON.stringify(result)}`;
      expect(result.unreachable, msg).toEqual([]);
      expect(result.tooClose, msg).toEqual([]);
      expect(result.outOfBounds, msg).toEqual([]);
    }
  });

  it('находит недостижимый уступ (слишком высоко и далеко)', () => {
    const ledges: Ledge[] = [{ leftX: 400, topY: FLOOR_TOP_Y - 300, tiles: 2 }];
    const result = validateLevel(ledges, PLAYER_START, FLOOR_TOP_Y);
    expect(result.unreachable).toContain(0);
    expect(result.ok).toBe(false);
  });

  it('находит пересекающиеся уступы', () => {
    const ledges: Ledge[] = [
      { leftX: 150, topY: FLOOR_TOP_Y - 40, tiles: 2 },
      { leftX: 160, topY: FLOOR_TOP_Y - 40, tiles: 2 },
    ];
    const result = validateLevel(ledges, PLAYER_START, FLOOR_TOP_Y);
    expect(result.tooClose.length).toBeGreaterThan(0);
    expect(result.ok).toBe(false);
  });

  it('находит уступ за границей экрана', () => {
    const ledges: Ledge[] = [{ leftX: GAME.width + 10, topY: FLOOR_TOP_Y - 40, tiles: 2 }];
    const result = validateLevel(ledges, PLAYER_START, FLOOR_TOP_Y);
    expect(result.outOfBounds).toContain(0);
    expect(result.ok).toBe(false);
  });

  it('пустой уровень (без уступов) проходит валидацию', () => {
    const result = validateLevel([], PLAYER_START, FLOOR_TOP_Y);
    expect(result.ok).toBe(true);
  });

  it('находит уступ, под которым герою не хватает роста пройти', () => {
    const low: Ledge = { leftX: 100, topY: FLOOR_TOP_Y - PLAYER.height + 5, tiles: 2 };
    const result = validateLevel([low], PLAYER_START, FLOOR_TOP_Y);
    expect(result.noHeadroom).toContain(0);
    expect(result.ok).toBe(false);
  });

  it('не жалуется на высоту, если запаса ровно достаточно', () => {
    const high: Ledge = { leftX: 100, topY: FLOOR_TOP_Y - PLAYER.height - GAME.tileSize, tiles: 2 };
    const result = validateLevel([high], PLAYER_START, FLOOR_TOP_Y);
    expect(result.noHeadroom).not.toContain(0);
  });
});

describe('hasHeadroomBelow', () => {
  it('хватает места над полом, если уступ высоко', () => {
    const ledge: Ledge = { leftX: 100, topY: FLOOR_TOP_Y - 100, tiles: 2 };
    expect(hasHeadroomBelow(ledge, [], FLOOR_TOP_Y)).toBe(true);
  });

  it('не хватает места, если уступ сидит прямо над полом', () => {
    const ledge: Ledge = { leftX: 100, topY: FLOOR_TOP_Y - 5, tiles: 2 };
    expect(hasHeadroomBelow(ledge, [], FLOOR_TOP_Y)).toBe(false);
  });

  it('учитывает другой уступ снизу, а не только пол', () => {
    const upper: Ledge = { leftX: 100, topY: 200, tiles: 2 };
    const lowerClose: Ledge = { leftX: 100, topY: 200 + GAME.tileSize + 5, tiles: 2 };
    expect(hasHeadroomBelow(upper, [upper, lowerClose], FLOOR_TOP_Y)).toBe(false);
  });

  it('не мешает уступ снизу, который не пересекается по X', () => {
    const upper: Ledge = { leftX: 100, topY: 200, tiles: 2 };
    const lowerFarAway: Ledge = { leftX: 500, topY: 200 + GAME.tileSize + 5, tiles: 2 };
    expect(hasHeadroomBelow(upper, [upper, lowerFarAway], FLOOR_TOP_Y)).toBe(true);
  });
});

describe('isLedgeReachableFrom', () => {
  it('достижим уступ в пределах безопасного прыжка от старта героя', () => {
    const stepUp = safeStepUp();
    const window = gapWindowForStepUp(stepUp)!;
    const gap = (window.min + window.max) / 2;
    const candidate: Ledge = { leftX: PLAYER_START.x + gap, topY: FLOOR_TOP_Y - stepUp, tiles: 2 };
    expect(isLedgeReachableFrom(candidate, { leftX: PLAYER_START.x, topY: FLOOR_TOP_Y })).toBe(true);
  });

  it('недостижим уступ слишком высоко и далеко', () => {
    const candidate: Ledge = { leftX: PLAYER_START.x + 400, topY: FLOOR_TOP_Y - 300, tiles: 2 };
    expect(isLedgeReachableFrom(candidate, { leftX: PLAYER_START.x, topY: FLOOR_TOP_Y })).toBe(false);
  });

  it('работает симметрично, когда сосед левее кандидата', () => {
    const from = { leftX: 400, topY: FLOOR_TOP_Y, tiles: 2 };
    const candidate: Ledge = { leftX: 300, topY: FLOOR_TOP_Y, tiles: 2 };
    expect(isLedgeReachableFrom(candidate, from)).toBe(true);
  });
});
