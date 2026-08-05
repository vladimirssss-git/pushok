import Phaser from 'phaser';
import { TEX, ENEMY, GAME } from '@/config';
import { reverseAtBounds, canSeeTarget, chaseDirection } from '@/systems/patrol';

/**
 * Злая собака — враг. По умолчанию патрулирует отрезок пола туда-обратно.
 * Увидев Пушка внизу (на полу, в пределах дальности) — гонится за ним по
 * всей ширине пола, а не только в своих патрульных границах.
 * Ловит Пушка = урон (overlap в GameScene).
 */
export class Dog extends Phaser.Physics.Arcade.Sprite {
  private direction: -1 | 1 = 1;
  private readonly floorY: number;

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
    this.floorY = y;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    this.setOrigin(0.5, 1);
    body.setVelocityX(ENEMY.dogSpeed * this.direction);
  }

  /** targetX/targetY — координаты Пушка в этом кадре. */
  override update(targetX: number, targetY: number): void {
    const chasing = canSeeTarget(
      this.x, targetX, targetY, this.floorY,
      ENEMY.dogDetectionRangeX, ENEMY.dogDetectionToleranceY,
    );

    let speed: number;
    if (chasing) {
      this.direction = chaseDirection(this.x, targetX);
      speed = ENEMY.dogChaseSpeed;
    } else {
      this.direction = reverseAtBounds(this.x, this.minX, this.maxX, this.direction);
      speed = ENEMY.dogSpeed;
    }

    (this.body as Phaser.Physics.Arcade.Body).setVelocityX(speed * this.direction);
    this.setFlipX(this.direction > 0);

    // Погоня может увести собаку за пределы патрульных границ — не даём убежать с уровня.
    const half = this.width / 2;
    this.x = Phaser.Math.Clamp(this.x, half, GAME.width - half);
  }
}
