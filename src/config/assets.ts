/**
 * Ключи ассетов. Загрузка — только в PreloadScene.
 * Никогда не набирать строковый ключ руками в сцене: опечатка не бросает ошибку,
 * Phaser молча рисует зелёный квадрат.
 */
export const TEX = {
  pushok: 'pushok',
  fish: 'fish',
  ground: 'ground',
} as const;

export const ANIM = {
  idle: 'pushok-idle',
  run: 'pushok-run',
  jump: 'pushok-jump',
  fall: 'pushok-fall',
} as const;

export const SFX = {
  jump: 'sfx-jump',
  pickup: 'sfx-pickup',
  hurt: 'sfx-hurt',
} as const;
