import Phaser from 'phaser';
import { TEX, ENEMY } from '@/config';
import { reverseAtBounds } from '@/systems/patrol';

/** Злая собака — враг. Патрулирует отрезок пола, ловит Пушка = урон. */
export class Dog extends Phaser.Physics.Arcade.Sprite {
  private direction: -1 | 1 = 1;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly minX: number,
    private readonly maxX: number,
  ) {
    super(scene, x, y, TEX.dog);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    this.setOrigin(0.5, 1);
    body.setVelocityX(ENEMY.dogSpeed * this.direction);
  }

  override update(): void {
    this.direction = reverseAtBounds(this.x, this.minX, this.maxX, this.direction);
    (this.body as Phaser.Physics.Arcade.Body).setVelocityX(ENEMY.dogSpeed * this.direction);
    this.setFlipX(this.direction > 0);
  }
}
