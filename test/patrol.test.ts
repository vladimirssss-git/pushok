import { describe, it, expect } from 'vitest';
import { reverseAtBounds } from '@/systems/patrol';

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
