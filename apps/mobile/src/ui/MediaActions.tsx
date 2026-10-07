import { useState } from 'react';
import { View } from 'react-native';
import { saveToPhotos, shareMedia } from '@/lib/files';
import { Button, ErrorText, Muted } from './kit';
import { space } from './theme';

/** Save-to-phone and Share buttons for a generated image/video (URL or data: URI). */
export function MediaActions({ source, ext, savable = true }: { source: string; ext: string; savable?: boolean }) {
  const [busy, setBusy] = useState<'save' | 'share' | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: 'save' | 'share') {
    setBusy(kind);
    setError(null);
    setNote(null);
    try {
      if (kind === 'save') {
        await saveToPhotos(source, ext);
        setNote('Saved to your photos.');
      } else {
        await shareMedia(source, ext);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {savable && (
          <View style={{ flex: 1 }}>
            <Button title="Save" variant="secondary" onPress={() => run('save')} loading={busy === 'save'} disabled={busy !== null} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Button title="Share" variant="secondary" onPress={() => run('share')} loading={busy === 'share'} disabled={busy !== null} />
        </View>
      </View>
      {note && <Muted>{note}</Muted>}
      <ErrorText message={error} />
    </View>
  );
}
