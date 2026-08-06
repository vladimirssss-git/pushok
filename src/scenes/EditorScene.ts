import Phaser from 'phaser';
import {
  GAME, TEX, FLOOR_TOP_Y, PLAYER_START, LEDGE_TILES, DOG_PATROL, MAX_LEVEL,
  CUSTOM_LEVELS, EDITOR, EDITOR_DRAFT_STORAGE_KEY,
} from '@/config';
import type { Ledge, LevelData, DogPatrolZone } from '@/config/level';
import { validateLevel, snapToGrid } from '@/systems/levelValidation';

const T = GAME.tileSize;
const LEDGE_WIDTH = LEDGE_TILES * T;
const GRID_TOP = EDITOR.toolbarHeight;
const GRID_BOTTOM_Y = FLOOR_TOP_Y - T;

interface PlacedLedge {
  leftX: number;
  topY: number;
  tiles: number;
  container: Phaser.GameObjects.Container;
}

interface PlacedPoint {
  x: number;
  y: number;
  sprite: Phaser.GameObjects.Image;
}

type Selection =
  | { kind: 'ledge'; ledge: PlacedLedge }
  | { kind: 'fish'; point: PlacedPoint }
  | { kind: 'exit' }
  | null;

/**
 * Конструктор уровней — dev-инструмент, доступен по `?editor` в URL (см.
 * `main.ts`). Руками расставляются уступы/рыбки/выход, зона патруля собаки
 * тянется двумя ручками. «Проверить уровень» гоняет ту же физику
 * допрыгиваемости, что и процедурный генератор (`systems/levelValidation.ts`
 * — общий источник с `levelGenerator.ts`). «Экспорт» кладёт JSON в консоль и
 * буфер обмена — вставить в `config/customLevels.ts`, чтобы уровень стал
 * частью игры вместо процедурной генерации.
 */
export class EditorScene extends Phaser.Scene {
  private level = 1;
  private ledges: PlacedLedge[] = [];
  private fishList: PlacedPoint[] = [];
  private exitPoint: PlacedPoint | null = null;
  private dogPatrol: DogPatrolZone = { ...DOG_PATROL };

  private dogHandleMin!: Phaser.GameObjects.Arc;
  private dogHandleMax!: Phaser.GameObjects.Arc;
  private dogBand!: Phaser.GameObjects.Graphics;
  private statusText!: Phaser.GameObjects.Text;
  private levelLabel!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private selected: Selection = null;

  constructor() {
    super('Editor');
  }

  create(): void {
    this.drawGrid();
    this.drawFloorReference();
    this.buildToolbar();
    this.drawDogHandles();

    this.statusText = this.add.text(8, EDITOR.statusY, '', {
      fontFamily: 'monospace', fontSize: '11px', color: '#ffffff',
    }).setDepth(30);
    this.toastText = this.add.text(GAME.width / 2, EDITOR.toolbarHeight + 12, '', {
      fontFamily: 'monospace', fontSize: '11px', color: '#ffd479', backgroundColor: '#1b1b2a',
      padding: { x: 6, y: 3 },
    }).setOrigin(0.5, 0).setDepth(40).setAlpha(0);

    this.input.keyboard!.on('keydown-DELETE', () => this.deleteSelected());
    this.input.keyboard!.on('keydown-BACKSPACE', () => this.deleteSelected());

    this.loadLevel(this.level);
  }

  private drawGrid(): void {
    const g = this.add.graphics().setDepth(1);
    g.lineStyle(1, EDITOR.gridColor, EDITOR.gridAlpha);
    for (let x = 0; x <= GAME.width; x += T) {
      g.lineBetween(x, GRID_TOP, x, FLOOR_TOP_Y);
    }
    for (let y = GRID_TOP; y <= FLOOR_TOP_Y; y += T) {
      g.lineBetween(0, y, GAME.width, y);
    }
  }

  private drawFloorReference(): void {
    for (let x = T / 2; x < GAME.width; x += T) {
      this.add.image(x, FLOOR_TOP_Y + T / 2, TEX.ground).setDepth(2);
    }
    this.add.image(PLAYER_START.x, PLAYER_START.y, TEX.pushok).setOrigin(0.5, 1).setAlpha(0.5).setDepth(2);
  }

  private buildToolbar(): void {
    this.add.rectangle(0, 0, GAME.width, EDITOR.toolbarHeight, 0x11131f).setOrigin(0, 0).setDepth(20);

    const paletteDefs: Array<{ texture: string; kind: 'ledge' | 'fish' | 'exit' }> = [
      { texture: TEX.ground, kind: 'ledge' },
      { texture: TEX.fish, kind: 'fish' },
      { texture: TEX.exit, kind: 'exit' },
    ];
    paletteDefs.forEach((def, i) => {
      const x = EDITOR.paletteStartX + i * EDITOR.paletteSpacingX;
      this.setupPaletteStamp(x, EDITOR.paletteY, def.texture, def.kind);
    });

    let bx = EDITOR.paletteStartX + paletteDefs.length * EDITOR.paletteSpacingX + 10;
    bx = this.addButton(bx, 'Проверить', () => this.runValidation(true));
    bx = this.addButton(bx, 'Экспорт', () => this.exportLevel());
    bx = this.addButton(bx, 'Очистить', () => this.clearBoard());

    this.addButton(bx, '◀', () => this.loadLevel(this.level - 1), 22);
    this.levelLabel = this.add.text(bx + 26, EDITOR.paletteY, `Ур. ${this.level}`, {
      fontFamily: 'monospace', fontSize: '11px', color: '#ffffff',
    }).setOrigin(0, 0.5).setDepth(21);
    this.addButton(bx + 26 + 42, '▶', () => this.loadLevel(this.level + 1), 22);
  }

  private addButton(x: number, label: string, onClick: () => void, width: number = EDITOR.buttonWidth): number {
    this.add.text(x, EDITOR.paletteY, label, {
      fontFamily: 'monospace', fontSize: '11px', color: '#1b1b2a', backgroundColor: '#ffd479',
      padding: { x: 6, y: 3 },
    })
      .setOrigin(0, 0.5)
      .setDepth(21)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onClick);
    return x + width + EDITOR.buttonSpacingX;
  }

  private setupPaletteStamp(x: number, y: number, texture: string, kind: 'ledge' | 'fish' | 'exit'): void {
    const icon = this.add.image(x, y, texture).setScale(0.6).setDepth(21).setInteractive({ useHandCursor: true });
    this.input.setDraggable(icon);

    icon.on('drag', (_p: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      icon.setPosition(dragX, dragY);
    });
    icon.on('dragend', () => {
      const width = kind === 'ledge' ? LEDGE_WIDTH : 0;
      const clamped = this.clampToGrid(icon.x, icon.y, width);
      if (kind === 'ledge') this.addLedge(clamped.x, clamped.y);
      else if (kind === 'fish') this.addFish(clamped.x, clamped.y);
      else this.setExit(clamped.x, clamped.y);
      icon.setPosition(x, y);
      this.runValidation();
      this.saveDraft();
    });
  }

  private clampToGrid(x: number, y: number, width: number): { x: number; y: number } {
    const snapped = snapToGrid(x, y);
    return {
      x: Phaser.Math.Clamp(snapped.x, 0, GAME.width - width),
      y: Phaser.Math.Clamp(snapped.y, GRID_TOP, GRID_BOTTOM_Y),
    };
  }

  private addLedge(leftX: number, topY: number): PlacedLedge {
    const container = this.add.container(leftX, topY).setDepth(5);
    const tileA = this.add.image(T / 2, T / 2, TEX.ground);
    const tileB = this.add.image(T + T / 2, T / 2, TEX.ground);
    container.add([tileA, tileB]);
    container.setSize(LEDGE_WIDTH, T);
    container.setInteractive(new Phaser.Geom.Rectangle(0, 0, LEDGE_WIDTH, T), Phaser.Geom.Rectangle.Contains);
    this.input.setDraggable(container);

    const placed: PlacedLedge = { leftX, topY, tiles: LEDGE_TILES, container };

    container.on('pointerdown', () => this.select({ kind: 'ledge', ledge: placed }));
    container.on('drag', (_p: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      container.setPosition(dragX, dragY);
      placed.leftX = dragX;
      placed.topY = dragY;
    });
    container.on('dragend', () => {
      const clamped = this.clampToGrid(container.x, container.y, LEDGE_WIDTH);
      container.setPosition(clamped.x, clamped.y);
      placed.leftX = clamped.x;
      placed.topY = clamped.y;
      this.runValidation();
      this.saveDraft();
    });

    this.ledges.push(placed);
    return placed;
  }

  private addFish(x: number, y: number): PlacedPoint {
    const sprite = this.add.image(x, y, TEX.fish).setDepth(6).setInteractive({ useHandCursor: true });
    this.input.setDraggable(sprite);
    const placed: PlacedPoint = { x, y, sprite };

    sprite.on('pointerdown', () => this.select({ kind: 'fish', point: placed }));
    sprite.on('drag', (_p: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      sprite.setPosition(dragX, dragY);
      placed.x = dragX;
      placed.y = dragY;
    });
    sprite.on('dragend', () => {
      const clamped = this.clampToGrid(sprite.x, sprite.y, 0);
      sprite.setPosition(clamped.x, clamped.y);
      placed.x = clamped.x;
      placed.y = clamped.y;
      this.saveDraft();
    });

    this.fishList.push(placed);
    return placed;
  }

  private setExit(x: number, y: number): void {
    if (this.exitPoint) {
      this.exitPoint.sprite.destroy();
    }
    const sprite = this.add.image(x, y, TEX.exit).setOrigin(0.5, 1).setDepth(6).setInteractive({ useHandCursor: true });
    this.input.setDraggable(sprite);
    const placed: PlacedPoint = { x, y: y + T, sprite };
    this.exitPoint = placed;

    sprite.on('pointerdown', () => this.select({ kind: 'exit' }));
    sprite.on('drag', (_p: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      sprite.setPosition(dragX, dragY);
      placed.x = dragX;
      placed.y = dragY;
    });
    sprite.on('dragend', () => {
      const clamped = this.clampToGrid(sprite.x, sprite.y - T, 0);
      sprite.setPosition(clamped.x, clamped.y + T);
      placed.x = clamped.x;
      placed.y = clamped.y + T;
      this.saveDraft();
    });
  }

  private drawDogHandles(): void {
    this.dogBand = this.add.graphics().setDepth(4);
    this.dogHandleMin = this.add.circle(this.dogPatrol.minX, FLOOR_TOP_Y, EDITOR.dogHandleRadius, 0xffffff)
      .setDepth(15).setInteractive({ useHandCursor: true });
    this.dogHandleMax = this.add.circle(this.dogPatrol.maxX, FLOOR_TOP_Y, EDITOR.dogHandleRadius, 0xffffff)
      .setDepth(15).setInteractive({ useHandCursor: true });
    this.input.setDraggable(this.dogHandleMin);
    this.input.setDraggable(this.dogHandleMax);

    this.dogHandleMin.on('drag', (_p: Phaser.Input.Pointer, dragX: number) => {
      const snapped = snapToGrid(dragX, FLOOR_TOP_Y).x;
      this.dogPatrol.minX = Phaser.Math.Clamp(snapped, 0, this.dogPatrol.maxX - T);
      this.dogHandleMin.x = this.dogPatrol.minX;
      this.redrawDogBand();
    });
    this.dogHandleMin.on('dragend', () => this.saveDraft());

    this.dogHandleMax.on('drag', (_p: Phaser.Input.Pointer, dragX: number) => {
      const snapped = snapToGrid(dragX, FLOOR_TOP_Y).x;
      this.dogPatrol.maxX = Phaser.Math.Clamp(snapped, this.dogPatrol.minX + T, GAME.width);
      this.dogHandleMax.x = this.dogPatrol.maxX;
      this.redrawDogBand();
    });
    this.dogHandleMax.on('dragend', () => this.saveDraft());

    this.redrawDogBand();
  }

  private redrawDogBand(): void {
    this.dogBand.clear();
    this.dogBand.fillStyle(EDITOR.dogBandColor, EDITOR.dogBandAlpha);
    this.dogBand.fillRect(this.dogPatrol.minX, FLOOR_TOP_Y, this.dogPatrol.maxX - this.dogPatrol.minX, GAME.height - FLOOR_TOP_Y);
  }

  private select(selection: Selection): void {
    this.clearSelectionTint();
    this.selected = selection;
    if (selection?.kind === 'ledge') {
      selection.ledge.container.list.forEach((child) => (child as Phaser.GameObjects.Image).setTint(EDITOR.selectedColor));
    } else if (selection?.kind === 'fish') {
      selection.point.sprite.setTint(EDITOR.selectedColor);
    } else if (selection?.kind === 'exit' && this.exitPoint) {
      this.exitPoint.sprite.setTint(EDITOR.selectedColor);
    }
  }

  private clearSelectionTint(): void {
    if (this.selected?.kind === 'ledge') {
      this.selected.ledge.container.list.forEach((child) => (child as Phaser.GameObjects.Image).clearTint());
    } else if (this.selected?.kind === 'fish') {
      this.selected.point.sprite.clearTint();
    } else if (this.selected?.kind === 'exit' && this.exitPoint) {
      this.exitPoint.sprite.clearTint();
    }
  }

  private deleteSelected(): void {
    if (!this.selected) return;
    if (this.selected.kind === 'ledge') {
      this.selected.ledge.container.destroy();
      this.ledges = this.ledges.filter((l) => l !== (this.selected as { kind: 'ledge'; ledge: PlacedLedge }).ledge);
    } else if (this.selected.kind === 'fish') {
      this.selected.point.sprite.destroy();
      this.fishList = this.fishList.filter((f) => f !== (this.selected as { kind: 'fish'; point: PlacedPoint }).point);
    } else if (this.selected.kind === 'exit') {
      this.exitPoint?.sprite.destroy();
      this.exitPoint = null;
    }
    this.selected = null;
    this.runValidation();
    this.saveDraft();
  }

  /** @param explicit — вызвано кнопкой «Проверить», а не автоматически после правки. */
  private runValidation(explicit = false): void {
    const ledgeData: Ledge[] = this.ledges.map((l) => ({ leftX: l.leftX, topY: l.topY, tiles: l.tiles }));
    const result = validateLevel(ledgeData, PLAYER_START, FLOOR_TOP_Y);

    this.ledges.forEach((l, i) => {
      const bad = result.unreachable.includes(i) || result.outOfBounds.includes(i)
        || result.tooClose.some(([a, b]) => a === i || b === i);
      const color = bad ? EDITOR.invalidColor : EDITOR.validColor;
      if (this.selected?.kind === 'ledge' && this.selected.ledge === l) return;
      l.container.list.forEach((child) => (child as Phaser.GameObjects.Image).setTint(color));
    });

    const parts: string[] = [];
    if (result.unreachable.length) parts.push(`недостижимы уступы №${result.unreachable.map((i) => i + 1).join(', ')}`);
    if (result.tooClose.length) parts.push(`пересекаются: ${result.tooClose.map(([a, b]) => `№${a + 1}-№${b + 1}`).join(', ')}`);
    if (result.outOfBounds.length) parts.push(`за границей экрана: №${result.outOfBounds.map((i) => i + 1).join(', ')}`);
    if (!this.exitPoint) parts.push('нет выхода');

    const ok = result.ok && !!this.exitPoint;
    this.statusText.setText(ok ? '✓ Уровень проходим' : `✗ ${parts.join(' · ') || 'есть проблемы'}`);
    this.statusText.setColor(ok ? '#4caf50' : '#e05252');

    if (explicit) this.showToast(ok ? 'Проверка пройдена' : 'Проверка нашла проблемы — см. подсветку');
  }

  private exportLevel(): void {
    if (this.ledges.length === 0 || !this.exitPoint) {
      this.showToast('Нужен хотя бы один уступ и выход');
      return;
    }
    const data: LevelData = {
      ledges: this.ledges.map((l) => ({ leftX: l.leftX, topY: l.topY, tiles: l.tiles })),
      fish: this.fishList.map((f) => ({ x: f.x, y: f.y })),
      exit: { x: this.exitPoint.x, y: this.exitPoint.y },
      dogPatrol: { ...this.dogPatrol },
    };
    const json = JSON.stringify(data, null, 2);
    // eslint-disable-next-line no-console
    console.log(`Уровень ${this.level} — вставить в src/config/customLevels.ts под ключ ${this.level}:\n${json}`);
    navigator.clipboard?.writeText(json)
      .then(() => this.showToast('JSON скопирован в буфер и выведен в консоль'))
      .catch(() => this.showToast('Не скопировалось — смотри консоль'));
  }

  private showToast(message: string): void {
    this.toastText.setText(message).setAlpha(1);
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: 1500, duration: 400 });
  }

  private clearBoard(): void {
    this.ledges.forEach((l) => l.container.destroy());
    this.fishList.forEach((f) => f.sprite.destroy());
    this.exitPoint?.sprite.destroy();
    this.ledges = [];
    this.fishList = [];
    this.exitPoint = null;
    this.dogPatrol = { ...DOG_PATROL };
    this.dogHandleMin.setPosition(this.dogPatrol.minX, FLOOR_TOP_Y);
    this.dogHandleMax.setPosition(this.dogPatrol.maxX, FLOOR_TOP_Y);
    this.redrawDogBand();
    this.selected = null;
    this.runValidation();
    this.saveDraft();
  }

  private currentLevelData(): LevelData {
    return {
      ledges: this.ledges.map((l) => ({ leftX: l.leftX, topY: l.topY, tiles: l.tiles })),
      fish: this.fishList.map((f) => ({ x: f.x, y: f.y })),
      exit: this.exitPoint ? { x: this.exitPoint.x, y: this.exitPoint.y } : { x: 0, y: 0 },
      dogPatrol: { ...this.dogPatrol },
    };
  }

  private loadLevelData(data: LevelData): void {
    for (const ledge of data.ledges) this.addLedge(ledge.leftX, ledge.topY);
    for (const fish of data.fish) this.addFish(fish.x, fish.y);
    if (data.exit.x !== 0 || data.exit.y !== 0) this.setExit(data.exit.x, data.exit.y - T);
    this.dogPatrol = { ...data.dogPatrol };
    this.dogHandleMin.setPosition(this.dogPatrol.minX, FLOOR_TOP_Y);
    this.dogHandleMax.setPosition(this.dogPatrol.maxX, FLOOR_TOP_Y);
    this.redrawDogBand();
  }

  private loadAllDrafts(): Partial<Record<number, LevelData>> {
    try {
      const raw = localStorage.getItem(EDITOR_DRAFT_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Partial<Record<number, LevelData>>) : {};
    } catch {
      return {};
    }
  }

  private saveDraft(): void {
    try {
      const drafts = this.loadAllDrafts();
      drafts[this.level] = this.currentLevelData();
      localStorage.setItem(EDITOR_DRAFT_STORAGE_KEY, JSON.stringify(drafts));
    } catch {
      // localStorage недоступен (приватный режим и т.п.) — черновик просто не сохранится.
    }
  }

  private loadLevel(n: number): void {
    if (this.ledges.length || this.fishList.length || this.exitPoint) this.saveDraft();

    this.level = Phaser.Math.Clamp(n, 1, MAX_LEVEL);
    this.levelLabel?.setText(`Ур. ${this.level}`);

    this.ledges.forEach((l) => l.container.destroy());
    this.fishList.forEach((f) => f.sprite.destroy());
    this.exitPoint?.sprite.destroy();
    this.ledges = [];
    this.fishList = [];
    this.exitPoint = null;
    this.selected = null;

    const data = this.loadAllDrafts()[this.level] ?? CUSTOM_LEVELS[this.level];
    if (data) {
      this.loadLevelData(data);
    } else {
      this.dogPatrol = { ...DOG_PATROL };
      this.dogHandleMin?.setPosition(this.dogPatrol.minX, FLOOR_TOP_Y);
      this.dogHandleMax?.setPosition(this.dogPatrol.maxX, FLOOR_TOP_Y);
      this.redrawDogBand();
    }
    this.runValidation();
  }
}
