import Phaser from 'phaser';
import { GAME, MAX_LEVEL } from '@/config';
import { TouchControls } from '@/systems/touchControls';

export class VictoryScene extends Phaser.Scene {
  private fish = 0;

  constructor() {
    super('Victory');
  }

  init(data: { fish?: number }): void {
    this.fish = data.fish ?? 0;
  }

  create(): void {
    const cx = GAME.width / 2;
    this.add.text(cx, 110, 'Пушок дома!', {
      fontFamily: 'monospace', fontSize: '32px', color: '#ffd479',
    }).setOrigin(0.5);
    this.add.text(cx, 160, `Все ${MAX_LEVEL} уровней пройдены`, {
      fontFamily: 'monospace', fontSize: '16px', color: '#cfd2e6',
    }).setOrigin(0.5);
    this.add.text(cx, 190, `Рыбок собрано: ${this.fish}`, {
      fontFamily: 'monospace', fontSize: '16px', color: '#cfd2e6',
    }).setOrigin(0.5);
    const hint = TouchControls.isTouchDevice(this) ? 'Тапни — сыграть ещё раз' : 'ПРОБЕЛ — сыграть ещё раз';
    this.add.text(cx, 230, hint, {
      fontFamily: 'monospace', fontSize: '14px', color: '#7c81a0',
    }).setOrigin(0.5);

    let restarted = false;
    const restart = (): void => {
      if (restarted) return;
      restarted = true;
      this.scene.start('Game');
    };
    this.input.keyboard?.once('keydown-SPACE', restart);
    this.input.once('pointerdown', restart);
  }
}
