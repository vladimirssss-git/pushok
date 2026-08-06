import { GAME } from './game';

/** Раскладка и цвета UI редактора уровней (`?editor` → `EditorScene`). Только вёрстка, не игровые числа. */
export const EDITOR = {
  toolbarHeight: 26,
  paletteY: 13,
  paletteStartX: 16,
  paletteSpacingX: 40,
  buttonWidth: 70,
  buttonHeight: 20,
  buttonSpacingX: 8,
  gridColor: 0x3a3f55,
  gridAlpha: 0.5,
  validColor: 0x4caf50,
  invalidColor: 0xe05252,
  headroomColor: 0xe0a552,
  selectedColor: 0xffd479,
  dogHandleRadius: 6,
  dogBandColor: 0xff8b8b,
  dogBandAlpha: 0.25,
  statusY: GAME.height - 14,
  previewLineWidth: 2,
} as const;

export const EDITOR_DRAFT_STORAGE_KEY = 'pushok:editor-draft';
