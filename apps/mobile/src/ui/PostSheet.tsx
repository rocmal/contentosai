import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  PLATFORM_LABEL,
  PLATFORM_MEDIA_SUPPORT,
  createSocialPost,
  getSocialConnections,
  type SocialConnection,
  type SocialPlatform,
} from '@/lib/api-social';
import { Button, Chip, ChipRow, ErrorText, Field, Input, Muted } from './kit';
import { colors, space } from './theme';

const PLATFORMS = Object.keys(PLATFORM_LABEL) as SocialPlatform[];
const TEXT_LIMIT: Record<SocialPlatform, number> = { linkedin: 3000, facebook: 5000, instagram: 2200, youtube: 5000 };
const DAY_MS = 24 * 60 * 60 * 1000;

function defaultTime(): Date {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  return d;
}

/**
 * Bottom sheet to post a Gallery image or video now, or schedule it, to one or more connected accounts (images go to
 * LinkedIn only). Same endpoint as the website's composer (POST /publishing/posts); connecting happens on the website.
 */
export function PostSheet({
  asset,
  onClose,
}: {
  /** The Gallery item to post; null when the clip has no Gallery id (then it has to be opened from the Gallery). */
  asset: { id: string; type: 'image' | 'video' } | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [connections, setConnections] = useState<Record<SocialPlatform, SocialConnection> | null>(null);
  const [selected, setSelected] = useState<SocialPlatform[]>([]);
  const [text, setText] = useState('');
  const [later, setLater] = useState(false);
  const [when, setWhen] = useState<Date>(defaultTime);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  /** A warning when the LinkedIn connection has run out or runs out within a week (worked out when it loads). */
  const [linkedInNote, setLinkedInNote] = useState<string | null>(null);

  const kind = asset?.type ?? 'none';
  const usable = connections
    ? PLATFORMS.filter((p) => connections[p]?.connected && !connections[p]?.expired && PLATFORM_MEDIA_SUPPORT[p].includes(kind))
    : [];

  useEffect(() => {
    getSocialConnections()
      .then((status) => {
        setConnections(status);
        const linkedIn = status.linkedin;
        if (linkedIn?.connected && linkedIn.expired) {
          setLinkedInNote('Your LinkedIn connection has run out. Reconnect it from Integrations on the Lumora website.');
        } else if (
          linkedIn?.connected &&
          linkedIn.expiresAt &&
          new Date(linkedIn.expiresAt).getTime() - Date.now() < 7 * DAY_MS
        ) {
          setLinkedInNote(
            `Your LinkedIn connection runs out on ${new Date(linkedIn.expiresAt).toLocaleDateString()}. Reconnect it from Integrations on the website.`,
          );
        }
        const first = PLATFORMS.find(
          (p) => status[p]?.connected && !status[p]?.expired && PLATFORM_MEDIA_SUPPORT[p].includes(asset?.type ?? 'none'),
        );
        if (first) setSelected([first]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not check your connected accounts.'));
  }, [asset?.type]);

  const limit = selected.length ? Math.min(...selected.map((p) => TEXT_LIMIT[p])) : TEXT_LIMIT.linkedin;
  const tooLong = text.trim().length > limit;

  function toggle(platform: SocialPlatform) {
    setSelected((previous) =>
      previous.includes(platform) ? previous.filter((p) => p !== platform) : [...previous, platform],
    );
  }

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
    if (!asset || selected.length === 0 || tooLong) return;
    if (later && when.getTime() < Date.now() + 60_000) {
      setError('Pick a time at least a minute from now, or post now.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createSocialPost({
        text: text.trim(),
        mediaAssetId: asset.id,
        platforms: selected,
        scheduledAt: later ? when.toISOString() : undefined,
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not post.');
    } finally {
      setBusy(false);
    }
  }

  const names = selected.map((p) => PLATFORM_LABEL[p]).join(' and ');

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{ padding: space.lg, gap: space.xl, paddingBottom: insets.bottom + space.xl }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>Post</Text>
          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={12}>
            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 16 }}>{done ? 'Done' : 'Cancel'}</Text>
          </Pressable>
        </View>

        {done ? (
          <Muted>
            {later
              ? `Scheduled for ${when.toLocaleString()} on ${names}. It is also on your Calendar.`
              : `Posting to ${names} now. You get a notification when it is live.`}
          </Muted>
        ) : !asset ? (
          <Muted>Open this video from your Gallery to post it.</Muted>
        ) : connections === null ? (
          <ErrorText message={error} />
        ) : usable.length === 0 ? (
          <>
            <Muted>
              {kind === 'image'
                ? 'Images can be posted to LinkedIn. Connect LinkedIn from Integrations on the Lumora website, then come back.'
                : 'No social account is connected yet. Connect LinkedIn, Facebook, Instagram or YouTube from Integrations on the Lumora website, then come back.'}
            </Muted>
            {linkedInNote && <Muted style={{ color: colors.danger }}>{linkedInNote}</Muted>}
          </>
        ) : (
          <>
            <Field label="Post to">
              <ChipRow>
                {usable.map((p) => (
                  <Chip key={p} label={PLATFORM_LABEL[p]} selected={selected.includes(p)} onPress={() => toggle(p)} />
                ))}
              </ChipRow>
              {kind === 'image' && <Muted style={{ fontSize: 12 }}>Images go to LinkedIn; Facebook, Instagram and YouTube take videos.</Muted>}
            </Field>
            {linkedInNote && <Muted style={{ color: colors.danger, fontSize: 13 }}>{linkedInNote}</Muted>}
            <Field label="What do you want to say?">
              <Input
                multiline
                value={text}
                onChangeText={setText}
                placeholder="Write your post. Put hashtags at the end, e.g. #TermInsurance"
                accessibilityLabel="Post text"
                style={{ minHeight: 120 }}
              />
              <Muted style={{ fontSize: 12, color: tooLong ? colors.danger : colors.textMuted, textAlign: 'right' }}>
                {text.trim().length} / {limit}
              </Muted>
            </Field>
            <Field label="When">
              <ChipRow>
                <Chip label="Post now" selected={!later} onPress={() => setLater(false)} />
                <Chip label="Schedule" selected={later} onPress={() => setLater(true)} />
              </ChipRow>
              {later &&
                (Platform.OS === 'ios' ? (
                  <View style={{ alignItems: 'flex-start', marginTop: space.sm }}>
                    <DateTimePicker value={when} mode="datetime" display="compact" minimumDate={new Date()} onChange={(_e, d) => d && setWhen(d)} />
                  </View>
                ) : (
                  <Button title={when.toLocaleString()} variant="secondary" onPress={pickOnAndroid} />
                ))}
            </Field>
            <ErrorText message={error} />
            <Button
              title={later ? 'Schedule' : 'Post now'}
              onPress={submit}
              loading={busy}
              disabled={selected.length === 0 || tooLong}
            />
            <Muted style={{ fontSize: 12 }}>
              Check the {kind === 'image' ? 'image' : 'video'} and text first. Insurance and other regulated wording needs your own review before it goes public.
            </Muted>
          </>
        )}
      </ScrollView>
    </Modal>
  );
}
