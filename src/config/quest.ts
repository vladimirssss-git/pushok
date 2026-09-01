/**
 * Данные первого уровня — квеста в лесу у моста.
 * Единственный источник текста квеста и диалогов (правило единственного источника чисел
 * распространяется и на игровой текст: раскидан по сцене — разойдётся при правке).
 */
export interface QuestStep {
  id: string;
  title: string;
}

export const QUEST_STEPS: QuestStep[] = [
  { id: 'key', title: 'Найди ключ от моста' },
  { id: 'talk', title: 'Поговори с псом' },
  { id: 'chest', title: 'Открой сундук' },
  { id: 'lighthouse', title: 'Найди путь к маяку' },
];

export const QUEST_DIALOGUE = {
  dogName: 'ПАЛКАН',
  dogGreeting: 'Хочешь попасть к маяку? Мост сломан.\nНайди старинный ключ. Подсказка на доске.',
  dogRepeat: 'Ключ был у хозяина.\nОн потерял его, когда ходил купаться.',
  boardTitle: 'Старинный ключ',
  boardHint: 'ищи там, где\nпоют рыбы',
  signLabel: 'МАЯК →',
} as const;

export const QUEST_HUD = {
  hearts: 3,
  fish: 0,
  starsCurrent: 1,
  starsTotal: 5,
} as const;

export interface QuestRoutePoint {
  x: number;
  y: number;
}

/**
 * Разрешённый мобильный маршрут первого квеста. Точки идут по центру дорожки,
 * ступеней и полотна моста; вода, небо и нижний UI намеренно остаются вне
 * коридора принятия тапа.
 */
export const QUEST_ROUTE = {
  points: [
    { x: 95, y: 265 },
    { x: 140, y: 262 },
    { x: 180, y: 248 },
    { x: 215, y: 225 },
    { x: 250, y: 202 },
    { x: 285, y: 184 },
    { x: 325, y: 170 },
    { x: 365, y: 164 },
    { x: 405, y: 169 },
    { x: 445, y: 184 },
    { x: 480, y: 205 },
    { x: 510, y: 230 },
  ] satisfies QuestRoutePoint[],
  tapTolerancePx: 24,
  bottomUiTopY: 260,
  speedPxPerMs: 0.065,
  arrivalEpsilonPx: 0.5,
} as const;

/** Дистанция в пикселях, на которой Пушок «слышит» пса и всплывает диалог. */
export const QUEST_TALK_RANGE = 46;
