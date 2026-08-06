import Phaser from 'phaser';
import { TEX, GAME } from '@/config';

/**
 * Единственное место загрузки ассетов.
 * Пушок, рыбка и собака — настоящие спрайты (public/assets/sprites).
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
  }

  create(): void {
    this.makePlaceholder(TEX.ground, GAME.tileSize, GAME.tileSize, 0x3d5a45);
    this.makePlaceholder(TEX.exit, GAME.tileSize, Math.round(GAME.tileSize * 1.5), 0xffd166);
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
