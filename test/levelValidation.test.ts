import { describe, it, expect } from 'vitest';
import { validateLevel, snapToGrid, ledgesTooClose } from '@/systems/levelValidation';
import { generateLevel } from '@/systems/levelGenerator';
import { GAME, PLAYER_START, FLOOR_TOP_Y } from '@/config';
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
  it('уровень из процедурного генератора всегда проходит валидацию', () => {
    for (const seed of [1, 2, 3, 42]) {
      const { ledges } = generateLevel(2, seeded(seed));
      const result = validateLevel(ledges, PLAYER_START, FLOOR_TOP_Y);
      expect(result.ok, `seed=${seed}: ${JSON.stringify(result)}`).toBe(true);
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
});
