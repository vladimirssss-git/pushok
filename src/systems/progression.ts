import { BALANCE } from '@/config';

/** Сколько дополнительных жизней даёт указанное количество рыбок. */
export function extraLivesFromFish(fish: number): number {
  if (fish <= 0) return 0;
  return Math.floor(fish / BALANCE.fishPerExtraLife);
}

/** Применяет урон с учётом неуязвимости. Чистая функция — вся логика урона здесь. */
export function applyDamage(
  lives: number,
  amount: number,
  invulnerableUntilMs: number,
  nowMs: number,
): { lives: number; invulnerableUntilMs: number; damaged: boolean } {
  if (nowMs < invulnerableUntilMs) {
    return { lives, invulnerableUntilMs, damaged: false };
  }
  return {
    lives: Math.max(0, lives - amount),
    invulnerableUntilMs: nowMs + BALANCE.invulnerabilityMs,
    damaged: true,
  };
}

export function isGameOver(lives: number): boolean {
  return lives <= 0;
}
