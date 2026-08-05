import { describe, it, expect } from 'vitest';
import { shouldJump, horizontalVelocity } from '@/systems/movement';
import { PHYSICS } from '@/config';

describe('movement', () => {
  it('прыжок засчитывается сразу после схода с платформы (coyote time)', () => {
    const state = { lastGroundedMs: 1000, lastJumpPressedMs: 1050 };
    expect(shouldJump(state, false, 1050)).toBe(true);
  });

  it('после истечения coyote time прыжок в воздухе не проходит', () => {
    const state = { lastGroundedMs: 1000, lastJumpPressedMs: 1300 };
    expect(shouldJump(state, false, 1300)).toBe(false);
  });

  it('нажатие до приземления буферизуется', () => {
    const state = { lastGroundedMs: -9999, lastJumpPressedMs: 2000 };
    expect(shouldJump(state, true, 2000 + PHYSICS.jumpBufferMs - 1)).toBe(true);
    expect(shouldJump(state, true, 2000 + PHYSICS.jumpBufferMs + 50)).toBe(false);
  });

  it('скорость по направлению', () => {
    expect(horizontalVelocity(0)).toBe(0);
    expect(horizontalVelocity(1)).toBe(PHYSICS.runSpeed);
    expect(horizontalVelocity(-1)).toBe(-PHYSICS.runSpeed);
  });
});
