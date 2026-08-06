import Phaser from 'phaser';
import {
  GAME, TEX, PLAYER, FLOOR_TOP_Y, PLAYER_START, LEDGE_TILES, DOG_PATROL, MAX_LEVEL,
  CUSTOM_LEVELS, EDITOR, EDITOR_DRAFT_STORAGE_KEY,
} from '@/config';
import type { Ledge, LevelData, DogPatrolZone } from '@/config/level';
import { validateLevel, snapToGrid, ledgesTooClose, hasHeadroomBelow, isLedgeReachableFrom } from '@/systems/levelValidation';

const T = GAME.tileSize;
const LEDGE_WIDTH = LEDGE_TILES * T;

/**
 * Сетка редактора — та же решётка, к которой снапятся объекты (кратные
 * `tileSize` от нуля). Раньше линии рисовались от высоты тулбара, из-за чего
 * подсказка расходилась с фактическим снапом на несколько пикселей и всё
 * казалось «наползающим».
 */
const FIRST_ROW = Math.ceil(EDITOR.toolbarHeight / T); // строка 0 спрятана под тулбаром
const LAST_ROW = Math.floor(FLOOR_TOP_Y / T) - 1; // ниже — пол
const LAST_COL = GAME.width / T - 1;
const GRID_TOP = FIRST_ROW * T;
const GRID_BOTTOM_Y = LAST_ROW * T;

interface PlacedLedge {
  leftX: number;
  topY: number;
  tiles: number;
  image: Phaser.GameObjects.Image;
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

interface EditorSceneData {
  level?: number;
  /** С чем вернулись из тест-заезда («Играть»), чтобы показать это тостом. */
  playResult?: 'win' | 'quit';
}

/**
 * Конструктор уровней — dev-инструмент, доступен по `?editor` в URL (см.
 * `main.ts`). Руками расставляются уступы/рыбки/выход, зона патруля собаки
 * тянется двумя ручками. Сетка во время перетаскивания уступа подсвечивает
 * клетку зелёным/красным: допрыгиваемо от ближайшего соседа и хватает роста
 * герою пройти понизу, или нет (`systems/levelValidation.ts`). «Проверить
 * уровень» гоняет ту же проверку целиком. «Скачать» выгружает
 * `customLevels.ts`, готовый заменить файл в репозитории.
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
  private dragPreview!: Phaser.GameObjects.Graphics;
  private statusText!: Phaser.GameObjects.Text;
  private levelLabel!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private selected: Selection = null;
  private returnedFrom: 'win' | 'quit' | null = null;

  constructor() {
    super('Editor');
  }

  init(data: EditorSceneData): void {
    this.level = Phaser.Math.Clamp(data.level ?? this.level, 1, MAX_LEVEL);
    this.returnedFrom = data.playResult ?? null;
  }

  create(): void {
    this.drawGrid();
    this.drawFloorReference();
    this.buildToolbar();
    this.drawDogHandles();
    this.dragPreview = this.add.graphics().setDepth(10);

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

    if (this.returnedFrom === 'win') this.showToast('Уровень пройден — выход достижим', 2500);
    else if (this.returnedFrom === 'quit') this.showToast('Вернулись в редактор', 1500);
    else this.showToast('Тащи уступ на сетку → «Играть», чтобы проверить руками. «Скачать» — сохранить уровень в репозиторий', 4500);
  }

  private drawGrid(): void {
    const g = this.add.graphics().setDepth(1);
    g.lineStyle(1, EDITOR.gridColor, EDITOR.gridAlpha);
    for (let x = 0; x <= GAME.width; x += T) {
      g.lineBetween(x, GRID_TOP, x, FLOOR_TOP_Y);
    }
    for (let y = GRID_TOP; y <= (LAST_ROW + 1) * T; y += T) {
      g.lineBetween(0, y, GAME.width, y);
    }
    g.lineBetween(0, FLOOR_TOP_Y, GAME.width, FLOOR_TOP_Y);
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
      { texture: TEX.ledge, kind: 'ledge' },
      { texture: TEX.fish, kind: 'fish' },
      { texture: TEX.exit, kind: 'exit' },
    ];
    paletteDefs.forEach((def, i) => {
      const x = EDITOR.paletteStartX + i * EDITOR.paletteSpacingX;
      this.setupPaletteStamp(x, EDITOR.paletteY, def.texture, def.kind);
    });

    let bx = EDITOR.paletteStartX + paletteDefs.length * EDITOR.paletteSpacingX + 10;
    bx = this.addButton(bx, 'Играть', () => this.playCurrentLevel(), 48);
    bx = this.addButton(bx, 'Проверить', () => this.runValidation(true));
    bx = this.addButton(bx, 'Скачать', () => this.downloadLevels(), 62);
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
      if (kind === 'ledge') this.updateDragPreview(dragX, dragY, null);
    });
    icon.on('dragend', () => {
      if (kind === 'ledge') {
        const clamped = this.clampToGrid(icon.x, icon.y, LEDGE_WIDTH);
        this.addLedge(clamped.x, clamped.y);
      } else if (kind === 'fish') {
        const spot = this.snapFish(icon.x, icon.y);
        this.addFish(spot.x, spot.y);
      } else {
        const spot = this.snapExitBottom(icon.x, icon.y);
        this.setExit(spot.x, spot.y);
      }
      icon.setPosition(x, y);
      this.dragPreview.clear();
      this.runValidation();
      this.saveDraft();
    });
  }

  /**
   * Снап левого верхнего угла уступа. Границы округлены до целых клеток —
   * иначе уступ, доведённый до края экрана, вставал бы на пару пикселей
   * мимо решётки и переставал совпадать с сеткой.
   */
  private clampToGrid(x: number, y: number, width: number): { x: number; y: number } {
    const snapped = snapToGrid(x, y);
    return {
      x: Phaser.Math.Clamp(snapped.x, 0, Math.floor((GAME.width - width) / T) * T),
      y: Phaser.Math.Clamp(snapped.y, GRID_TOP, GRID_BOTTOM_Y),
    };
  }

  /**
   * Клетка сетки под курсором. Рыбка и выход — точечные объекты с origin по
   * центру/низу, поэтому их нельзя ставить в угол клетки: половина спрайта
   * уезжает в соседнюю клетку и «наползает» на уступ. Точка кладётся в центр
   * клетки (рыбка) или на её нижнюю грань (выход).
   */
  private cellUnder(x: number, y: number): { col: number; row: number } {
    return {
      col: Phaser.Math.Clamp(Math.floor(x / T), 0, LAST_COL),
      row: Phaser.Math.Clamp(Math.floor(y / T), FIRST_ROW, LAST_ROW),
    };
  }

  /**
   * Уступ, пересекающий клетку. Пересечение прямоугольников, а не равенство
   * координат: уступы из старых черновиков лежат не по решётке, и точное
   * сравнение их не находило — рыбка тонула в платформе.
   */
  private ledgeAtCell(col: number, row: number): PlacedLedge | undefined {
    const left = col * T;
    const top = row * T;
    return this.ledges.find((l) => (
      l.leftX < left + T && l.leftX + l.tiles * T > left && l.topY < top + T && l.topY + T > top
    ));
  }

  /**
   * Рыбка встаёт в центр клетки, а если клетка занята уступом — вплотную над
   * ним: положил рыбку на платформу — она лежит над платформой, а не в ней.
   */
  private snapFish(x: number, y: number): { x: number; y: number } {
    const { col, row } = this.cellUnder(x, y);
    const ledge = this.ledgeAtCell(col, row);
    const centerY = ledge ? ledge.topY - T / 2 : row * T + T / 2;
    return { x: col * T + T / 2, y: Math.max(centerY, GRID_TOP + T / 2) };
  }

  /**
   * Выход рисуется с origin (0.5, 1), поэтому снапится его нижняя грань:
   * на верх уступа под курсором, а в самом нижнем ряду — на пол.
   */
  private snapExitBottom(x: number, y: number): { x: number; y: number } {
    const { col, row } = this.cellUnder(x, y);
    const ledge = this.ledgeAtCell(col, row);
    const bottom = ledge ? ledge.topY : row === LAST_ROW ? FLOOR_TOP_Y : (row + 1) * T;
    return { x: col * T + T / 2, y: bottom };
  }

  /**
   * Рисует на сетке клетку под курсором зелёным (можно ставить — допрыгнет
   * от ближайшего соседа и герой пройдёт понизу) или красным. `excluding` —
   * сам уступ, если это репозиция уже поставленного, чтобы не сравнивать
   * его сам с собой.
   */
  private updateDragPreview(rawX: number, rawY: number, excluding: PlacedLedge | null): void {
    const clamped = this.clampToGrid(rawX, rawY, LEDGE_WIDTH);
    const candidate: Ledge = { leftX: clamped.x, topY: clamped.y, tiles: LEDGE_TILES };
    const others = this.ledges.filter((l) => l !== excluding);
    const othersData: Ledge[] = others.map((l) => ({ leftX: l.leftX, topY: l.topY, tiles: l.tiles }));

    const overlaps = othersData.some((o) => ledgesTooClose(candidate, o));
    const headroomOk = hasHeadroomBelow(candidate, othersData, FLOOR_TOP_Y, PLAYER.height);

    let reachable = true;
    if (others.length === 0) {
      reachable = isLedgeReachableFrom(candidate, { leftX: PLAYER_START.x, topY: FLOOR_TOP_Y });
    } else {
      // Ближайший уже поставленный уступ по X — «сосед», до которого нужно допрыгнуть.
      const nearest = others.reduce((best, l) => (
        Math.abs(l.leftX - candidate.leftX) < Math.abs(best.leftX - candidate.leftX) ? l : best
      ));
      reachable = isLedgeReachableFrom(candidate, nearest);
    }

    const ok = !overlaps && headroomOk && reachable;
    this.dragPreview.clear();
    this.dragPreview.lineStyle(EDITOR.previewLineWidth, ok ? EDITOR.validColor : EDITOR.invalidColor, 1);
    this.dragPreview.strokeRect(candidate.leftX, candidate.topY, LEDGE_WIDTH, T);
  }

  private addLedge(leftX: number, topY: number): PlacedLedge {
    const image = this.add.image(leftX, topY, TEX.ledge).setOrigin(0, 0).setDepth(5).setInteractive({ useHandCursor: true });
    this.input.setDraggable(image);

    const placed: PlacedLedge = { leftX, topY, tiles: LEDGE_TILES, image };

    image.on('pointerdown', () => this.select({ kind: 'ledge', ledge: placed }));
    image.on('drag', (_p: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      image.setPosition(dragX, dragY);
      placed.leftX = dragX;
      placed.topY = dragY;
      this.updateDragPreview(dragX, dragY, placed);
    });
    image.on('dragend', () => {
      const clamped = this.clampToGrid(image.x, image.y, LEDGE_WIDTH);
      image.setPosition(clamped.x, clamped.y);
      placed.leftX = clamped.x;
      placed.topY = clamped.y;
      this.dragPreview.clear();
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
      const spot = this.snapFish(sprite.x, sprite.y);
      sprite.setPosition(spot.x, spot.y);
      placed.x = spot.x;
      placed.y = spot.y;
      this.saveDraft();
    });

    this.fishList.push(placed);
    return placed;
  }

  /**
   * @param y — нижняя грань выхода, ровно то, что уходит в `LevelData.exit.y`
   * и что `GameScene` рисует с тем же origin (0.5, 1). Раньше сохранялось
   * `y + T`, и в игре выход оказывался на тайл ниже, чем в редакторе.
   */
  private setExit(x: number, y: number): void {
    if (this.exitPoint) {
      this.exitPoint.sprite.destroy();
    }
    const sprite = this.add.image(x, y, TEX.exit).setOrigin(0.5, 1).setDepth(6).setInteractive({ useHandCursor: true });
    this.input.setDraggable(sprite);
    const placed: PlacedPoint = { x, y, sprite };
    this.exitPoint = placed;

    sprite.on('pointerdown', () => this.select({ kind: 'exit' }));
    sprite.on('drag', (_p: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      sprite.setPosition(dragX, dragY);
      placed.x = dragX;
      placed.y = dragY;
    });
    sprite.on('dragend', () => {
      // Курсор держит выход за низ спрайта — клетку ищем чуть выше этой грани.
      const spot = this.snapExitBottom(sprite.x, sprite.y - T / 2);
      sprite.setPosition(spot.x, spot.y);
      placed.x = spot.x;
      placed.y = spot.y;
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
      selection.ledge.image.setTint(EDITOR.selectedColor);
    } else if (selection?.kind === 'fish') {
      selection.point.sprite.setTint(EDITOR.selectedColor);
    } else if (selection?.kind === 'exit' && this.exitPoint) {
      this.exitPoint.sprite.setTint(EDITOR.selectedColor);
    }
  }

  private clearSelectionTint(): void {
    if (this.selected?.kind === 'ledge') {
      this.selected.ledge.image.clearTint();
    } else if (this.selected?.kind === 'fish') {
      this.selected.point.sprite.clearTint();
    } else if (this.selected?.kind === 'exit' && this.exitPoint) {
      this.exitPoint.sprite.clearTint();
    }
  }

  private deleteSelected(): void {
    if (!this.selected) return;
    if (this.selected.kind === 'ledge') {
      this.selected.ledge.image.destroy();
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
      if (this.selected?.kind === 'ledge' && this.selected.ledge === l) return;
      const badReach = result.unreachable.includes(i) || result.outOfBounds.includes(i)
        || result.tooClose.some(([a, b]) => a === i || b === i);
      const badHeadroom = result.noHeadroom.includes(i);
      const color = badReach ? EDITOR.invalidColor : badHeadroom ? EDITOR.headroomColor : EDITOR.validColor;
      l.image.setTint(color);
    });

    const parts: string[] = [];
    if (result.unreachable.length) parts.push(`недостижимы уступы №${result.unreachable.map((i) => i + 1).join(', ')}`);
    if (result.tooClose.length) parts.push(`пересекаются: ${result.tooClose.map(([a, b]) => `№${a + 1}-№${b + 1}`).join(', ')}`);
    if (result.outOfBounds.length) parts.push(`за границей экрана: №${result.outOfBounds.map((i) => i + 1).join(', ')}`);
    if (result.noHeadroom.length) parts.push(`негде пройти под №${result.noHeadroom.map((i) => i + 1).join(', ')}`);
    if (!this.exitPoint) parts.push('нет выхода');

    const ok = result.ok && !!this.exitPoint;
    this.statusText.setText(ok ? '✓ Уровень проходим' : `✗ ${parts.join(' · ') || 'есть проблемы'}`);
    this.statusText.setColor(ok ? '#4caf50' : '#e05252');

    if (explicit) this.showToast(ok ? 'Проверка пройдена' : 'Проверка нашла проблемы — см. подсветку');
  }

  private currentLevelData(): LevelData {
    return {
      ledges: this.ledges.map((l) => ({ leftX: l.leftX, topY: l.topY, tiles: l.tiles })),
      fish: this.fishList.map((f) => ({ x: f.x, y: f.y })),
      exit: this.exitPoint ? { x: this.exitPoint.x, y: this.exitPoint.y } : { x: 0, y: 0 },
      dogPatrol: { ...this.dogPatrol },
    };
  }

  private hasContent(data: LevelData | undefined): data is LevelData {
    return !!data && data.ledges.length > 0 && !(data.exit.x === 0 && data.exit.y === 0);
  }

  /**
   * Собирает `customLevels.ts` целиком (все уровни с черновиком в
   * localStorage + текущий уровень в памяти прямо сейчас) и скачивает как
   * файл — самый понятный «сохранить», который есть без бэкенда: просто
   * заменить им `src/config/customLevels.ts` в репозитории.
   */
  private downloadLevels(): void {
    this.saveDraft();
    const drafts = this.loadAllDrafts();
    const merged: Partial<Record<number, LevelData>> = { ...CUSTOM_LEVELS, ...drafts };

    const entries = Object.entries(merged)
      .filter((entry): entry is [string, LevelData] => this.hasContent(entry[1]))
      .sort(([a], [b]) => Number(a) - Number(b));

    if (entries.length === 0) {
      this.showToast('Нечего скачивать — нужен хотя бы один уступ и выход на каком-нибудь уровне');
      return;
    }

    const body = entries
      .map(([lvl, data]) => `  ${lvl}: ${JSON.stringify(data, null, 2).replace(/\n/g, '\n  ')},`)
      .join('\n');

    const fileContent = `import type { LevelData } from './level';

/**
 * Уровни, собранные вручную в редакторе (\`?editor\` → «Скачать»).
 * Файл сгенерирован автоматически — заменить им src/config/customLevels.ts.
 */
export const CUSTOM_LEVELS: Partial<Record<number, LevelData>> = {
${body}
};
`;

    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customLevels.ts';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    // eslint-disable-next-line no-console
    console.log(`Скачан customLevels.ts (уровни: ${entries.map(([lvl]) => lvl).join(', ')}). Замени им src/config/customLevels.ts.`);
    this.showToast(`Скачан customLevels.ts (уровни ${entries.map(([lvl]) => lvl).join(', ')}) — замени файл в src/config/`, 4000);
  }

  /**
   * Тест-заезд по тому, что сейчас на доске: уровень уходит в `GameScene`
   * прямо из памяти, минуя `customLevels.ts`. Прогресс игрока при этом не
   * трогается, ESC в игре возвращает обратно в редактор.
   */
  private playCurrentLevel(): void {
    if (!this.exitPoint) {
      this.showToast('Некуда идти — поставь выход (жёлтая дверь в палитре)', 2500);
      return;
    }
    if (this.ledges.length === 0) {
      this.showToast('Пустой уровень — поставь хотя бы один уступ', 2500);
      return;
    }
    this.saveDraft();
    this.scene.start('Game', { level: this.level, testLevel: this.currentLevelData() });
  }

  private showToast(message: string, durationMs = 1500): void {
    this.tweens.killTweensOf(this.toastText);
    this.toastText.setText(message).setAlpha(1);
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: durationMs, duration: 400 });
  }

  private clearBoard(): void {
    this.ledges.forEach((l) => l.image.destroy());
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

  private loadLevelData(data: LevelData): void {
    for (const ledge of data.ledges) this.addLedge(ledge.leftX, ledge.topY);
    for (const fish of data.fish) this.addFish(fish.x, fish.y);
    if (data.exit.x !== 0 || data.exit.y !== 0) this.setExit(data.exit.x, data.exit.y);
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

    this.ledges.forEach((l) => l.image.destroy());
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
