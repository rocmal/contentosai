import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Text, View } from 'react-native';
import { getGalleryUsage, uploadDeviceFile, type DeviceFile } from '@/lib/upload';
import { ErrorText, Muted, PillButton } from './kit';
import { colors, space } from './theme';

const MAX_PER_PICK = 10;

function toDeviceFile(asset: ImagePicker.ImagePickerAsset): DeviceFile {
  return {
    uri: asset.uri,
    kind: asset.type === 'video' ? 'video' : 'image',
    fileName: asset.fileName,
    mimeType: asset.mimeType,
    fileSize: asset.fileSize,
  };
}

/** Upload photos and videos from the phone (or the camera) into the Gallery. */
export function UploadBar({ onUploaded }: { onUploaded: () => void }) {
  const [usage, setUsage] = useState<{ count: number; max: number } | null>(null);
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

  const remaining = usage ? Math.max(0, usage.max - usage.count) : MAX_PER_PICK;
  const full = usage !== null && remaining === 0;

  async function uploadAll(files: DeviceFile[]) {
    setNote(null);
    setError(null);
    const problems: string[] = [];
    let added = 0;
    for (let i = 0; i < files.length; i += 1) {
      setProgress({ current: i + 1, total: files.length });
      try {
        // One at a time: phone uploads are slow, and the count shows real progress.
        await uploadDeviceFile(files[i]);
        added += 1;
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Upload failed.';
        problems.push(files.length > 1 ? `Item ${i + 1}: ${message}` : message);
        // The gallery is full: the rest would fail the same way.
        if (/limit/i.test(message) && !/25 MB/.test(message)) break;
      }
    }
    setProgress(null);
    if (added) setNote(`Added ${added} ${added === 1 ? 'item' : 'items'} to your gallery.`);
    if (problems.length) setError(problems.join('\n'));
    refreshUsage();
    if (added) onUploaded();
  }

  async function fromPhone() {
    if (full) {
      setError(`Your gallery is full (${usage?.max} images and videos). Delete something to make room.`);
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        selectionLimit: Math.min(MAX_PER_PICK, remaining),
        orderedSelection: true,
        quality: 0.85,
        exif: false,
        // iPhone photos come as HEIC; ask for JPEG so every app and website can open them.
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      if (!result.canceled) await uploadAll(result.assets.slice(0, remaining).map(toDeviceFile));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open your photos.');
    }
  }

  async function fromCamera(kind: 'image' | 'video') {
    if (full) {
      setError(`Your gallery is full (${usage?.max} images and videos). Delete something to make room.`);
      return;
    }
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
      if (!result.canceled) await uploadAll(result.assets.map(toDeviceFile));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open the camera.');
    }
  }

  function chooseCamera() {
    Alert.alert('Camera', 'Take a photo or record a short video for your gallery.', [
      { text: 'Take a photo', onPress: () => void fromCamera('image') },
      { text: 'Record a video (15 s)', onPress: () => void fromCamera('video') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  const busy = progress !== null;

  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
        <PillButton icon="cloud-upload" label="Upload from phone" tone="primary" onPress={fromPhone} disabled={busy} />
        {Platform.OS !== 'web' && <PillButton icon="camera" label="Camera" onPress={chooseCamera} disabled={busy} />}
        {usage && (
          <Text style={{ marginLeft: 'auto', fontSize: 12, color: full ? colors.danger : colors.textFaint }}>
            {usage.count} / {usage.max} used
          </Text>
        )}
      </View>
      {progress && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Muted>
            Uploading {progress.total > 1 ? `${progress.current} of ${progress.total}` : ''}… keep this screen open.
          </Muted>
        </View>
      )}
      {note && !busy && <Muted style={{ color: colors.success }}>{note}</Muted>}
      <ErrorText message={busy ? null : error} />
    </View>
  );
}
