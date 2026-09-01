export interface PathPoint {
  x: number;
  y: number;
}

export interface PathProjection {
  point: PathPoint;
  progress: number;
  distance: number;
}

function segmentLength(a: PathPoint, b: PathPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Ближайшая к тапу точка ломаной и её длина от начала маршрута. */
export function projectToPath(tap: PathPoint, points: readonly PathPoint[]): PathProjection | null {
  if (points.length < 2) return null;

  let best: PathProjection | null = null;
  let progressBefore = 0;

  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    const length = Math.sqrt(lengthSquared);
    if (lengthSquared === 0) continue;

    const rawT = ((tap.x - a.x) * dx + (tap.y - a.y) * dy) / lengthSquared;
    const t = Math.max(0, Math.min(1, rawT));
    const point = { x: a.x + dx * t, y: a.y + dy * t };
    const distance = Math.hypot(tap.x - point.x, tap.y - point.y);
    const projection = { point, progress: progressBefore + length * t, distance };

    if (!best || projection.distance < best.distance) best = projection;
    progressBefore += length;
  }

  return best;
}

/** Принимает только тап внутри разрешённого коридора вокруг маршрута. */
export function destinationOnPath(
  tap: PathPoint,
  points: readonly PathPoint[],
  tolerance: number,
): PathProjection | null {
  const projection = projectToPath(tap, points);
  return projection && projection.distance <= tolerance ? projection : null;
}

/** Возвращает координату на ломаной по длине от её начала. */
export function pointAtProgress(points: readonly PathPoint[], progress: number): PathPoint | null {
  if (points.length === 0) return null;
  if (points.length === 1) return { ...points[0] };

  const total = totalPathLength(points);
  let remaining = Math.max(0, Math.min(total, progress));

  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const length = segmentLength(a, b);
    if (length === 0) continue;
    if (remaining <= length) {
      const t = remaining / length;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    remaining -= length;
  }

  return { ...points[points.length - 1] };
}

export function totalPathLength(points: readonly PathPoint[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) total += segmentLength(points[i], points[i + 1]);
  return total;
}

/** Сдвигает прогресс к цели не дальше maxDistance, одинаково в обе стороны. */
export function advanceProgress(current: number, target: number, maxDistance: number): number {
  if (maxDistance <= 0) return current;
  const delta = target - current;
  if (Math.abs(delta) <= maxDistance) return target;
  return current + Math.sign(delta) * maxDistance;
}
