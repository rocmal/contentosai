import type { VideoPlayer } from 'expo-video';
import { useEffect, useState } from 'react';

/**
 * The real shape (width / height) of the clip a player has loaded, or null until it is known.
 * iOS and Android report the video track size once the source loads. The web build has its own
 * version (videoAspect.web.ts) because expo-video does not report track sizes in the browser.
 */
export function useVideoAspect(player: VideoPlayer, _uri: string): number | null {
  const [aspect, setAspect] = useState<number | null>(null);
  useEffect(() => {
    const read = (size: { width: number; height: number } | undefined) => {
      if (size && size.width > 0 && size.height > 0) setAspect(size.width / size.height);
    };
    const onLoad = player.addListener('sourceLoad', ({ availableVideoTracks }) => read(availableVideoTracks[0]?.size));
    const onTrack = player.addListener('videoTrackChange', ({ videoTrack }) => read(videoTrack?.size));
    return () => {
      onLoad.remove();
      onTrack.remove();
    };
  }, [player]);
  return aspect;
}
