import Phaser from 'phaser';
import { GAME, PHYSICS } from '@/config';
import { BootScene } from '@/scenes/BootScene';
import { PreloadScene } from '@/scenes/PreloadScene';
import { MenuScene } from '@/scenes/MenuScene';
import { GameScene } from '@/scenes/GameScene';
import { GameOverScene } from '@/scenes/GameOverScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME.width,
  height: GAME.height,
  backgroundColor: GAME.backgroundColor,
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // Разбег/прыжок с тач-геймпада — два одновременных касания.
  input: { activePointers: 3 },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: PHYSICS.gravityY }, debug: false },
  },
  scene: [BootScene, PreloadScene, MenuScene, GameScene, GameOverScene],
} as Phaser.Types.Core.GameConfig);
