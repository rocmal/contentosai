import { MediaAssetType } from '../lib/api';

/** Compact relative-time label ("2h ago", "1d ago") for generation/media
 * cards on Home and Studio - distinct from notificationTimeLabel's clock-
 * time/weekday style, which suits a chronological list better than a
 * compact card. */
export function relativeTimeShort(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** MediaAssetType -> the label the mobile UI already uses for each studio
 * ("VOICE" rather than the backend's "audio", matching Studio's sub-tab
 * names). Every studio's output is reflected here, each with its own
 * distinct type - Character Studio's talking-avatar clips have their own
 * 'character' type (not lumped into 'video'). */
export function generationTypeLabel(type: MediaAssetType): string {
  switch (type) {
    case 'image':
      return 'IMAGE';
    case 'video':
      return 'VIDEO';
    case 'audio':
      return 'VOICE';
    case 'character':
      return 'CHARACTER';
    default:
      return 'FILE';
  }
}
