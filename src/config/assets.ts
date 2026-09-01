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
  /** Шипы — опасность, которую расставляют вручную в редакторе. Спрайт 32×19, координата — нижняя грань. */
  spikes: 'spikes',
  /** Все quest-* ключи ниже — HQ-арт (см. docs/05 Devlog): старые low-res PNG под теми же именами больше не грузятся. */
  questBg: 'quest-background-clean',
  questSignpost: 'quest-signpost-hq',
  questChest: 'quest-chest-hq',
  questBoardKey: 'quest-board-key-hq',
  questTasksPanel: 'quest-tasks-panel-hq',
  questHudPanel: 'quest-hud-panel-hq',
  /** Три верхние кнопки нормализованы в одинаковые квадратные прозрачные PNG. */
  questBtnBackpack: 'quest-btn-backpack-normalized',
  questBtnMap: 'quest-btn-map-normalized',
  questBtnMenu: 'quest-btn-menu-normalized',
  questSpeechBubble: 'quest-speech-bubble-hq',
  questDialogPalkan: 'quest-dialog-palkan-hq',
  questHintButton: 'quest-hint-button-hq',
  questInventoryPanel: 'quest-inventory-panel-hq',
  pushokQuest: 'pushok-quest-hq',
  palkanQuest: 'palkan-quest-hq',
  /**
   * Единая сцена главного меню (фон + панель + заголовок + кнопки + подсказка +
   * Пушок и Палкан) уже целиком запечена в один PNG art-директором — отдельные
   * menu-title, menu-button-quest, menu-button-basement, menu-controls-hint,
   * pushok-menu, palkan-menu не используются как отдельные GameObject, чтобы не дублировать то, что уже
   * нарисовано на фоне (см. docs/05 Devlog).
   */
  menuScene: 'menu-scene',
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
