import Phaser from 'phaser';
import { GAME, PHYSICS } from '@/config';
import { BootScene } from '@/scenes/BootScene';
import { PreloadScene } from '@/scenes/PreloadScene';
import { MenuScene } from '@/scenes/MenuScene';
import { GameScene } from '@/scenes/GameScene';
import { GameOverScene } from '@/scenes/GameOverScene';
import { VictoryScene } from '@/scenes/VictoryScene';
import { EditorScene } from '@/scenes/EditorScene';
import { QuestScene } from '@/scenes/QuestScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  // Canvas имеет настоящий Full HD backing buffer. Камеры ниже компенсируют
  // его масштаб, поэтому сцены по-прежнему работают в логических 640×360.
  width: GAME.width * GAME.renderScale,
  height: GAME.height * GAME.renderScale,
  backgroundColor: GAME.backgroundColor,
  // Новый арт рисованный, поэтому масштабируем текстуры линейно, без pixel-art nearest-neighbor.
  pixelArt: false,
  antialias: true,
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
  callbacks: {
    postBoot: (game) => {
      for (const scene of game.scene.scenes) {
        const configureCamera = (): void => {
          // Origin (0,0) не даёт zoom сместить логический кадр к центру большого canvas.
          scene.cameras.main.setOrigin(0, 0).setZoom(GAME.renderScale);
        };
        // Camera Manager сбрасывает zoom при каждом повторном старте сцены.
        scene.events.on(Phaser.Scenes.Events.START, configureCamera);
        configureCamera();
      }
    },
  },
  scene: [BootScene, PreloadScene, MenuScene, QuestScene, GameScene, GameOverScene, VictoryScene, EditorScene],
} as Phaser.Types.Core.GameConfig);
