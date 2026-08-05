import Phaser from 'phaser';
import { GAME } from '@/config';

export class GameOverScene extends Phaser.Scene {
  private fish = 0;

  constructor() {
    super('GameOver');
  }

  init(data: { fish?: number }): void {
    this.fish = data.fish ?? 0;
  }

  create(): void {
    const cx = GAME.width / 2;
    this.add.text(cx, 130, 'Пушок устал', {
      fontFamily: 'monospace', fontSize: '32px', color: '#ff8b8b',
    }).setOrigin(0.5);
    this.add.text(cx, 180, `Рыбок собрано: ${this.fish}`, {
      fontFamily: 'monospace', fontSize: '16px', color: '#cfd2e6',
    }).setOrigin(0.5);
    this.add.text(cx, 220, 'ПРОБЕЛ — заново', {
      fontFamily: 'monospace', fontSize: '14px', color: '#7c81a0',
    }).setOrigin(0.5);

    this.input.keyboard?.once('keydown-SPACE', () => this.scene.start('Game'));
  }
}
