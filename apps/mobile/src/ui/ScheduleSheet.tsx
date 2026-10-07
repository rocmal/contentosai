import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PLATFORM_LABEL, getSocialConnections, scheduleGalleryVideo, type SocialPlatform } from '@/lib/api-social';
import { useAuth } from '@/lib/auth';
import { Button, Chip, ChipRow, ErrorText, Field, Input, Muted } from './kit';
import { colors, space } from './theme';

const PLATFORMS = Object.keys(PLATFORM_LABEL) as SocialPlatform[];

function defaultTime(): Date {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  return d;
}

/** Bottom sheet to schedule a Gallery video to a connected social account. */
export function ScheduleSheet({ videoUrl, onClose }: { videoUrl: string; onClose: () => void }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [connected, setConnected] = useState<SocialPlatform[] | null>(null);
  const [platform, setPlatform] = useState<SocialPlatform | null>(null);
  const [caption, setCaption] = useState('');
  const [when, setWhen] = useState<Date>(defaultTime);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    getSocialConnections()
      .then((s) => {
        const ok = PLATFORMS.filter((p) => s[p]?.connected);
        setConnected(ok);
        setPlatform(ok[0] ?? null);
      })
      .catch((e) => {
        setConnected([]);
        setError(e instanceof Error ? e.message : 'Could not check your connected accounts.');
      });
  }, []);

  function pickOnAndroid() {
    DateTimePickerAndroid.open({
      value: when,
      mode: 'date',
      minimumDate: new Date(),
      onChange: (_e, date) => {
        if (!date) return;
        DateTimePickerAndroid.open({
          value: date,
          mode: 'time',
          onChange: (_e2, time) => {
            if (!time) return;
            const next = new Date(date);
            next.setHours(time.getHours(), time.getMinutes(), 0, 0);
            setWhen(next);
          },
        });
      },
    });
  }

  async function submit() {
    if (!user || !platform) return;
    if (when.getTime() < Date.now() + 60_000) {
      setError('Pick a time in the future.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await scheduleGalleryVideo({ user, videoUrl, caption: caption.trim(), platform, scheduledAt: when });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not schedule the post.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{ padding: space.lg, gap: space.xl, paddingBottom: insets.bottom + space.xl }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>Schedule post</Text>
          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={12}>
            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 16 }}>{done ? 'Done' : 'Cancel'}</Text>
          </Pressable>
        </View>

        {done ? (
          <Muted>Scheduled for {when.toLocaleString()} on {platform ? PLATFORM_LABEL[platform] : ''}. It is also on your Calendar.</Muted>
        ) : connected === null ? null : connected.length === 0 ? (
          <>
            <Muted>No social account is connected yet. Connect Facebook, Instagram, LinkedIn or YouTube from Integrations on the Lumora website, then come back.</Muted>
            <ErrorText message={error} />
          </>
        ) : (
          <>
            <Field label="Post to">
              <ChipRow>
                {connected.map((p) => (
                  <Chip key={p} label={PLATFORM_LABEL[p]} selected={platform === p} onPress={() => setPlatform(p)} />
                ))}
              </ChipRow>
            </Field>
            <Field label="Caption">
              <Input multiline value={caption} onChangeText={setCaption} placeholder="Write a caption…" accessibilityLabel="Caption" style={{ minHeight: 100 }} />
            </Field>
            <Field label="When">
              {Platform.OS === 'ios' ? (
                <View style={{ alignItems: 'flex-start' }}>
                  <DateTimePicker value={when} mode="datetime" display="compact" minimumDate={new Date()} onChange={(_e, d) => d && setWhen(d)} />
                </View>
              ) : (
                <Button title={when.toLocaleString()} variant="secondary" onPress={pickOnAndroid} />
              )}
            </Field>
            <ErrorText message={error} />
            <Button title="Schedule" onPress={submit} loading={busy} disabled={!platform} />
            <Muted style={{ fontSize: 12 }}>Check the video and caption first. Insurance and other regulated wording needs your own review before it goes public.</Muted>
          </>
        )}
      </ScrollView>
    </Modal>
  );
}
