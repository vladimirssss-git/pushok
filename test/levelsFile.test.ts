import { describe, it, expect } from 'vitest';
import { isLevelData, parseLevelsPayload, renderCustomLevelsFile } from '../src/systems/levelsFile';
import type { LevelData } from '../src/config/level';

const level: LevelData = {
  ledges: [{ leftX: 160, topY: 256, tiles: 2 }],
  fish: [{ x: 144, y: 240 }],
  spikes: [{ x: 240, y: 328 }],
  exit: { x: 368, y: 328 },
  dogPatrol: { minX: 256, maxX: 580, y: 328 },
};

describe('isLevelData', () => {
  it('принимает уровень редактора', () => {
    expect(isLevelData(level)).toBe(true);
  });

  it('принимает уровень без шипов — поле опциональное', () => {
    const withoutSpikes: Record<string, unknown> = { ...level };
    delete withoutSpikes.spikes;
    expect(isLevelData(withoutSpikes)).toBe(true);
  });

  it('отвергает мусор вместо координат', () => {
    expect(isLevelData({ ...level, exit: { x: '0); rm -rf /', y: 0 } })).toBe(false);
    expect(isLevelData({ ...level, ledges: [{ leftX: NaN, topY: 0, tiles: 2 }] })).toBe(false);
    expect(isLevelData({ ...level, dogPatrol: { minX: 0, maxX: 10 } })).toBe(false);
    expect(isLevelData(null)).toBe(false);
  });
});

describe('parseLevelsPayload', () => {
  it('разбирает таблицу уровней', () => {
    const parsed = parseLevelsPayload(JSON.stringify({ 2: level }));
    expect(parsed[2]).toEqual(level);
  });

  it('отвергает номер уровня вне диапазона и нечисловой ключ', () => {
    expect(() => parseLevelsPayload(JSON.stringify({ 99: level }))).toThrow();
    expect(() => parseLevelsPayload(JSON.stringify({ 0: level }))).toThrow();
    expect(() => parseLevelsPayload(JSON.stringify({ ляля: level }))).toThrow();
  });

  it('отвергает не-объект и битый уровень', () => {
    expect(() => parseLevelsPayload('[]')).toThrow();
    expect(() => parseLevelsPayload(JSON.stringify({ 1: { ledges: [] } }))).toThrow();
  });
});

describe('renderCustomLevelsFile', () => {
  it('пишет уровни по возрастанию номера', () => {
    const file = renderCustomLevelsFile({ 3: level, 1: level });
    expect(file.indexOf('\n  1: ')).toBeLessThan(file.indexOf('\n  3: '));
  });

  it('выбрасывает поля, которых нет в LevelData', () => {
    const dirty = { ...level, взлом: 'console.log(1)' } as unknown as LevelData;
    expect(renderCustomLevelsFile({ 1: dirty })).not.toContain('взлом');
  });

  it('не пишет пустой массив шипов, но пишет непустой', () => {
    expect(renderCustomLevelsFile({ 1: { ...level, spikes: [] } })).not.toContain('spikes');
    expect(renderCustomLevelsFile({ 1: level })).toContain('"spikes"');
  });

  it('результат — валидный TS-модуль с ожидаемым экспортом', () => {
    const file = renderCustomLevelsFile({ 1: level });
    expect(file).toContain("import type { LevelData } from './level';");
    expect(file).toContain('export const CUSTOM_LEVELS: Partial<Record<number, LevelData>> = {');
    expect(file.trimEnd().endsWith('};')).toBe(true);
  });
});
