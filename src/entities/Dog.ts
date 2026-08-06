import Phaser from 'phaser';
import { TEX, ENEMY, PHYSICS } from '@/config';
import { reverseAtBounds, canSeeTargetAnywhere, chaseDirection, shouldJumpToTarget } from '@/systems/patrol';

/**
 * Злая собака — враг. По умолчанию патрулирует отрезок пола туда-обратно.
 * Увидев Пушка (на полу или на уступе, в пределах дальности) — гонится за
 * ним, включая прыжки по уступам той же физикой, что и у игрока.
 * Ловит Пушка = урон (overlap в GameScene). Коллизия с платформами задаётся
 * в GameScene, как у игрока.
 */
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
    body.setCollideWorldBounds(true);
    body.setMaxVelocityY(PHYSICS.maxFallSpeed);
    this.setOrigin(0.5, 1);
    body.setVelocityX(ENEMY.dogSpeed * this.direction);
  }

  /** targetX/targetY — координаты Пушка в этом кадре. */
  override update(targetX: number, targetY: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const chasing = canSeeTargetAnywhere(
      this.x, this.y, targetX, targetY,
      ENEMY.dogDetectionRangeX, ENEMY.dogDetectionRangeY,
    );

    let speed: number;
    if (chasing) {
      this.direction = chaseDirection(this.x, targetX);
      speed = ENEMY.dogChaseSpeed;

      const onGround = body.blocked.down || body.touching.down;
      if (onGround && shouldJumpToTarget(this.x, this.y, targetX, targetY)) {
        body.setVelocityY(ENEMY.dogJumpVelocity);
      }
    } else {
      this.direction = reverseAtBounds(this.x, this.minX, this.maxX, this.direction);
      speed = ENEMY.dogSpeed;
    }

    body.setVelocityX(speed * this.direction);
    this.setFlipX(this.direction > 0);
  }
}
