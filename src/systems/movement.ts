import { PHYSICS } from '@/config';

export interface JumpState {
  /** Время последнего касания земли, мс */
  lastGroundedMs: number;
  /** Время последнего нажатия прыжка, мс */
  lastJumpPressedMs: number;
}

/**
 * Coyote time + jump buffer: прыжок засчитывается, если игрок недавно был на земле
 * и недавно нажал прыжок. Без этого управление ощущается «залипающим».
 */
export function shouldJump(state: JumpState, onGround: boolean, nowMs: number): boolean {
  const coyoteOk = onGround || nowMs - state.lastGroundedMs <= PHYSICS.coyoteTimeMs;
  const bufferOk = nowMs - state.lastJumpPressedMs <= PHYSICS.jumpBufferMs;
  return coyoteOk && bufferOk;
}

/** Горизонтальная скорость по вводу: -1 влево, 0 стоп, 1 вправо. */
export function horizontalVelocity(direction: -1 | 0 | 1): number {
  return direction * PHYSICS.runSpeed;
}
