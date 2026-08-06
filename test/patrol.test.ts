import { describe, it, expect } from 'vitest';
import { reverseAtBounds, canSeeTargetAnywhere, chaseDirection, shouldJumpToTarget } from '@/systems/patrol';
import { safeStepUp, gapWindowForStepUp } from '@/systems/jumpGeometry';

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

describe('обнаружение цели (по X и Y, не только на полу)', () => {
  it('видит цель рядом на той же высоте', () => {
    expect(canSeeTargetAnywhere(500, 300, 450, 300, 200, 140)).toBe(true);
  });

  it('не видит цель вне дальности по X', () => {
    expect(canSeeTargetAnywhere(500, 300, 100, 300, 200, 140)).toBe(false);
  });

  it('не видит цель вне дальности по Y', () => {
    expect(canSeeTargetAnywhere(500, 300, 450, 100, 200, 140)).toBe(false);
  });

  it('видит цель на уступе выше в пределах дальности по Y', () => {
    expect(canSeeTargetAnywhere(500, 300, 450, 200, 200, 140)).toBe(true);
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

describe('решение о прыжке к цели', () => {
  it('не прыгает, если цель ниже или на одном уровне', () => {
    expect(shouldJumpToTarget(500, 300, 550, 300)).toBe(false);
    expect(shouldJumpToTarget(500, 300, 550, 350)).toBe(false);
  });

  it('прыгает, если цель выше и допрыгиваемо по физике', () => {
    const stepUp = safeStepUp();
    const window = gapWindowForStepUp(stepUp)!;
    const gap = (window.min + window.max) / 2;
    expect(shouldJumpToTarget(500, 300, 500 + gap, 300 - stepUp)).toBe(true);
  });

  it('не прыгает, если цель выше предела прыжка', () => {
    expect(shouldJumpToTarget(500, 300, 520, 300 - 200)).toBe(false);
  });
});
