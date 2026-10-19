/**
 * Length of an audio file in seconds, or null when it cannot be read within 10 seconds.
 * Browser recordings (MediaRecorder webm) often report an Infinity duration until the player has looked at the
 * end of the file, so in that case this seeks far ahead once and reads the real length when it arrives.
 */
export function measureAudioSeconds(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = 'metadata';
    let settled = false;
    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      audio.removeAttribute('src');
      audio.load();
      resolve(value);
    };
    const known = () => Number.isFinite(audio.duration) && audio.duration > 0;
    const timer = window.setTimeout(() => finish(null), 10_000);

    audio.addEventListener('loadedmetadata', () => {
      if (known()) {
        finish(audio.duration);
        return;
      }
      audio.addEventListener('durationchange', () => {
        if (known()) finish(audio.duration);
      });
      audio.currentTime = 1e7;
    });
    audio.addEventListener('error', () => finish(null));
    audio.src = url;
  });
}
