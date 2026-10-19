import type { VideoPlayer } from 'expo-video';
import { useEffect, useState } from 'react';

/**
 * Browser build of useVideoAspect (see videoAspect.ts): expo-video does not report track sizes on the web,
 * so this reads the clip's size from its metadata with a hidden <video> that downloads only the header.
 */
export function useVideoAspect(_player: VideoPlayer, uri: string): number | null {
  const [aspect, setAspect] = useState<number | null>(null);
  useEffect(() => {
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.muted = true;
    const onMeta = () => {
      if (probe.videoWidth > 0 && probe.videoHeight > 0) setAspect(probe.videoWidth / probe.videoHeight);
    };
    probe.addEventListener('loadedmetadata', onMeta);
    probe.src = uri;
    return () => {
      probe.removeEventListener('loadedmetadata', onMeta);
      probe.removeAttribute('src');
      probe.load();
    };
  }, [uri]);
  return aspect;
}
