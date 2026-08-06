import Phaser from 'phaser';
import { GAME } from '@/config';
import { TouchControls } from '@/systems/touchControls';

export class GameOverScene extends Phaser.Scene {
  private fish = 0;
  private level = 1;

  constructor() {
    super('GameOver');
  }

  init(data: { fish?: number; level?: number }): void {
    this.fish = data.fish ?? 0;
    this.level = data.level ?? 1;
  }

  create(): void {
    const cx = GAME.width / 2;
    this.add.text(cx, 130, 'Пушок устал', {
      fontFamily: 'monospace', fontSize: '32px', color: '#ff8b8b',
    }).setOrigin(0.5);
    this.add.text(cx, 180, `Рыбок собрано: ${this.fish}`, {
      fontFamily: 'monospace', fontSize: '16px', color: '#cfd2e6',
    }).setOrigin(0.5);
    const hint = TouchControls.isTouchDevice(this) ? 'Тапни — заново' : 'ПРОБЕЛ — заново';
    this.add.text(cx, 220, hint, {
      fontFamily: 'monospace', fontSize: '14px', color: '#7c81a0',
    }).setOrigin(0.5);

    let restarted = false;
    const restart = (): void => {
      if (restarted) return;
      restarted = true;
      // Смерть перезапускает текущий уровень с сохранёнными рыбками, а не всю игру заново.
      this.scene.start('Game', { level: this.level, fish: this.fish });
    };
    this.input.keyboard?.once('keydown-SPACE', restart);
    this.input.once('pointerdown', restart);
  }
}
