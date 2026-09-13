import Phaser from 'phaser';
import { PHYSICS, PLAYER, TEX } from '@/config';
import { shouldJump, horizontalVelocity, type JumpState } from '@/systems/movement';

/** Котёнок Пушок — игрок. Только ввод, рендер и физика; логика — в systems/. */
export class Pushok extends Phaser.Physics.Arcade.Sprite {
  private jumpState: JumpState = { lastGroundedMs: -9999, lastJumpPressedMs: -9999 };
  private readonly visual: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEX.pushok);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Невидимый базовый Sprite сохраняет прежний масштаб и физику. Отдельная
    // иллюстрация выше хитбокса: худи, ноги и хвост читаются, но столкновения
    // и геометрия прыжка не меняются.
    this.setDisplaySize(PLAYER.width, PLAYER.height);
    this.setAlpha(0);
    this.visual = scene.add.image(x, y, TEX.pushok)
      .setOrigin(0.5, 1)
      .setDisplaySize(PLAYER.visualWidth, PLAYER.visualHeight)
      .setDepth(5);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(PLAYER.width, PLAYER.height);
    body.setCollideWorldBounds(true);
    body.setMaxVelocityY(PHYSICS.maxFallSpeed);
    body.setDragX(PHYSICS.drag);
    this.setOrigin(0.5, 1);
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.visual.setPosition(this.x, this.y).setFlipX(this.flipX);
  }

  /** direction: -1 влево, 0 стоп, 1 вправо. jumpPressed — нажатие в этом кадре. */
  handleInput(direction: -1 | 0 | 1, jumpPressed: boolean, nowMs: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (body.blocked.down || body.touching.down) {
      this.jumpState.lastGroundedMs = nowMs;
    }
    if (jumpPressed) {
      this.jumpState.lastJumpPressedMs = nowMs;
    }

    body.setVelocityX(horizontalVelocity(direction));
    if (direction !== 0) {
      this.setFlipX(direction < 0);
      this.visual.setFlipX(direction < 0);
    }

    const onGround = body.blocked.down || body.touching.down;
    if (shouldJump(this.jumpState, onGround, nowMs)) {
      body.setVelocityY(PHYSICS.jumpVelocity);
      this.jumpState.lastJumpPressedMs = -9999;
      this.jumpState.lastGroundedMs = -9999;
    }
  }
}
