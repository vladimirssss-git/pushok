import Phaser from 'phaser';
import { GAME, TEX, BALANCE } from '@/config';
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

    this.pushok = new Pushok(this, 80, GAME.height - 80);
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
      this.pushok.setPosition(80, GAME.height - 80);
      (this.pushok.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
  }

  private buildLevel(): void {
    const t = GAME.tileSize;
    const floorY = GAME.height - t / 2;
    for (let x = t / 2; x < GAME.width; x += t) {
      this.platforms.create(x, floorY, TEX.ground);
    }
    const ledges: Array<[number, number]> = [
      [200, GAME.height - 110],
      [232, GAME.height - 110],
      [400, GAME.height - 170],
      [432, GAME.height - 170],
      [560, GAME.height - 240],
    ];
    for (const [x, y] of ledges) this.platforms.create(x, y, TEX.ground);
  }

  private spawnFish(): void {
    const spots: Array<[number, number]> = [
      [216, GAME.height - 140],
      [416, GAME.height - 200],
      [560, GAME.height - 270],
      [120, GAME.height - 70],
    ];
    for (const [x, y] of spots) this.fishGroup.create(x, y, TEX.fish);
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
