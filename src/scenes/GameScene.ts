import Phaser from 'phaser';
import { GAME, TEX, BALANCE, LEVEL_1_LEDGES, LEVEL_1_FISH, PLAYER_START, FLOOR_TOP_Y } from '@/config';
import { Pushok } from '@/entities/Pushok';
import { applyDamage, isGameOver } from '@/systems/progression';
import { loadSave, writeSave } from '@/systems/save';

export class GameScene extends Phaser.Scene {
  private pushok!: Pushok;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private fishGroup!: Phaser.Physics.Arcade.Group;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'left' | 'right' | 'jump', Phaser.Input.Keyboard.Key>;
  private hud!: Phaser.GameObjects.Text;

  private fish = 0;
  private lives: number = BALANCE.startingLives;
  private invulnerableUntilMs = 0;

  constructor() {
    super('Game');
  }

  create(): void {
    this.fish = 0;
    this.lives = BALANCE.startingLives;
    this.invulnerableUntilMs = 0;

    this.platforms = this.physics.add.staticGroup();
    this.buildLevel();

    this.pushok = new Pushok(this, PLAYER_START.x, PLAYER_START.y);
    this.physics.add.collider(this.pushok, this.platforms);

    this.fishGroup = this.physics.add.group({ allowGravity: false, immovable: true });
    this.spawnFish();
    this.physics.add.overlap(this.pushok, this.fishGroup, (_p, f) => this.collectFish(f as Phaser.Physics.Arcade.Sprite));

    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keys = {
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      jump: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
    };

    this.hud = this.add.text(8, 8, '', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff',
    }).setScrollFactor(0).setDepth(10);
    this.updateHud();
  }

  override update(time: number): void {
    let dir: -1 | 0 | 1 = 0;
    if (this.cursors.left.isDown || this.keys.left.isDown) dir = -1;
    else if (this.cursors.right.isDown || this.keys.right.isDown) dir = 1;

    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.keys.jump);

    this.pushok.handleInput(dir, jumpPressed, time);

    // Падение за пределы уровня — урон.
    if (this.pushok.y > GAME.height + 64) {
      this.hurt(time);
      this.pushok.setPosition(PLAYER_START.x, PLAYER_START.y);
      (this.pushok.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
  }

  private buildLevel(): void {
    const t = GAME.tileSize;
    // Пол
    for (let x = t / 2; x < GAME.width; x += t) {
      this.platforms.create(x, FLOOR_TOP_Y + t / 2, TEX.ground);
    }
    // Уступы: координаты из config/level.ts, выведены из геометрии прыжка
    for (const ledge of LEVEL_1_LEDGES) {
      for (let i = 0; i < ledge.tiles; i += 1) {
        this.platforms.create(ledge.leftX + i * t + t / 2, ledge.topY + t / 2, TEX.ground);
      }
    }
  }

  private spawnFish(): void {
    for (const spot of LEVEL_1_FISH) {
      this.fishGroup.create(spot.x, spot.y, TEX.fish);
    }
  }

  private collectFish(fishObj: Phaser.Physics.Arcade.Sprite): void {
    fishObj.destroy();
    this.fish += 1;
    this.updateHud();
    this.persist();
  }

  private hurt(nowMs: number): void {
    const result = applyDamage(this.lives, BALANCE.hazardDamage, this.invulnerableUntilMs, nowMs);
    this.lives = result.lives;
    this.invulnerableUntilMs = result.invulnerableUntilMs;
    if (result.damaged) {
      this.cameras.main.shake(120, 0.008);
      this.updateHud();
    }
    if (isGameOver(this.lives)) {
      this.persist();
      this.scene.start('GameOver', { fish: this.fish });
    }
  }

  private updateHud(): void {
    this.hud.setText(`Рыбки: ${this.fish}   Жизни: ${this.lives}`);
  }

  private persist(): void {
    const save = loadSave();
    writeSave({ ...save, fish: this.fish, lives: this.lives });
  }
}
