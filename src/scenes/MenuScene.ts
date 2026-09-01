import Phaser from 'phaser';
import { GAME, TEX } from '@/config';
import { TouchControls } from '@/systems/touchControls';

interface LevelButton {
  sceneKey: string;
  /** Координаты и размер кнопки в исходном menu-scene-1920x1080.png (px), измерены сканированием пикселей. */
  imgX0: number;
  imgY0: number;
  imgX1: number;
  imgY1: number;
  /** Подпись рисуется поверх кнопки только там, где на арте кнопка пустая (без запечённого текста). */
  label?: string;
}

/** Исходное разрешение фона сцены — координаты кнопок ниже измерены в его пикселях. */
const SCENE_IMG_W = 1920;
const SCENE_IMG_H = 1080;

/**
 * Кнопка 1 «Квест у моря»: старый баковый текст «1. Квест у моста» вычищен
 * прямо из PNG (см. docs/05 Devlog) — планка на арте теперь пустая, подпись
 * рисуется здесь как Phaser.Text.
 * Кнопка 2 «В подвале» уже содержит верную подпись на арте — поверх неё
 * подпись не дублируется, только невидимая интерактивная зона.
 */
const LEVEL_BUTTONS: LevelButton[] = [
  {
    sceneKey: 'Quest', imgX0: 690, imgY0: 508, imgX1: 1185, imgY1: 592, label: 'Квест у моря',
  },
  {
    sceneKey: 'Game', imgX0: 690, imgY0: 610, imgX1: 1185, imgY1: 696,
  },
];

/** Подсказка управления в арте — её координаты в px исходного изображения. */
const HINT_IMG_X = 937;
const HINT_IMG_Y = 755;

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    // На большом холсте (640×360) sub-pixel позиционирование текста поверх кнопок
    // важнее, чем «прилипание» пикселей к сетке — иначе подпись дрожит при tween.
    this.cameras.main.roundPixels = false;

    this.add.image(GAME.width / 2, GAME.height / 2, TEX.menuScene)
      .setDisplaySize(GAME.width, GAME.height);

    LEVEL_BUTTONS.forEach((btn) => this.createButton(btn));

    if (TouchControls.isTouchDevice(this)) {
      // В арте подсказка клавиатурная — на тач-устройствах перекрываем её своей строкой.
      const [hx, hy] = this.toLogical(HINT_IMG_X, HINT_IMG_Y);
      this.add.text(hx, hy, 'Тапни уровень, чтобы начать', {
        fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#3a2c18', resolution: GAME.renderScale,
      }).setOrigin(0.5).setBackgroundColor('#e8dcc2');
    }
  }

  /** Переводит пиксельные координаты исходного арта в логические координаты сцены (640×360). */
  private toLogical(x: number, y: number): [number, number] {
    return [(x / SCENE_IMG_W) * GAME.width, (y / SCENE_IMG_H) * GAME.height];
  }

  private createButton(btn: LevelButton): void {
    const [x0, y0] = this.toLogical(btn.imgX0, btn.imgY0);
    const [x1, y1] = this.toLogical(btn.imgX1, btn.imgY1);
    const x = (x0 + x1) / 2;
    const y = (y0 + y1) / 2;
    const w = x1 - x0;
    const h = y1 - y0;

    if (btn.label) {
      this.add.text(x, y, btn.label, {
        fontFamily: 'Arial, "Helvetica Neue", sans-serif',
        fontStyle: 'bold',
        fontSize: '15px',
        color: '#ffffff',
        stroke: '#3a2214',
        strokeThickness: 4,
        resolution: GAME.renderScale,
      }).setOrigin(0.5);
    }

    const glow = this.add.rectangle(x, y, w, h, 0xffe08a, 0);
    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });

    zone.on('pointerover', () => {
      this.tweens.killTweensOf(glow);
      this.tweens.add({ targets: glow, fillAlpha: 0.22, scaleX: 1.03, scaleY: 1.08, duration: 120, ease: 'Sine.easeOut' });
    });
    zone.on('pointerout', () => {
      this.tweens.killTweensOf(glow);
      this.tweens.add({ targets: glow, fillAlpha: 0, scaleX: 1, scaleY: 1, duration: 140, ease: 'Sine.easeOut' });
    });
    zone.on('pointerdown', () => {
      this.tweens.killTweensOf(glow);
      this.tweens.add({ targets: glow, fillAlpha: 0.35, scaleX: 0.97, scaleY: 0.97, duration: 80, ease: 'Sine.easeOut' });
    });
    zone.on('pointerup', () => {
      this.tweens.killTweensOf(glow);
      this.tweens.add({
        targets: glow, fillAlpha: 0.4, scaleX: 1.05, scaleY: 1.1, duration: 100, ease: 'Sine.easeOut',
        onComplete: () => this.goToLevel(btn.sceneKey),
      });
    });
  }

  private goToLevel(sceneKey: string): void {
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(sceneKey);
    });
  }
}
