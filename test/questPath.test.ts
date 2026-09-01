import { describe, expect, it } from 'vitest';
import { advanceProgress, destinationOnPath, pointAtProgress, projectToPath } from '@/systems/questPath';

const path = [
  { x: 0, y: 10 },
  { x: 100, y: 10 },
  { x: 100, y: 60 },
];

describe('questPath', () => {
  it('projects a tap onto the nearest route segment', () => {
    expect(projectToPath({ x: 45, y: 16 }, path)).toEqual({
      point: { x: 45, y: 10 }, progress: 45, distance: 6,
    });
  });

  it('accepts taps inside the route corridor', () => {
    expect(destinationOnPath({ x: 94, y: 31 }, path, 7)).toEqual({
      point: { x: 100, y: 31 }, progress: 121, distance: 6,
    });
  });

  it('rejects water or air outside the route corridor', () => {
    expect(destinationOnPath({ x: 40, y: 40 }, path, 12)).toBeNull();
  });

  it('returns a point by travelled route distance', () => {
    expect(pointAtProgress(path, 125)).toEqual({ x: 100, y: 35 });
  });

  it('advances toward a target in either direction without overshooting', () => {
    expect(advanceProgress(10, 30, 8)).toBe(18);
    expect(advanceProgress(30, 10, 8)).toBe(22);
    expect(advanceProgress(10, 14, 8)).toBe(14);
  });
});
