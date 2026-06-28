/**
 * Adjusts context menu coordinates to prevent them from opening off-screen.
 * 
 * @param {number} clientX - Pointer event clientX
 * @param {number} clientY - Pointer event clientY
 * @param {number} menuWidth - The approximate width of the context menu
 * @param {number} menuHeight - The approximate height of the context menu
 * @param {number} [padding=10] - Safety margin padding from screen edge
 * @returns {{x: number, y: number}} Adjusted {x, y} coordinates
 */
export function getAdjustedCoordinates(clientX, clientY, menuWidth, menuHeight, padding = 10) {
  let x = clientX;
  let y = clientY;

  if (x + menuWidth > window.innerWidth) {
    x = window.innerWidth - menuWidth - padding;
  }

  if (y + menuHeight > window.innerHeight) {
    y = window.innerHeight - menuHeight - padding;
  }

  // Prevent coordinate from being negative
  x = Math.max(padding, x);
  y = Math.max(padding, y);

  return { x, y };
}
