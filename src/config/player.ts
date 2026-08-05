/**
 * Габариты тела Пушка. Используются и в PreloadScene (плейсхолдер-текстура),
 * и в systems/jumpGeometry.ts — расстановка уступов должна знать реальную
 * ширину тела, а не only физику прыжка «в точке».
 */
export const PLAYER = {
  width: 24,
  height: 28,
} as const;
