import { describe, it, expect } from 'vitest';
import { reverseAtBounds, canSeeTarget, chaseDirection } from '@/systems/patrol';

describe('патрулирование врага', () => {
  it('сохраняет направление в середине маршрута', () => {
    expect(reverseAtBounds(50, 0, 100, 1)).toBe(1);
    expect(reverseAtBounds(50, 0, 100, -1)).toBe(-1);
  });

  it('разворачивает на правой границе', () => {
    expect(reverseAtBounds(100, 0, 100, 1)).toBe(-1);
  });

  it('разворачивает на левой границе', () => {
    expect(reverseAtBounds(0, 0, 100, -1)).toBe(1);
  });

  it('за пределами границ тоже разворачивает', () => {
    expect(reverseAtBounds(120, 0, 100, 1)).toBe(-1);
    expect(reverseAtBounds(-20, 0, 100, -1)).toBe(1);
  });
});

describe('обнаружение цели', () => {
  const floorY = 300;

  it('видит цель на полу в пределах дальности', () => {
    expect(canSeeTarget(500, 450, floorY, floorY, 200, 20)).toBe(true);
  });

  it('не видит цель на полу вне дальности', () => {
    expect(canSeeTarget(500, 100, floorY, floorY, 200, 20)).toBe(false);
  });

  it('не видит цель на уступе (выше пола больше допуска)', () => {
    expect(canSeeTarget(500, 450, floorY - 45, floorY, 200, 20)).toBe(false);
  });

  it('видит цель чуть выше пола в пределах допуска', () => {
    expect(canSeeTarget(500, 450, floorY - 10, floorY, 200, 20)).toBe(true);
  });
});

describe('направление погони', () => {
  it('бежит влево, если цель левее', () => {
    expect(chaseDirection(500, 300)).toBe(-1);
  });

  it('бежит вправо, если цель правее', () => {
    expect(chaseDirection(500, 700)).toBe(1);
  });
});
