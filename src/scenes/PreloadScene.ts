import Phaser from 'phaser';
import { TEX, GAME } from '@/config';

/**
 * Единственное место загрузки ассетов.
 * Пушок, рыбка, собака и шипы — настоящие спрайты (public/assets/sprites).
 * Земля и выход пока без арта — рисуем плейсхолдер кодом.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    this.load.image(TEX.pushok, 'assets/sprites/pushok.png');
    this.load.image(TEX.fish, 'assets/sprites/fish.png');
    this.load.image(TEX.dog, 'assets/sprites/dog.png');
    this.load.image(TEX.spikes, 'assets/sprites/spikes.png');
    this.load.image(TEX.questBg, 'assets/sprites/quest-background-clean.png');
    this.load.image(TEX.questSignpost, 'assets/sprites/quest-signpost-hq.png');
    this.load.image(TEX.questChest, 'assets/sprites/quest-chest-hq.png');
    this.load.image(TEX.questBoardKey, 'assets/sprites/quest-board-key-hq.png');
    this.load.image(TEX.questTasksPanel, 'assets/sprites/quest-tasks-panel-hq.png');
    this.load.image(TEX.questHudPanel, 'assets/sprites/quest-hud-panel-hq.png');
    this.load.image(TEX.questBtnBackpack, 'assets/sprites/quest-btn-backpack-normalized.png');
    this.load.image(TEX.questBtnMap, 'assets/sprites/quest-btn-map-normalized.png');
    this.load.image(TEX.questBtnMenu, 'assets/sprites/quest-btn-menu-normalized.png');
    this.load.image(TEX.questSpeechBubble, 'assets/sprites/quest-speech-bubble-hq.png');
    this.load.image(TEX.questDialogPalkan, 'assets/sprites/quest-dialog-palkan-hq.png');
    this.load.image(TEX.questHintButton, 'assets/sprites/quest-hint-button-hq.png');
    this.load.image(TEX.questInventoryPanel, 'assets/sprites/quest-inventory-panel-hq.png');
    this.load.image(TEX.pushokQuest, 'assets/sprites/pushok-quest-hq.png');
    this.load.image(TEX.palkanQuest, 'assets/sprites/palkan-quest-hq.png');
    this.load.image(TEX.menuScene, 'assets/sprites/menu-scene-1920x1080.png');
  }

  create(): void {
    this.makePlaceholder(TEX.ground, GAME.tileSize, GAME.tileSize, 0x3d5a45);
    this.makePlaceholder(TEX.exit, GAME.tileSize, Math.round(GAME.tileSize * 1.5), 0xffd166);
    this.makeLedgePlaceholder(TEX.ledge);

    // Конструктор уровней — dev-инструмент, не для игроков: только по ?editor в URL.
    const params = new URLSearchParams(window.location.search);
    const startScene = params.has('editor') ? 'Editor' : params.has('quest') ? 'Quest' : 'Menu';
    this.scene.start(startScene);
  }

  private makePlaceholder(key: string, w: number, h: number, color: number): void {
    if (this.textures.exists(key)) return;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(color, 1);
    g.fillRect(0, 0, w, h);
    g.lineStyle(2, 0x000000, 0.35);
    g.strokeRect(0, 0, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  /**
   * Уступ редактора — цельный спрайт шириной в 2 тайла (а не два отдельных
   * `TEX.ground`), чтобы клик/драг всегда попадал в один надёжный
   * `Image.setInteractive()` без кастомной hit-area на контейнере.
   */
  private makeLedgePlaceholder(key: string): void {
    if (this.textures.exists(key)) return;
    const t = GAME.tileSize;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x3d5a45, 1);
    g.fillRect(0, 0, t * 2, t);
    g.lineStyle(2, 0x000000, 0.35);
    g.strokeRect(0, 0, t, t);
    g.strokeRect(t, 0, t, t);
    g.generateTexture(key, t * 2, t);
    g.destroy();
  }

}
