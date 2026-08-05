import Phaser from 'phaser';
import { GAME } from '@/config';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    const cx = GAME.width / 2;
    this.add.text(cx, 120, 'ПУШОК', { fontFamily: 'monospace', fontSize: '48px', color: '#ffd479' })
      .setOrigin(0.5);
    this.add.text(cx, 190, 'Нажми ПРОБЕЛ', { fontFamily: 'monospace', fontSize: '16px', color: '#cfd2e6' })
      .setOrigin(0.5);
    this.add.text(cx, 230, '← → или A D — идти,  ПРОБЕЛ / W — прыжок', {
      fontFamily: 'monospace', fontSize: '12px', color: '#7c81a0',
    }).setOrigin(0.5);

    this.input.keyboard?.once('keydown-SPACE', () => this.scene.start('Game'));
  }
}
