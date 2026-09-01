import Phaser from 'phaser';
import { GAME, QUEST_DIALOGUE, QUEST_ROUTE, TEX } from '@/config';
import { TouchControls } from '@/systems/touchControls';
import { advanceProgress, destinationOnPath, pointAtProgress } from '@/systems/questPath';

/** Единый z-order сцены: мир снизу вверх, UI поверх всего. */
const DEPTH = {
  background: 0,
  worldProps: 10,
  characters: 20,
  speech: 30,
  ui: 100,
} as const;

/**
 * Уровень 1 — квест у моста. Весь UI и мир — HQ PNG из public/assets/sprites
 * (см. docs/05 Devlog): quest-background-clean.png — чистый фон без запечённых
 * сундука/доски/указателя, все объекты — отдельные спрайты поверх, один раз.
 * Значения на панелях («3» жизни, «0» рыбок, «1/5» звёзд, текст квеста,
 * инвентарь) для этого шага уже отрисованы внутри самих ассетов.
 */
export class QuestScene extends Phaser.Scene {
  private pushok!: Phaser.GameObjects.Image;
  private pushokShadow!: Phaser.GameObjects.Ellipse;
  private palkan!: Phaser.GameObjects.Image;
  private speechBubble!: Phaser.GameObjects.Image;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private moveDir = 0;
  private touchRouteEnabled = false;
  private routeProgress = 0;
  private routeTargetProgress: number | null = null;

  constructor() {
    super('Quest');
  }

  create(): void {
    const w = GAME.width;
    const h = GAME.height;
    this.routeProgress = 0;
    this.routeTargetProgress = null;

    this.drawBackground(h);

    this.placeAspect(TEX.questChest, 50, 246, 65, 0.5, 1).setDepth(DEPTH.worldProps);
    this.placeAspect(TEX.questBoardKey, 157, 98, 80, 0.5, 0).setDepth(DEPTH.worldProps);
    this.placeAspect(TEX.questSignpost, 560, 230, 48, 0.5, 1).setDepth(DEPTH.worldProps);

    // Лапы стоят в середине прежнего зазора до нижней панели: герои опущены
    // ещё на 11 логических пикселей и визуально опираются на дорожку.
    const start = QUEST_ROUTE.points[0];
    const groundY = start.y;
    this.pushok = this.placeAspect(TEX.pushokQuest, start.x, groundY, 60, 0.5, 1).setDepth(DEPTH.characters);
    this.palkan = this.placeAspect(TEX.palkanQuest, 210, groundY - 2, 62, 0.5, 1).setDepth(DEPTH.characters);
    this.pushokShadow = this.drawShadow(this.pushok.x, groundY, 22);
    this.drawShadow(this.palkan.x, groundY - 2, 24);

    this.scheduleIdleLife(this.palkan);
    this.scheduleIdleLife(this.pushok);

    this.speechBubble = this.placeAspect(TEX.questSpeechBubble, 0, 0, 80, 0.5, 1).setDepth(DEPTH.speech);
    this.positionSpeechBubble();

    this.placeAspect(TEX.questTasksPanel, 4, 5, 132, 0, 0).setDepth(DEPTH.ui);
    this.placeAspect(TEX.questHudPanel, w / 2, 5, 167, 0.5, 0).setDepth(DEPTH.ui);
    this.buildTopRightButtons();

    this.buildBottomUi(h);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keyA = this.input.keyboard!.addKey('A');
    this.keyD = this.input.keyboard!.addKey('D');

    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Menu'));

    this.touchRouteEnabled = TouchControls.isTouchDevice(this);
    if (this.touchRouteEnabled) {
      this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onQuestPointerDown, this);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.input.off(Phaser.Input.Events.POINTER_DOWN, this.onQuestPointerDown, this);
      });
    }
  }

  /**
   * quest-background-clean.png (770×355) шире canvas (640×360) — cover-fit по
   * высоте (без искажения пропорций), избыток ширины просто уходит за пределы
   * камеры (Phaser не рендерит то, что вне viewport — обрезка без изменения
   * файла на диске). biasPx смещает видимое окно влево, чтобы в кадре остались
   * и тропа с деревом слева, и маяк справа (у самого широкого центрирования
   * маяк уходит за правый край).
   */
  private drawBackground(h: number): void {
    const src = this.textures.get(TEX.questBg).getSourceImage();
    const scale = h / src.height;
    const dispW = src.width * scale;
    const biasPx = 100;
    const leftEdge = -(biasPx * scale);
    this.add.image(0, 0, TEX.questBg)
      .setOrigin(0, 0)
      .setPosition(leftEdge, 0)
      .setDisplaySize(dispW, h)
      .setDepth(DEPTH.background);
  }

  /** Кладёт картинку с заданной шириной, сохраняя её исходные пропорции (никогда не искажаем растр). */
  private placeAspect(
    key: string,
    x: number,
    y: number,
    width: number,
    originX: number,
    originY: number,
  ): Phaser.GameObjects.Image {
    const src = this.textures.get(key).getSourceImage();
    const height = width * (src.height / src.width);
    return this.add.image(x, y, key).setDisplaySize(width, height).setOrigin(originX, originY);
  }

  /** Пузырь речи Палкана привязан к его текущим координатам, а не к фону — двигается вместе с ним. */
  private positionSpeechBubble(): void {
    const offsetX = 8;
    const offsetY = -4;
    this.speechBubble.setPosition(this.palkan.x + offsetX, this.palkan.y - this.palkan.displayHeight + offsetY);
  }

  override update(_time: number, delta: number): void {
    if (this.touchRouteEnabled) {
      this.updateRouteMovement(delta);
      return;
    }

    const left = this.cursors.left.isDown || this.keyA.isDown;
    const right = this.cursors.right.isDown || this.keyD.isDown;
    this.moveDir = left ? -1 : right ? 1 : 0;

    if (this.moveDir !== 0) {
      const speed = 0.06 * delta;
      const minX = 40;
      const maxX = GAME.width - 40;
      this.pushok.x = Phaser.Math.Clamp(this.pushok.x + this.moveDir * speed, minX, maxX);
      this.pushokShadow.x = this.pushok.x;
      this.pushok.setFlipX(this.moveDir < 0);
    }
  }

  private onQuestPointerDown(pointer: Phaser.Input.Pointer): void {
    const pos = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
    if (pos.y >= QUEST_ROUTE.bottomUiTopY) return;

    const destination = destinationOnPath(pos, QUEST_ROUTE.points, QUEST_ROUTE.tapTolerancePx);
    if (destination) this.routeTargetProgress = destination.progress;
  }

  private updateRouteMovement(delta: number): void {
    if (this.routeTargetProgress === null) return;

    const previousProgress = this.routeProgress;
    this.routeProgress = advanceProgress(
      this.routeProgress,
      this.routeTargetProgress,
      QUEST_ROUTE.speedPxPerMs * delta,
    );
    const point = pointAtProgress(QUEST_ROUTE.points, this.routeProgress);
    if (!point) return;

    this.pushok.setPosition(point.x, point.y);
    this.pushokShadow.setPosition(point.x, point.y - 1);
    const progressDelta = this.routeProgress - previousProgress;
    if (progressDelta !== 0) this.pushok.setFlipX(progressDelta < 0);

    if (Math.abs(this.routeTargetProgress - this.routeProgress) <= QUEST_ROUTE.arrivalEpsilonPx) {
      this.routeProgress = this.routeTargetProgress;
      this.routeTargetProgress = null;
    }
  }

  /**
   * Персонажи стоят неподвижно — редкие короткие вспышки жизни (моргание/поворот
   * головы), не постоянная анимация, чтобы не выглядело как дрожание.
   */
  private scheduleIdleLife(target: Phaser.GameObjects.Image): void {
    const baseFlipX = target.flipX;
    const run = (): void => {
      const roll = Math.random();
      if (roll < 0.5) {
        this.tweens.add({ targets: target, scaleY: target.scaleY * 0.88, duration: 70, yoyo: true, ease: 'Sine.inOut' });
      } else {
        target.setFlipX(!baseFlipX);
        this.time.delayedCall(500 + Math.random() * 400, () => target.setFlipX(baseFlipX));
      }
      this.time.delayedCall(3500 + Math.random() * 3000, run);
    };
    this.time.delayedCall(1500 + Math.random() * 2000, run);
  }

  private drawShadow(x: number, y: number, width: number): Phaser.GameObjects.Ellipse {
    return this.add.ellipse(x, y - 1, width, width * 0.32, 0x000000, 0.28).setDepth(DEPTH.worldProps);
  }

  /**
   * Три квадратные кнопки сверху справа: рюкзак / карта / меню — готовые PNG,
   * hover/tap только масштабом.
   */
  private buildTopRightButtons(): void {
    const entries: Array<{ key: string; cx: number; onClick?: () => void }> = [
      { key: TEX.questBtnBackpack, cx: 507 },
      { key: TEX.questBtnMap, cx: 538 },
      { key: TEX.questBtnMenu, cx: 569, onClick: () => this.scene.start('Menu') },
    ];
    entries.forEach((entry) => {
      const btn = this.placeAspect(entry.key, entry.cx, 27, 27, 0.5, 0.5).setDepth(DEPTH.ui);
      btn.setInteractive({ useHandCursor: true });
      const baseScale = btn.scaleX;
      btn.on('pointerover', () => btn.setScale(baseScale * 1.04));
      btn.on('pointerout', () => btn.setScale(baseScale));
      btn.on('pointerdown', () => {
        btn.setScale(baseScale * 0.96);
        entry.onClick?.();
      });
      btn.on('pointerup', () => {
        btn.setScale(baseScale * 1.04);
      });
    });
  }

  /** DIALOGUE | INVENTORY | HINT — единая нижняя зона, общий baseline, все PNG. */
  private buildBottomUi(h: number): void {
    const baseline = h - 6;
    const dialogW = 300;
    const inventoryW = 210;
    const hintW = 70;
    const gap = 8;
    const dialogX0 = 8;
    const inventoryX0 = dialogX0 + dialogW + gap;
    const hintX0 = inventoryX0 + inventoryW + gap;

    this.placeAspect(TEX.questDialogPalkan, dialogX0, baseline, dialogW, 0, 1).setDepth(DEPTH.ui);
    // В исходном PNG была запечена старая фраза. Нейтральная плашка закрывает её,
    // а актуальная подсказка приходит из config/quest.ts и меняется без правки растра.
    const dialogueTextX = dialogX0 + 94;
    const dialogueTextY = baseline - 46;
    this.add.rectangle(dialogueTextX - 3, dialogueTextY, 196, 34, 0xfff0bd)
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.ui + 1);
    this.add.text(dialogueTextX, dialogueTextY, QUEST_DIALOGUE.dogRepeat, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '9px',
      color: '#21190f',
      lineSpacing: 1,
      resolution: GAME.renderScale,
    }).setOrigin(0, 0.5).setDepth(DEPTH.ui + 2);
    this.placeAspect(TEX.questInventoryPanel, inventoryX0, baseline, inventoryW, 0, 1).setDepth(DEPTH.ui);
    const hint = this.placeAspect(TEX.questHintButton, hintX0, baseline, hintW, 0, 1).setDepth(DEPTH.ui);
    hint.setInteractive({ useHandCursor: true });
    const baseScale = hint.scaleX;
    hint.on('pointerover', () => hint.setScale(baseScale * 1.05));
    hint.on('pointerout', () => hint.setScale(baseScale));
  }
}
