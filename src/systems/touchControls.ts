import Phaser from 'phaser';
import { TOUCH_CONTROLS, TOUCH_BUTTON_POSITIONS } from '@/config';

/**
 * Виртуальный геймпад для тач-устройств: две кнопки движения + прыжок.
 * Рисует круги средствами Phaser (без ассетов — тот же подход,
 * что и у плейсхолдер-спрайтов в PreloadScene) и держит своё состояние
 * в том же формате, что читает `Pushok.handleInput` (direction, jumpPressed).
 */
export class TouchControls {
  direction: -1 | 0 | 1 = 0;

  private jumpJustPressed = false;
  private leftDown = false;
  private rightDown = false;

  constructor(scene: Phaser.Scene) {
    this.createButton(scene, TOUCH_BUTTON_POSITIONS.left, '◀', {
      onDown: () => { this.leftDown = true; this.updateDirection(); },
      onUp: () => { this.leftDown = false; this.updateDirection(); },
    });
    this.createButton(scene, TOUCH_BUTTON_POSITIONS.right, '▶', {
      onDown: () => { this.rightDown = true; this.updateDirection(); },
      onUp: () => { this.rightDown = false; this.updateDirection(); },
    });
    this.createButton(scene, TOUCH_BUTTON_POSITIONS.jump, '▲', {
      onDown: () => { this.jumpJustPressed = true; },
      onUp: () => {},
    });
  }

  /** Прыжок — событие «нажали в этом кадре», как JustDown у клавиатуры. */
  consumeJumpPress(): boolean {
    const pressed = this.jumpJustPressed;
    this.jumpJustPressed = false;
    return pressed;
  }

  /** Есть ли на устройстве тач-ввод — показывать кнопки только там. */
  static isTouchDevice(scene: Phaser.Scene): boolean {
    return scene.sys.game.device.input.touch;
  }

  private updateDirection(): void {
    if (this.leftDown && !this.rightDown) this.direction = -1;
    else if (this.rightDown && !this.leftDown) this.direction = 1;
    else this.direction = 0;
  }

  private createButton(
    scene: Phaser.Scene,
    pos: { x: number; y: number },
    label: string,
    handlers: { onDown: () => void; onUp: () => void },
  ): void {
    const circle = scene.add.circle(pos.x, pos.y, TOUCH_CONTROLS.radius, TOUCH_CONTROLS.color, TOUCH_CONTROLS.alphaIdle)
      .setScrollFactor(0)
      .setDepth(20)
      .setInteractive({ useHandCursor: false });

    scene.add.text(pos.x, pos.y, label, { fontFamily: 'monospace', fontSize: '20px', color: '#1b1b2a' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(21);

    circle.on('pointerdown', () => {
      circle.setAlpha(TOUCH_CONTROLS.alphaPressed);
      handlers.onDown();
    });
    circle.on('pointerup', () => {
      circle.setAlpha(TOUCH_CONTROLS.alphaIdle);
      handlers.onUp();
    });
    circle.on('pointerout', () => {
      circle.setAlpha(TOUCH_CONTROLS.alphaIdle);
      handlers.onUp();
    });
  }
}
