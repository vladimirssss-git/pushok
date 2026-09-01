import Phaser from 'phaser';
import { GAME, TOUCH_CONTROLS, TOUCH_HINT_POSITIONS, TOUCH_STICK } from '@/config';
import {
  knobOffset,
  recenterOrigin,
  stickDirection,
  zoneOf,
  type MoveDirection,
} from './touchStick';

/**
 * Тач-управление: левая часть экрана — плавающий стик, который рождается там,
 * где опустился палец; правая — прыжок тапом в любом месте. Целиться в кнопку
 * не нужно, поэтому промахнуться нечем — это и было главной претензией к
 * прежним трём круглым кнопкам.
 *
 * Слушаем указатели сцены, а не игровые объекты: событий объекта не хватает,
 * чтобы вести палец между направлениями без отрыва, и они пропускают
 * отпускание за пределами кнопки — кнопка залипала.
 *
 * Состояние отдаётся в том же формате, что читает `Pushok.handleInput`
 * (`direction`, `jumpPressed`).
 */
export class TouchControls {
  direction: MoveDirection = 0;

  private jumpJustPressed = false;
  private stickPointerId: number | null = null;
  private originX = 0;
  private readonly camera: Phaser.Cameras.Scene2D.Camera;
  private readonly base: Phaser.GameObjects.Arc;
  private readonly knob: Phaser.GameObjects.Arc;
  private readonly hints: (Phaser.GameObjects.Arc | Phaser.GameObjects.Text)[] = [];

  constructor(scene: Phaser.Scene) {
    this.camera = scene.cameras.main;
    this.createHints(scene);

    this.base = scene.add
      .circle(0, 0, TOUCH_STICK.baseRadius, TOUCH_CONTROLS.color, TOUCH_STICK.alphaBase)
      .setScrollFactor(0)
      .setDepth(20)
      .setVisible(false);
    this.knob = scene.add
      .circle(0, 0, TOUCH_STICK.knobRadius, TOUCH_CONTROLS.color, TOUCH_STICK.alphaKnob)
      .setScrollFactor(0)
      .setDepth(21)
      .setVisible(false);

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUp, this);

    // Свернули вкладку с зажатым пальцем — иначе Пушок убежит сам.
    scene.game.events.on(Phaser.Core.Events.BLUR, this.release, this);

    // GameScene пересоздаётся после смерти: без отписки слушатели копятся,
    // и один тап начинает считаться за несколько прыжков.
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubscribe(scene));
  }

  /** Прыжок — событие «нажали в этом кадре», как JustDown у клавиатуры. */
  consumeJumpPress(): boolean {
    const pressed = this.jumpJustPressed;
    this.jumpJustPressed = false;
    return pressed;
  }

  /**
   * Есть ли на устройстве тач-ввод — показывать управление только там.
   * `?touch` в URL включает его принудительно: без этого стик нельзя
   * проверить в десктопном браузере (мышь даёт те же pointer-события,
   * но `device.input.touch` там false, и управление просто не создаётся).
   */
  static isTouchDevice(scene: Phaser.Scene): boolean {
    return scene.sys.game.device.input.touch || new URLSearchParams(location.search).has('touch');
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    this.hideHints();
    const pos = pointer.positionToCamera(this.camera) as Phaser.Math.Vector2;

    if (zoneOf(pos.x, GAME.width, TOUCH_STICK.moveZoneWidthRatio) === 'jump') {
      this.jumpJustPressed = true;
      if (TOUCH_STICK.hapticJumpMs > 0) navigator.vibrate?.(TOUCH_STICK.hapticJumpMs);
      return;
    }

    // Второй палец в зоне движения игнорируем: стик один.
    if (this.stickPointerId !== null) return;

    this.stickPointerId = pointer.id;
    this.originX = pos.x;
    this.direction = 0;
    this.base.setPosition(pos.x, pos.y).setVisible(true);
    this.knob.setPosition(pos.x, pos.y).setVisible(true);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.stickPointerId) return;
    const pos = pointer.positionToCamera(this.camera) as Phaser.Math.Vector2;

    this.originX = recenterOrigin(this.originX, pos.x, TOUCH_STICK.maxRadius);
    const dx = pos.x - this.originX;

    this.direction = stickDirection(dx, TOUCH_STICK.deadZonePx);
    this.base.setX(this.originX);
    this.knob.setX(this.originX + knobOffset(dx, TOUCH_STICK.maxRadius));
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.stickPointerId) return;
    this.release();
  }

  private release(): void {
    this.stickPointerId = null;
    this.direction = 0;
    this.base.setVisible(false);
    this.knob.setVisible(false);
  }

  private createHints(scene: Phaser.Scene): void {
    this.addHint(scene, TOUCH_HINT_POSITIONS.move, '◀▶');
    this.addHint(scene, TOUCH_HINT_POSITIONS.jump, '▲');
  }

  private addHint(scene: Phaser.Scene, pos: { x: number; y: number }, label: string): void {
    this.hints.push(
      scene.add
        .circle(pos.x, pos.y, TOUCH_CONTROLS.hintRadius, TOUCH_CONTROLS.color, TOUCH_CONTROLS.alphaIdle)
        .setScrollFactor(0)
        .setDepth(20),
      scene.add
        .text(pos.x, pos.y, label, {
          fontFamily: 'monospace', fontSize: '18px', color: '#1b1b2a', resolution: GAME.renderScale,
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(21),
    );
  }

  private hideHints(): void {
    for (const hint of this.hints) hint.setVisible(false);
  }

  private unsubscribe(scene: Phaser.Scene): void {
    scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    scene.input.off(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUp, this);
    scene.game.events.off(Phaser.Core.Events.BLUR, this.release, this);
  }
}
