import { useWindowDimensions } from 'react-native';

/** Widest a preview gets, so a tablet or a wide browser window does not show a wall-sized clip. */
const MAX_WIDTH = 640;
/** Tallest a preview gets: this many points, and never more than this share of the screen height. */
const MAX_HEIGHT = 560;
const MAX_HEIGHT_SHARE = 0.6;

/**
 * Width and height for an image or video preview of the given shape (width / height, e.g. 16 / 9).
 * The box keeps that exact shape while fitting both the available width (window width minus `inset`, the
 * horizontal padding around it) and a height limit. Giving a fixed width plus `aspectRatio` plus `maxHeight`
 * instead lets the height be cut while the width stays, which bends the shape on wide screens.
 */
export function useMediaBox(ratio: number, inset: number, maxHeight = MAX_HEIGHT): { width: number; height: number } {
  const window = useWindowDimensions();
  const maxW = Math.max(0, Math.min(window.width - inset, MAX_WIDTH));
  const maxH = Math.min(maxHeight, window.height * MAX_HEIGHT_SHARE);
  const width = Math.floor(Math.min(maxW, maxH * ratio));
  return { width, height: Math.floor(width / ratio) };
}
