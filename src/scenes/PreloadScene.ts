import Phaser from 'phaser';
import { TEX, GAME, PLAYER } from '@/config';

/**
 * Единственное место загрузки ассетов.
 * Пока настоящих спрайтов нет — рисуем плейсхолдеры кодом,
 * чтобы игра запускалась и была видна физика.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    // Сюда добавлять реальные ассеты:
    // this.load.spritesheet(TEX.pushok, 'assets/sprites/pushok.png', { frameWidth: 32, frameHeight: 32 });
  }

  create(): void {
    this.makePlaceholder(TEX.pushok, PLAYER.width, PLAYER.height, 0xf2c185);
    this.makePlaceholder(TEX.fish, 16, 12, 0x8fd3ff);
    this.makePlaceholder(TEX.ground, GAME.tileSize, GAME.tileSize, 0x3d5a45);
    this.scene.start('Menu');
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
}
