import Phaser from 'phaser';
import { TEX } from '@/config';

/**
 * Единственное место загрузки ассетов.
 * Все игровые текстуры загружаются из public/assets/sprites.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    this.load.image(TEX.pushok, 'assets/sprites/pushok-hoodie.png');
    this.load.image(TEX.fish, 'assets/sprites/fish.png');
    this.load.image(TEX.dog, 'assets/sprites/dog.png');
    this.load.image(TEX.spikes, 'assets/sprites/spikes.png');
    this.load.image(TEX.platformerBg, 'assets/sprites/platformer-courtyard-bg.png');
    this.load.image(TEX.ground, 'assets/sprites/platformer-ground.png');
    this.load.image(TEX.ledge, 'assets/sprites/platformer-ledge.png');
    this.load.image(TEX.exit, 'assets/sprites/platformer-exit.png');
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
    // Конструктор уровней — dev-инструмент, не для игроков: только по ?editor в URL.
    const params = new URLSearchParams(window.location.search);
    const startScene = params.has('editor') ? 'Editor' : params.has('quest') ? 'Quest' : 'Menu';
    this.scene.start(startScene);
  }

}
