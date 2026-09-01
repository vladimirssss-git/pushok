import Phaser from 'phaser';
import {
  GAME, TEX, BALANCE,
  PLAYER_START, FLOOR_TOP_Y, MAX_LEVEL, DOG_PATROL, CUSTOM_LEVELS,
} from '@/config';
import type { Ledge, LevelData } from '@/config/level';
import { Pushok } from '@/entities/Pushok';
import { Dog } from '@/entities/Dog';
import { applyDamage, isGameOver } from '@/systems/progression';
import { loadSave, writeSave } from '@/systems/save';
import { TouchControls } from '@/systems/touchControls';
import { generateLevel } from '@/systems/levelGenerator';

interface GameSceneData {
  level?: number;
  fish?: number;
  lives?: number;
  /**
   * Тест-заезд из редактора («Играть»): уровень приходит прямо из памяти
   * редактора, а не из `CUSTOM_LEVELS`. В этом режиме сейв не трогается,
   * ESC и финиш возвращают в редактор — иначе проверка уровня ломала бы
   * реальный прогресс игрока.
   */
  testLevel?: LevelData;
}

export class GameScene extends Phaser.Scene {
  private pushok!: Pushok;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private fishGroup!: Phaser.Physics.Arcade.Group;
  private exit!: Phaser.Physics.Arcade.Image;
  private dog!: Dog;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'left' | 'right' | 'jump', Phaser.Input.Keyboard.Key>;
  private hud!: Phaser.GameObjects.Text;
  private touchControls: TouchControls | null = null;

  private level = 1;
  private fish = 0;
  private lives: number = BALANCE.startingLives;
  private invulnerableUntilMs = 0;
  private levelCompleted = false;
  private testLevel: LevelData | null = null;

  constructor() {
    super('Game');
  }

  init(data: GameSceneData): void {
    this.level = data.level ?? 1;
    this.fish = data.fish ?? 0;
    this.lives = data.lives ?? BALANCE.startingLives;
    this.invulnerableUntilMs = 0;
    this.levelCompleted = false;
    this.testLevel = data.testLevel ?? null;
  }

  create(): void {
    // Тест-заезд из редактора важнее всего, дальше — авторский уровень из
    // customLevels.ts, и только потом процедурная генерация.
    const custom = this.testLevel ?? CUSTOM_LEVELS[this.level];
    const generated = custom ?? generateLevel(this.level);
    const dogPatrol = custom?.dogPatrol ?? DOG_PATROL;

    this.platforms = this.physics.add.staticGroup();
    this.buildLevel(generated.ledges);

    this.pushok = new Pushok(this, PLAYER_START.x, PLAYER_START.y);
    this.physics.add.collider(this.pushok, this.platforms);

    this.fishGroup = this.physics.add.group({ allowGravity: false, immovable: true });
    this.spawnFish(generated.fish);
    this.physics.add.overlap(this.pushok, this.fishGroup, (_p, f) => this.collectFish(f as Phaser.Physics.Arcade.Sprite));

    this.exit = this.physics.add.staticImage(generated.exit.x, generated.exit.y, TEX.exit).setOrigin(0.5, 1);
    this.exit.refreshBody();
    this.physics.add.overlap(this.pushok, this.exit, () => this.completeLevel());

    // Шипы бывают только у авторских уровней из редактора — генератор их не ставит.
    this.spawnSpikes(custom?.spikes ?? []);

    this.dog = new Dog(this, dogPatrol.maxX, dogPatrol.y, dogPatrol.minX, dogPatrol.maxX);
    this.physics.add.collider(this.dog, this.platforms);
    this.physics.add.overlap(this.pushok, this.dog, (_p, _d) => this.hurt(this.time.now));

    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keys = {
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      jump: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
    };
    if (this.testLevel) {
      kb.on('keydown-ESC', () => this.backToEditor('quit'));
    }

    this.hud = this.add.text(8, 8, '', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff', resolution: GAME.renderScale,
    }).setScrollFactor(0).setDepth(10);
    this.updateHud();

    if (TouchControls.isTouchDevice(this)) {
      this.touchControls = new TouchControls(this);
    }
  }

  override update(time: number): void {
    let dir: -1 | 0 | 1 = 0;
    if (this.cursors.left.isDown || this.keys.left.isDown) dir = -1;
    else if (this.cursors.right.isDown || this.keys.right.isDown) dir = 1;
    else if (this.touchControls) dir = this.touchControls.direction;

    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.keys.jump) ||
      (this.touchControls?.consumeJumpPress() ?? false);

    this.pushok.handleInput(dir, jumpPressed, time);
    this.dog.update(this.pushok.x, this.pushok.y);

    // Падение за пределы уровня — урон.
    if (this.pushok.y > GAME.height + 64) {
      this.hurt(time);
      this.pushok.setPosition(PLAYER_START.x, PLAYER_START.y);
      (this.pushok.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
  }

  private buildLevel(ledges: readonly Ledge[]): void {
    const t = GAME.tileSize;
    // Пол
    for (let x = t / 2; x < GAME.width; x += t) {
      this.platforms.create(x, FLOOR_TOP_Y + t / 2, TEX.ground);
    }
    // Уступы: расстановка процедурная (systems/levelGenerator.ts), допрыгиваемость
    // гарантирована той же физикой, что и в systems/jumpGeometry.ts.
    for (const ledge of ledges) {
      for (let i = 0; i < ledge.tiles; i += 1) {
        this.platforms.create(ledge.leftX + i * t + t / 2, ledge.topY + t / 2, TEX.ground);
      }
    }
  }

  /** Урон при касании — та же `hurt()`, что и от собаки: одна опасность, один эффект. */
  private spawnSpikes(spots: ReadonlyArray<{ x: number; y: number }>): void {
    if (spots.length === 0) return;
    const group = this.physics.add.staticGroup();
    for (const spot of spots) {
      const spike = group.create(spot.x, spot.y, TEX.spikes) as Phaser.Physics.Arcade.Sprite;
      spike.setOrigin(0.5, 1).refreshBody();
    }
    this.physics.add.overlap(this.pushok, group, () => this.hurt(this.time.now));
  }

  private spawnFish(spots: ReadonlyArray<{ x: number; y: number }>): void {
    for (const spot of spots) {
      this.fishGroup.create(spot.x, spot.y, TEX.fish);
    }
  }

  private collectFish(fishObj: Phaser.Physics.Arcade.Sprite): void {
    fishObj.destroy();
    this.fish += 1;
    this.updateHud();
    this.persist();
  }

  private backToEditor(result: 'win' | 'quit'): void {
    this.scene.start('Editor', { level: this.level, playResult: result });
  }

  private completeLevel(): void {
    if (this.levelCompleted) return;
    this.levelCompleted = true;

    if (this.testLevel) {
      this.backToEditor('win');
      return;
    }

    if (this.level >= MAX_LEVEL) {
      const save = loadSave();
      writeSave({ ...save, level: 1, fish: this.fish, lives: this.lives });
      this.scene.start('Victory', { fish: this.fish });
      return;
    }

    this.persist();
    this.scene.start('Game', { level: this.level + 1, fish: this.fish, lives: this.lives });
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
      // В тест-заезде смерть — не конец игры, а повод перезапустить пробу.
      if (this.testLevel) {
        this.scene.start('Game', { level: this.level, testLevel: this.testLevel });
        return;
      }
      this.persist();
      // Рестарт после смерти — с того же уровня и с сохранёнными рыбками
      // (см. «Кор-луп» в docs/01 Design), но со свежими жизнями.
      this.scene.start('GameOver', { fish: this.fish, level: this.level });
    }
  }

  private updateHud(): void {
    const base = `Уровень: ${this.level}   Рыбки: ${this.fish}   Жизни: ${this.lives}`;
    this.hud.setText(this.testLevel ? `${base}   [проба · ESC — в редактор]` : base);
  }

  private persist(): void {
    if (this.testLevel) return; // проба из редактора не трогает прогресс игрока
    const save = loadSave();
    writeSave({ ...save, level: this.level, fish: this.fish, lives: this.lives });
  }
}
