import { describe, it, expect } from 'vitest';
import { extraLivesFromFish, applyDamage, isGameOver } from '@/systems/progression';
import { BALANCE } from '@/config';

describe('progression', () => {
  it('дополнительная жизнь выдаётся за каждые N рыбок', () => {
    expect(extraLivesFromFish(0)).toBe(0);
    expect(extraLivesFromFish(BALANCE.fishPerExtraLife - 1)).toBe(0);
    expect(extraLivesFromFish(BALANCE.fishPerExtraLife)).toBe(1);
    expect(extraLivesFromFish(BALANCE.fishPerExtraLife * 2 + 3)).toBe(2);
  });

  it('во время неуязвимости урон не проходит', () => {
    const r = applyDamage(3, 1, 5000, 4000);
    expect(r.damaged).toBe(false);
    expect(r.lives).toBe(3);
  });

  it('урон снимает жизнь и включает неуязвимость', () => {
    const r = applyDamage(3, 1, 0, 1000);
    expect(r.damaged).toBe(true);
    expect(r.lives).toBe(2);
    expect(r.invulnerableUntilMs).toBe(1000 + BALANCE.invulnerabilityMs);
  });

  it('жизни не уходят в минус', () => {
    expect(applyDamage(1, 5, 0, 0).lives).toBe(0);
    expect(isGameOver(0)).toBe(true);
    expect(isGameOver(1)).toBe(false);
  });
});
