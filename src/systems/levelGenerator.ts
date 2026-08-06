import {
  GAME, FLOOR_TOP_Y, PLAYER_START,
  LEDGE_TILES, LEVEL_MIN_GAP, LEVEL_TOP_MARGIN, LEVEL_MIN_ABOVE_FLOOR,
  LEVEL_LEDGE_COUNT_BASE, LEVEL_LEDGE_COUNT_PER_LEVEL,
} from '@/config';
import type { Ledge } from '@/config/level';
import { safeStepUp, isReachableAtGap, gapWindowForStepUp } from './jumpGeometry';
import { ledgesTooClose } from './levelValidation';

export interface GeneratedLevel {
  ledges: Ledge[];
  fish: ReadonlyArray<{ x: number; y: number }>;
  /** Выход — последний уступ цепочки: до него нужно пройти весь путь прыжков от старта. */
  exit: { x: number; y: number };
}

const T = GAME.tileSize;
const LEDGE_WIDTH_PX = LEDGE_TILES * T;
const MIN_TOP_Y = LEVEL_TOP_MARGIN;
/** Нижняя грань уступа (topY + T) не опускается ближе LEVEL_MIN_ABOVE_FLOOR к полу. */
const MAX_TOP_Y = FLOOR_TOP_Y - T - LEVEL_MIN_ABOVE_FLOOR;
/** Сколько точек внутри допустимого окна дистанции проверяем на свободное место. */
const GAP_SEARCH_STEPS = 8;

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

/**
 * Слишком ли близко уступ к уже поставленным — не только к предыдущему.
 * padding=0 — абсолютный минимум: буквальное непересечение прямоугольников,
 * последняя линия защиты от наслаивания блоков. Общая проверка с редактором
 * уровней — см. `levelValidation.ts`.
 */
function tooCloseToAny(placed: readonly Ledge[], leftX: number, topY: number, padding: number): boolean {
  const candidate: Ledge = { leftX, topY, tiles: LEDGE_TILES };
  return placed.some((l) => ledgesTooClose(candidate, l, padding));
}

function placeAt(
  placed: readonly Ledge[],
  xDir: -1 | 1,
  prevLeftX: number,
  prevRightX: number,
  stepUp: number,
  topY: number,
  cleanGap: number,
  padding: number,
): Ledge | null {
  const worstGap = cleanGap + LEDGE_WIDTH_PX;
  const leftX = xDir === 1 ? prevRightX + cleanGap : prevLeftX - cleanGap - LEDGE_WIDTH_PX;
  const inBounds = leftX >= 0 && leftX <= GAME.width - LEDGE_WIDTH_PX;
  if (
    inBounds
    && !tooCloseToAny(placed, leftX, topY, padding)
    && isReachableAtGap(stepUp, cleanGap)
    && isReachableAtGap(stepUp, worstGap)
  ) {
    return { leftX, topY, tiles: LEDGE_TILES };
  }
  return null;
}

/**
 * Перебирает несколько дистанций внутри допустимого окна прыжка для
 * заданных stepUp/topY в одном направлении — зигзаг мог вернуться в занятую
 * X-область на этой высоте, один случайный гэп мог по невезению попасть
 * ровно в неё, а соседняя точка окна — уже нет.
 */
function tryDirection(
  placed: readonly Ledge[],
  xDir: -1 | 1,
  prevLeftX: number,
  prevRightX: number,
  stepUp: number,
  topY: number,
  padding: number,
): Ledge | null {
  const window = gapWindowForStepUp(stepUp);
  if (!window) return null;
  const cleanGapMin = Math.max(LEVEL_MIN_GAP, window.min);
  const cleanGapMax = window.max - LEDGE_WIDTH_PX;
  if (cleanGapMax < cleanGapMin) return null;

  for (let step = 0; step < GAP_SEARCH_STEPS; step += 1) {
    const t = step / (GAP_SEARCH_STEPS - 1);
    const cleanGap = cleanGapMin + t * (cleanGapMax - cleanGapMin);
    const ledge = placeAt(placed, xDir, prevLeftX, prevRightX, stepUp, topY, cleanGap, padding);
    if (ledge) return ledge;
  }
  return null;
}

/** Сколько высот внутри допрыгиваемого диапазона перебираем, если случайная высота занята. */
const TOPY_SEARCH_STEPS = 9;

/**
 * Пробует случайно сэмплированную высоту первой (сохраняет разнообразие
 * ярусов в обычном случае), а если там ни в одну сторону не нашлось
 * свободного места — перебирает сетку высот по всему диапазону, достижимому
 * прыжком от предыдущего уступа.
 */
function placeNextLedge(
  placed: readonly Ledge[],
  xDir: -1 | 1,
  otherDir: -1 | 1,
  prevLeftX: number,
  prevRightX: number,
  prevTopY: number,
  sampledTopY: number,
  reachableMinTopY: number,
  reachableMaxTopY: number,
  padding: number,
): Ledge | null {
  const topYCandidates = [sampledTopY];
  for (let k = 0; k < TOPY_SEARCH_STEPS; k += 1) {
    const t = k / (TOPY_SEARCH_STEPS - 1);
    topYCandidates.push(reachableMinTopY + t * (reachableMaxTopY - reachableMinTopY));
  }

  for (const topY of topYCandidates) {
    const stepUp = prevTopY - topY;
    const ledge =
      tryDirection(placed, xDir, prevLeftX, prevRightX, stepUp, topY, padding)
      ?? tryDirection(placed, otherDir, prevLeftX, prevRightX, stepUp, topY, padding);
    if (ledge) return ledge;
  }
  return null;
}

/**
 * Крайний случай: предыдущий уступ зажат у края экрана, а единственный
 * доступный коридор в пределах безопасного прыжка целиком занят более
 * ранним уступом цепочки (зигзаг вернулся в старую X-область). Такого не
 * должно происходить на экране такого размера при заданных константах, но
 * геометрически исключить это для абсолютно любой случайной цепочки нельзя.
 * Наслаивание блоков недопустимо ни при каких условиях (см. `tooCloseToAny`),
 * поэтому здесь ищем свободное место, отпустив только требование
 * «дистанция входит в безопасное окно прыжка» — расширяем зазор шагами,
 * пока не найдём положение без пересечения с уже поставленными уступами.
 */
function lastResortLedge(placed: readonly Ledge[], prevLeftX: number, prevRightX: number, prevTopY: number, xDir: -1 | 1): Ledge {
  const topY = clamp(prevTopY, MIN_TOP_Y, MAX_TOP_Y);
  const otherDir: -1 | 1 = xDir === 1 ? -1 : 1;

  for (const dir of [xDir, otherDir]) {
    for (let step = 1; step <= 30; step += 1) {
      const gap = LEVEL_MIN_GAP * step;
      const leftX = dir === 1 ? prevRightX + gap : prevLeftX - gap - LEDGE_WIDTH_PX;
      const inBounds = leftX >= 0 && leftX <= GAME.width - LEDGE_WIDTH_PX;
      if (inBounds && !tooCloseToAny(placed, leftX, topY, 0)) {
        return { leftX, topY, tiles: LEDGE_TILES };
      }
    }
  }

  // Экран буквально весь занят — физически невозможно при текущих константах.
  // Ставим впритык к предыдущему, чтобы не сломать цепочку.
  const leftX = xDir === 1
    ? clamp(prevRightX + LEVEL_MIN_GAP, 0, GAME.width - LEDGE_WIDTH_PX)
    : clamp(prevLeftX - LEVEL_MIN_GAP - LEDGE_WIDTH_PX, 0, GAME.width - LEDGE_WIDTH_PX);
  return { leftX, topY, tiles: LEDGE_TILES };
}

export function ledgeCountForLevel(level: number): number {
  return LEVEL_LEDGE_COUNT_BASE + (level - 1) * LEVEL_LEDGE_COUNT_PER_LEVEL;
}

/**
 * Строит цепочку уступов: каждый следующий гарантированно допрыгиваем с
 * предыдущего — и с разбега (чистый зазор между краями), и без разбега
 * (от дальнего края предыдущего уступа, «худший случай» из jumpGeometry.ts).
 * Направление по X случайно виляет и отражается от краёв экрана; высота
 * сэмплируется из полного диапазона, достижимого прыжком от предыдущего
 * уступа. Ни один уступ не встаёт ближе LEVEL_MIN_GAP к уже поставленным —
 * не только к соседнему по цепочке (иначе зигзаг может слепить два уступа
 * в один блок или пересечь их).
 * rng — внешний генератор случайных чисел (по умолчанию Math.random),
 * инъекция нужна для детерминированных тестов.
 */
export function generateLevel(level: number, rng: () => number = Math.random): GeneratedLevel {
  const count = ledgeCountForLevel(level);
  const ledges: Ledge[] = [];

  let prevLeftX: number = PLAYER_START.x;
  let prevRightX: number = PLAYER_START.x;
  let prevTopY: number = FLOOR_TOP_Y;
  let xDir: -1 | 1 = 1;

  for (let i = 0; i < count; i += 1) {
    // Разворачиваем зигзаг заранее, если в текущем направлении не хватит места
    // даже под минимальный зазор и ширину следующего уступа — иначе гэп
    // потом приходится обрезать до 0 (или уступ вообще уезжает за экран).
    if (prevRightX > GAME.width - LEVEL_MIN_GAP - LEDGE_WIDTH_PX) xDir = -1;
    else if (prevLeftX < LEVEL_MIN_GAP + LEDGE_WIDTH_PX) xDir = 1;
    else if (rng() < 0.2) xDir = xDir === 1 ? -1 : 1;

    // Сэмплируем topY напрямую из всего диапазона, достижимого прыжком от
    // prevTopY (а не «случайный шаг, потом обрезать по границам экрана») —
    // иначе рядом с полом шаг вниз почти всегда обрезается в нулевой, и
    // уступы слипаются в один этаж вместо нескольких ярусов.
    const reachableMinTopY = Math.max(MIN_TOP_Y, prevTopY - safeStepUp());
    const reachableMaxTopY = Math.min(MAX_TOP_Y, prevTopY + safeStepUp());
    const sampledTopY = reachableMinTopY + rng() * (reachableMaxTopY - reachableMinTopY);
    const otherDir: -1 | 1 = xDir === 1 ? -1 : 1;

    // Основной проход держит полный визуальный отступ LEVEL_MIN_GAP от всех
    // уже поставленных уступов. Если экран настолько тесный, что во всём
    // допрыгиваемом диапазоне высот и дистанций места с отступом не нашлось
    // (уступ упёрся в край экрана, и единственное направление занято
    // соседом) — второй проход ищет место хотя бы без буквального
    // пересечения (padding=0): наслаивание блоков недопустимо ни при каких
    // условиях, а чуть уменьшенный зазор — приемлемый компромисс раз в тысячи уровней.
    const ledge =
      placeNextLedge(
        ledges, xDir, otherDir, prevLeftX, prevRightX, prevTopY,
        sampledTopY, reachableMinTopY, reachableMaxTopY, LEVEL_MIN_GAP,
      )
      ?? placeNextLedge(
        ledges, xDir, otherDir, prevLeftX, prevRightX, prevTopY,
        sampledTopY, reachableMinTopY, reachableMaxTopY, 0,
      )
      ?? lastResortLedge(ledges, prevLeftX, prevRightX, prevTopY, xDir);

    ledges.push(ledge);
    prevLeftX = ledge.leftX;
    prevRightX = ledge.leftX + LEDGE_WIDTH_PX;
    prevTopY = ledge.topY;
  }

  const fish = ledges.slice(0, -1).map((l) => ({ x: l.leftX + (l.tiles * T) / 2, y: l.topY - 22 }));
  const last = ledges[ledges.length - 1]!;
  const exit = { x: last.leftX + (last.tiles * T) / 2, y: last.topY };

  return { ledges, fish, exit };
}
