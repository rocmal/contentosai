import React, { useRef, useState } from 'react';
import {
  clampFontScale,
  clampOverlayPct,
  DEFAULT_FONT_SCALE,
  DEFAULT_OVERLAY_POINT,
  DEFAULT_PREVIEW_WIDTH_PX,
  FONT_FAMILY_OPTIONS,
  OverlayPoint,
} from './constants';

/** The text overlay on the edit step: its words, place, font, size and colour, dragged and resized on the preview. */
export function useTextOverlay() {
  // Text overlay editor
  const [overlayText, setOverlayText] = useState('');
  const [overlayPoint, setOverlayPoint] = useState<OverlayPoint>(DEFAULT_OVERLAY_POINT);
  const [isDraggingOverlay, setIsDraggingOverlay] = useState(false);
  const [isEditingOverlayText, setIsEditingOverlayText] = useState(false);
  const overlayPreviewRef = useRef<HTMLDivElement>(null);
  const overlayDragRef = useRef<{ startX: number; startY: number; moved: boolean } | null>(null);
  const [isResizingOverlay, setIsResizingOverlay] = useState(false);
  const overlayResizeStartRef = useRef<{ pointerX: number; scale: number } | null>(null);
  const [overlayFontFamilyId, setOverlayFontFamilyId] = useState<(typeof FONT_FAMILY_OPTIONS)[number]['id']>('sans');
  const [overlayFontScale, setOverlayFontScale] = useState(DEFAULT_FONT_SCALE);
  const [overlayColor, setOverlayColor] = useState('#ffffff');

  const selectedFontFamily = FONT_FAMILY_OPTIONS.find((f) => f.id === overlayFontFamilyId) ?? FONT_FAMILY_OPTIONS[0];
  // Font size in the live preview is derived from the actual rendered
  // preview width, so what's shown stays proportionally identical to what
  // videoCompositor.ts draws onto the (usually much larger) export canvas.
  const overlayPreviewWidthPx = overlayPreviewRef.current?.getBoundingClientRect().width ?? DEFAULT_PREVIEW_WIDTH_PX;
  const overlayPreviewFontSizePx = Math.max(12, Math.round(overlayPreviewWidthPx / overlayFontScale));

  // ---------------------------------------------------------------------
  // Step 2: optional text overlay -> composite -> result
  // ---------------------------------------------------------------------

  // Dragging the text directly on the preview - position is tracked as a
  // 0-100 percentage of the preview box, which maps 1:1 onto the canvas the
  // real export draws on (see compositeTextOntoVideo's xPct/yPct). A plain
  // click (pointerdown+up with no real movement) opens inline editing
  // instead of just re-dropping the text where it already was.
  const CLICK_MOVE_THRESHOLD_PX = 4;

  const updateOverlayPointFromPointer = (e: React.PointerEvent) => {
    const container = overlayPreviewRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setOverlayPoint({
      xPct: clampOverlayPct(((e.clientX - rect.left) / rect.width) * 100),
      yPct: clampOverlayPct(((e.clientY - rect.top) / rect.height) * 100),
    });
  };

  const handleOverlayPointerDown = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (isEditingOverlayText) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    overlayDragRef.current = { startX: e.clientX, startY: e.clientY, moved: false };
    setIsDraggingOverlay(true);
  };

  const handleOverlayPointerMove = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (!isDraggingOverlay || !overlayDragRef.current) return;
    const { startX, startY, moved } = overlayDragRef.current;
    if (!moved && Math.hypot(e.clientX - startX, e.clientY - startY) > CLICK_MOVE_THRESHOLD_PX) {
      overlayDragRef.current.moved = true;
    }
    if (overlayDragRef.current.moved) {
      updateOverlayPointFromPointer(e);
    }
  };

  const handleOverlayPointerUp = (e: React.PointerEvent<HTMLSpanElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDraggingOverlay(false);
    if (overlayDragRef.current && !overlayDragRef.current.moved) {
      setIsEditingOverlayText(true);
    }
    overlayDragRef.current = null;
  };

  // Resizing - drag the handle at the text's corner; distance moved
  // horizontally maps proportionally onto the font "scale" divisor (see
  // FONT_SIZE_PRESETS comment) relative to the preview's own width, so it
  // feels consistent regardless of how big the preview is on screen.
  const handleResizePointerDown = (e: React.PointerEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsResizingOverlay(true);
    overlayResizeStartRef.current = { pointerX: e.clientX, scale: overlayFontScale };
  };

  const handleResizePointerMove = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (!isResizingOverlay || !overlayResizeStartRef.current) return;
    const container = overlayPreviewRef.current;
    const containerWidth = container?.getBoundingClientRect().width ?? DEFAULT_PREVIEW_WIDTH_PX;
    const { pointerX, scale } = overlayResizeStartRef.current;
    const delta = e.clientX - pointerX;
    setOverlayFontScale(clampFontScale(scale - (delta / containerWidth) * 30));
  };

  const handleResizePointerUp = (e: React.PointerEvent<HTMLSpanElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsResizingOverlay(false);
    overlayResizeStartRef.current = null;
  };

  /** Removes the text and puts it back at the default spot (going back to the scenes keeps the style). */
  const clearOverlayText = () => {
    setOverlayText('');
    setOverlayPoint(DEFAULT_OVERLAY_POINT);
    setIsEditingOverlayText(false);
  };

  /** "Start over": no text and the default style. */
  const resetOverlay = () => {
    clearOverlayText();
    setOverlayFontFamilyId('sans');
    setOverlayFontScale(DEFAULT_FONT_SCALE);
    setOverlayColor('#ffffff');
  };

  return {
    clearOverlayText,
    handleOverlayPointerDown,
    handleOverlayPointerMove,
    handleOverlayPointerUp,
    handleResizePointerDown,
    handleResizePointerMove,
    handleResizePointerUp,
    isDraggingOverlay,
    isEditingOverlayText,
    isResizingOverlay,
    overlayColor,
    overlayFontFamilyId,
    overlayFontScale,
    overlayPoint,
    overlayPreviewFontSizePx,
    overlayPreviewRef,
    overlayText,
    resetOverlay,
    selectedFontFamily,
    setIsEditingOverlayText,
    setOverlayColor,
    setOverlayFontFamilyId,
    setOverlayFontScale,
    setOverlayPoint,
    setOverlayText,
  };
}

export type TextOverlay = ReturnType<typeof useTextOverlay>;
