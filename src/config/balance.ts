/** Баланс: здоровье, урон, экономика. Единственный источник этих чисел. */
export const BALANCE = {
  startingLives: 3,
  fishPerExtraLife: 20,
  hazardDamage: 1,
  /** Неуязвимость после урона, мс */
  invulnerabilityMs: 900,
} as const;
