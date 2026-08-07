/**
 * Ключи ассетов. Загрузка — только в PreloadScene.
 * Никогда не набирать строковый ключ руками в сцене: опечатка не бросает ошибку,
 * Phaser молча рисует зелёный квадрат.
 */
export const TEX = {
  pushok: 'pushok',
  fish: 'fish',
  ground: 'ground',
  dog: 'dog',
  exit: 'exit',
  /** Плейсхолдер уступа для редактора уровней (`?editor`) — один спрайт вместо двух тайлов, надёжнее кликается/тащится. */
  ledge: 'ledge',
  /** Шипы — опасность, которую расставляют вручную в редакторе. Арта пока нет, рисуем плейсхолдер кодом. */
  spikes: 'spikes',
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
