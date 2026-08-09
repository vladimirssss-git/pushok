import { describe, it, expect } from 'vitest';
import { zoneOf, stickDirection, recenterOrigin, knobOffset } from '@/systems/touchStick';

describe('touchStick', () => {
  it('левая доля экрана — движение, остальное — прыжок', () => {
    expect(zoneOf(10, 640, 0.5)).toBe('move');
    expect(zoneOf(319, 640, 0.5)).toBe('move');
    expect(zoneOf(320, 640, 0.5)).toBe('jump');
    expect(zoneOf(639, 640, 0.5)).toBe('jump');
  });

  it('внутри мёртвой зоны Пушок стоит', () => {
    expect(stickDirection(0, 6)).toBe(0);
    expect(stickDirection(5, 6)).toBe(0);
    expect(stickDirection(-5, 6)).toBe(0);
  });

  it('за мёртвой зоной направление по знаку сдвига', () => {
    expect(stickDirection(6, 6)).toBe(1);
    expect(stickDirection(40, 6)).toBe(1);
    expect(stickDirection(-6, 6)).toBe(-1);
    expect(stickDirection(-40, 6)).toBe(-1);
  });

  it('база стоит на месте, пока палец внутри радиуса', () => {
    expect(recenterOrigin(100, 120, 34)).toBe(100);
    expect(recenterOrigin(100, 80, 34)).toBe(100);
  });

  it('база едет за пальцем, если он ушёл дальше радиуса', () => {
    expect(recenterOrigin(100, 200, 34)).toBe(166);
    expect(recenterOrigin(100, 20, 34)).toBe(54);
  });

  it('шляпка не вылезает за радиус базы', () => {
    expect(knobOffset(10, 34)).toBe(10);
    expect(knobOffset(-10, 34)).toBe(-10);
    expect(knobOffset(500, 34)).toBe(34);
    expect(knobOffset(-500, 34)).toBe(-34);
  });
});
