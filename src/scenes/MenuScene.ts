import Phaser from 'phaser';
import { GAME } from '@/config';
import { TouchControls } from '@/systems/touchControls';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    const cx = GAME.width / 2;
    this.add.text(cx, 120, 'ПУШОК', { fontFamily: 'monospace', fontSize: '48px', color: '#ffd479' })
      .setOrigin(0.5);
    const hint = TouchControls.isTouchDevice(this) ? 'Тапни, чтобы начать' : 'Нажми ПРОБЕЛ';
    this.add.text(cx, 190, hint, { fontFamily: 'monospace', fontSize: '16px', color: '#cfd2e6' })
      .setOrigin(0.5);
    this.add.text(cx, 230, '← → или A D — идти,  ПРОБЕЛ / W — прыжок', {
      fontFamily: 'monospace', fontSize: '12px', color: '#7c81a0',
    }).setOrigin(0.5);

    let started = false;
    const start = (): void => {
      if (started) return;
      started = true;
      this.scene.start('Game');
    };
    this.input.keyboard?.once('keydown-SPACE', start);
    this.input.once('pointerdown', start);
  }
}
