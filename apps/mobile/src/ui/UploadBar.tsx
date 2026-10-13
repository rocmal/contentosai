import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import type { MediaAssetType } from '@/lib/api';
import { getGalleryUsage, uploadDeviceFile, type DeviceFile } from '@/lib/upload';
import { ErrorText, Muted, PillButton } from './kit';
import { colors, space } from './theme';

const MAX_PER_PICK = 10;

type Kind = DeviceFile['kind'];

function fromPicker(asset: ImagePicker.ImagePickerAsset): DeviceFile {
  return {
    uri: asset.uri,
    kind: asset.type === 'video' ? 'video' : 'image',
    fileName: asset.fileName,
    mimeType: asset.mimeType,
    fileSize: asset.fileSize,
  };
}

function fromDocument(asset: DocumentPicker.DocumentPickerAsset): DeviceFile {
  return { uri: asset.uri, kind: 'audio', fileName: asset.name, mimeType: asset.mimeType, fileSize: asset.size };
}

const NOUN: Record<Kind, [string, string]> = {
  image: ['photo', 'photos'],
  video: ['video', 'videos'],
  audio: ['audio file', 'audio files'],
};

function addedNote(kinds: Kind[]): string {
  const same = kinds.every((k) => k === kinds[0]);
  const [one, many] = same ? NOUN[kinds[0]] : ['item', 'items'];
  return `Added ${kinds.length} ${kinds.length === 1 ? one : many} to your gallery.`;
}

/**
 * Upload from the phone into the Gallery. The picker follows the Gallery tab: Images shows only photos,
 * Videos only videos, Audio only audio files; All asks which.
 */
export function UploadBar({ filter, onUploaded }: { filter: MediaAssetType | undefined; onUploaded: () => void }) {
  const [usage, setUsage] = useState<{ count: number; max: number } | null>(null);
  const [choosing, setChoosing] = useState<'upload' | 'camera' | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refreshUsage() {
    getGalleryUsage()
      .then(setUsage)
      .catch(() => undefined);
  }

  useEffect(() => {
    getGalleryUsage()
      .then(setUsage)
      .catch(() => undefined);
  }, []);

  // Images and videos share the gallery limit; audio does not count towards it.
  const remaining = usage ? Math.max(0, usage.max - usage.count) : MAX_PER_PICK;
  const full = usage !== null && remaining === 0;

  function refuseIfFull(): boolean {
    if (!full) return false;
    setError(`Your gallery has ${usage?.max} images and videos, the most it can hold. Delete some to make room.`);
    return true;
  }

  async function uploadAll(files: DeviceFile[]) {
    setChoosing(null);
    setNote(null);
    setError(null);
    const problems: string[] = [];
    const added: Kind[] = [];
    for (let i = 0; i < files.length; i += 1) {
      setProgress({ current: i + 1, total: files.length });
      try {
        // One at a time: phone uploads are slow, and the count shows real progress.
        await uploadDeviceFile(files[i]);
        added.push(files[i].kind);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Upload failed.';
        problems.push(files.length > 1 ? `Item ${i + 1}: ${message}` : message);
        // The gallery is full: the rest would fail the same way.
        if (/limit/i.test(message) && !/25 MB/.test(message)) break;
      }
    }
    setProgress(null);
    if (added.length) setNote(addedNote(added));
    if (problems.length) setError(problems.join('\n'));
    refreshUsage();
    if (added.length) onUploaded();
  }

  async function pickVisual(types: ('images' | 'videos')[]) {
    setChoosing(null);
    if (refuseIfFull()) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: types,
        allowsMultipleSelection: true,
        selectionLimit: Math.min(MAX_PER_PICK, remaining),
        orderedSelection: true,
        quality: 0.85,
        exif: false,
        // iPhone photos come as HEIC; ask for JPEG so every app and website can open them.
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      if (!result.canceled) await uploadAll(result.assets.slice(0, remaining).map(fromPicker));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open your photos.');
    }
  }

  async function pickAudio() {
    setChoosing(null);
    try {
      // Opens the phone's Files picker showing audio only (music, voice recordings, WhatsApp audio saved to Files).
      const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', multiple: true, copyToCacheDirectory: true });
      if (!result.canceled) await uploadAll(result.assets.slice(0, MAX_PER_PICK).map(fromDocument));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open your files.');
    }
  }

  async function fromCamera(kind: 'image' | 'video') {
    setChoosing(null);
    if (refuseIfFull()) return;
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError('Allow camera access for Lumora in your phone Settings to take photos and videos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: [kind === 'video' ? 'videos' : 'images'],
        quality: 0.85,
        exif: false,
        // Short clips stay under the 25 MB upload limit.
        videoMaxDuration: 15,
      });
      if (!result.canceled) await uploadAll(result.assets.map(fromPicker));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open the camera.');
    }
  }

  const busy = progress !== null;
  const phone = Platform.OS !== 'web';

  // The main button follows the tab; "All" offers a choice.
  const upload =
    filter === 'image'
      ? { label: 'Upload images', icon: 'image' as const, onPress: () => void pickVisual(['images']) }
      : filter === 'video'
        ? { label: 'Upload videos', icon: 'videocam' as const, onPress: () => void pickVisual(['videos']) }
        : filter === 'audio'
          ? { label: 'Upload audio', icon: 'musical-notes' as const, onPress: () => void pickAudio() }
          : { label: 'Upload', icon: 'cloud-upload' as const, onPress: () => setChoosing(choosing === 'upload' ? null : 'upload') };

  const camera =
    !phone || filter === 'audio'
      ? null
      : filter === 'image'
        ? { label: 'Take photo', onPress: () => void fromCamera('image') }
        : filter === 'video'
          ? { label: 'Record video', onPress: () => void fromCamera('video') }
          : { label: 'Camera', onPress: () => setChoosing(choosing === 'camera' ? null : 'camera') };

  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
        <PillButton icon={upload.icon} label={upload.label} tone="primary" onPress={upload.onPress} disabled={busy} />
        {camera && <PillButton icon="camera" label={camera.label} onPress={camera.onPress} disabled={busy} />}
        {usage && filter !== 'audio' && (
          <Text style={{ marginLeft: 'auto', fontSize: 12, color: full ? colors.danger : colors.textFaint }}>
            {usage.count} / {usage.max} used
          </Text>
        )}
      </View>

      {choosing === 'upload' && !busy && (
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <PillButton icon="images" label="Photos & videos" onPress={() => void pickVisual(['images', 'videos'])} />
          <PillButton icon="musical-notes" label="Audio" onPress={() => void pickAudio()} />
        </View>
      )}
      {choosing === 'camera' && !busy && (
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <PillButton icon="camera" label="Take photo" onPress={() => void fromCamera('image')} />
          <PillButton icon="videocam" label="Record video (15 s)" onPress={() => void fromCamera('video')} />
        </View>
      )}

      {progress && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Muted>
            Uploading{progress.total > 1 ? ` ${progress.current} of ${progress.total}` : ''}… keep this screen open.
          </Muted>
        </View>
      )}
      {note && !busy && <Muted style={{ color: colors.success }}>{note}</Muted>}
      <ErrorText message={busy ? null : error} />
    </View>
  );
}
