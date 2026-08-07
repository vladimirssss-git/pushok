import Phaser from 'phaser';
import { TEX, GAME } from '@/config';

/**
 * Единственное место загрузки ассетов.
 * Пушок, рыбка и собака — настоящие спрайты (public/assets/sprites).
 * Земля и выход пока без арта — рисуем плейсхолдер кодом.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    this.load.image(TEX.pushok, 'assets/sprites/pushok.png');
    this.load.image(TEX.fish, 'assets/sprites/fish.png');
    this.load.image(TEX.dog, 'assets/sprites/dog.png');
  }

  create(): void {
    this.makePlaceholder(TEX.ground, GAME.tileSize, GAME.tileSize, 0x3d5a45);
    this.makePlaceholder(TEX.exit, GAME.tileSize, Math.round(GAME.tileSize * 1.5), 0xffd166);
    this.makeLedgePlaceholder(TEX.ledge);
    this.makeSpikesPlaceholder(TEX.spikes);

    // Конструктор уровней — dev-инструмент, не для игроков: только по ?editor в URL.
    const isEditor = new URLSearchParams(window.location.search).has('editor');
    this.scene.start(isEditor ? 'Editor' : 'Menu');
  }

  private makePlaceholder(key: string, w: number, h: number, color: number): void {
    if (this.textures.exists(key)) return;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(color, 1);
    g.fillRect(0, 0, w, h);
    g.lineStyle(2, 0x000000, 0.35);
    g.strokeRect(0, 0, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  /**
   * Уступ редактора — цельный спрайт шириной в 2 тайла (а не два отдельных
   * `TEX.ground`), чтобы клик/драг всегда попадал в один надёжный
   * `Image.setInteractive()` без кастомной hit-area на контейнере.
   */
  private makeLedgePlaceholder(key: string): void {
    if (this.textures.exists(key)) return;
    const t = GAME.tileSize;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x3d5a45, 1);
    g.fillRect(0, 0, t * 2, t);
    g.lineStyle(2, 0x000000, 0.35);
    g.strokeRect(0, 0, t, t);
    g.strokeRect(t, 0, t, t);
    g.generateTexture(key, t * 2, t);
    g.destroy();
  }

  /**
   * Шипы — треугольники в тайл шириной и в полтайла высотой. Рисуются
   * остриями вверх и ставятся с origin (0.5, 1), то есть основанием на
   * поверхность: и в редакторе, и в игре координата шипов — их нижняя грань.
   */
  private makeSpikesPlaceholder(key: string): void {
    if (this.textures.exists(key)) return;
    const w = GAME.tileSize;
    const h = GAME.tileSize / 2;
    const teeth = 4;
    const step = w / teeth;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xc94f4f, 1);
    for (let i = 0; i < teeth; i += 1) {
      g.fillTriangle(i * step, h, i * step + step / 2, 0, (i + 1) * step, h);
    }
    g.generateTexture(key, w, h);
    g.destroy();
  }
}
