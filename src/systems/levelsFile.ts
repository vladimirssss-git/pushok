import type { LevelData } from '../config/level';
import { MAX_LEVEL } from '../config/level';

/**
 * Генерация и разбор `src/config/customLevels.ts` — файла с авторскими
 * уровнями. Чистый модуль без Phaser: его импортирует и редактор (кнопка
 * «Сохранить»), и dev-плагин Vite, который этим файлом перезаписывает
 * реальный `src/config/customLevels.ts` на диске.
 *
 * Импорты здесь только относительные: `vite.config.ts` собирается esbuild'ом
 * без нашего алиаса `@`.
 */

const MAX_COORD = 10000;

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= MAX_COORD;
}

function isPoint(v: unknown): v is { x: number; y: number } {
  const p = v as { x: unknown; y: unknown } | null;
  return !!p && typeof p === 'object' && isFiniteNumber(p.x) && isFiniteNumber(p.y);
}

function isPointList(v: unknown): v is Array<{ x: number; y: number }> {
  return Array.isArray(v) && v.every(isPoint);
}

/**
 * Строгая проверка формы уровня. Нужна не для удобства, а как граница
 * доверия: то, что пройдёт эту проверку, будет записано в исходник
 * репозитория, поэтому принимаем только известные поля известных типов.
 */
export function isLevelData(value: unknown): value is LevelData {
  const d = value as Partial<LevelData> | null;
  if (!d || typeof d !== 'object') return false;

  const ledgesOk = Array.isArray(d.ledges) && d.ledges.every((l) => (
    !!l && typeof l === 'object'
    && isFiniteNumber(l.leftX) && isFiniteNumber(l.topY)
    && isFiniteNumber(l.tiles) && l.tiles > 0
  ));
  const patrol = d.dogPatrol as Partial<LevelData['dogPatrol']> | undefined;
  const patrolOk = !!patrol && typeof patrol === 'object'
    && isFiniteNumber(patrol.minX) && isFiniteNumber(patrol.maxX) && isFiniteNumber(patrol.y);

  return ledgesOk
    && isPointList(d.fish)
    && (d.spikes === undefined || isPointList(d.spikes))
    && isPoint(d.exit)
    && patrolOk;
}

/**
 * Разбирает то, что прислал редактор. Бросает при любой неожиданности —
 * лучше отказать в сохранении, чем записать мусор в исходник.
 */
export function parseLevelsPayload(raw: string): Partial<Record<number, LevelData>> {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Ожидался объект { номер уровня: уровень }');
  }

  const out: Partial<Record<number, LevelData>> = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    const level = Number(key);
    if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL) {
      throw new Error(`Недопустимый номер уровня: ${key}`);
    }
    if (!isLevelData(value)) throw new Error(`Уровень ${key} не похож на LevelData`);
    out[level] = value;
  }
  return out;
}

/**
 * Собирает содержимое `customLevels.ts`. Пересобирает каждый уровень поле за
 * полем, а не сериализует пришедший объект целиком: так в исходник не попадёт
 * ничего, чего нет в `LevelData`.
 */
export function renderCustomLevelsFile(levels: Partial<Record<number, LevelData>>): string {
  const body = Object.entries(levels)
    .map(([lvl, data]) => [Number(lvl), data] as const)
    .filter((entry): entry is readonly [number, LevelData] => !!entry[1])
    .sort(([a], [b]) => a - b)
    .map(([lvl, data]) => {
      const clean: LevelData = {
        ledges: data.ledges.map((l) => ({ leftX: l.leftX, topY: l.topY, tiles: l.tiles })),
        fish: data.fish.map((f) => ({ x: f.x, y: f.y })),
        exit: { x: data.exit.x, y: data.exit.y },
        dogPatrol: { minX: data.dogPatrol.minX, maxX: data.dogPatrol.maxX, y: data.dogPatrol.y },
      };
      if (data.spikes?.length) clean.spikes = data.spikes.map((s) => ({ x: s.x, y: s.y }));
      return `  ${lvl}: ${JSON.stringify(clean, null, 2).replace(/\n/g, '\n  ')},`;
    })
    .join('\n');

  return `import type { LevelData } from './level';

/**
 * Уровни, собранные вручную в редакторе (\`?editor\` → «Сохранить»).
 * ФАЙЛ СГЕНЕРИРОВАН АВТОМАТИЧЕСКИ — правки руками затрутся следующим
 * сохранением из редактора.
 *
 * Уровень отсюда становится дефолтным для всех игроков после деплоя:
 * \`GameScene\` берёт запись по номеру уровня вместо процедурной генерации.
 */
export const CUSTOM_LEVELS: Partial<Record<number, LevelData>> = {
${body}
};
`;
}
