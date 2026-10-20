import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { improveText, type DictationLanguage } from '@/lib/api-ai';
import { useDictation } from '@/lib/useDictation';
import { ErrorText, Field, Input, Muted, PillButton } from './kit';
import { colors, space } from './theme';

export interface AiWriter {
  /** Instructions for the writer (what a good prompt or script looks like for this studio). */
  systemPrompt: string;
  /** Used when the box is empty, so "Generate with AI" still produces something useful. */
  emptyIdea: string;
  /** 'hindi' | 'punjabi' | 'english' for scripts written in that language. */
  language?: string;
  /** Builds the request from what is typed (empty = generate), when the writer needs more than the bare text. */
  frame?: (idea: string) => string;
  /** Lower = stays closer to what was typed. */
  temperature?: number;
}

/** Adds spoken text after whatever is already typed. */
function appendSpoken(existing: string, spoken: string): string {
  return existing.trim() ? `${existing.trim()} ${spoken}` : spoken;
}

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/**
 * The prompt/script box every studio uses, matching the website: type, or tap Speak and talk
 * (Hindi, Punjabi or English), then Generate with AI (empty box) or Improve with AI (Undo puts it back).
 */
export function PromptBox({
  label,
  value,
  onChangeText,
  placeholder,
  ai,
  dictationLanguage = 'auto',
  maxLength = 4000,
  minHeight = 130,
  editable = true,
  footer,
}: {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  placeholder: string;
  ai?: AiWriter;
  dictationLanguage?: DictationLanguage;
  maxLength?: number;
  minHeight?: number;
  editable?: boolean;
  footer?: string;
}) {
  /** What was said while the box already had text, waiting for "Add to the end" or "Replace". */
  const [pendingSpoken, setPendingSpoken] = useState<string | null>(null);
  const dictation = useDictation((spoken) => {
    if (value.trim()) setPendingSpoken(spoken);
    else onChangeText(spoken);
  }, dictationLanguage);
  const [improving, setImproving] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [before, setBefore] = useState<string | null>(null);
  const empty = !value.trim();

  async function improve() {
    if (!ai) return;
    setImproving(true);
    setAiError(null);
    try {
      const idea = value.trim();
      const text = await improveText({
        prompt: ai.frame ? ai.frame(idea) : idea || ai.emptyIdea,
        systemPrompt: ai.systemPrompt,
        language: ai.language,
        temperature: ai.temperature,
      });
      if (!text) throw new Error('The AI returned nothing. Please try again.');
      setBefore(value);
      onChangeText(text.slice(0, maxLength));
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Could not reach the AI. Please try again.');
    } finally {
      setImproving(false);
    }
  }

  const busy = improving || dictation.phase !== 'idle';

  return (
    <Field label={label}>
      <Input
        multiline
        value={value}
        onChangeText={(next) => {
          setBefore(null);
          onChangeText(next);
        }}
        maxLength={maxLength}
        editable={editable && !busy}
        placeholder={placeholder}
        accessibilityLabel={label}
        style={{ minHeight }}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm }}>
        <PillButton
          icon={dictation.phase === 'recording' ? 'stop' : 'mic'}
          label={
            dictation.phase === 'recording'
              ? `Stop ${clock(dictation.seconds)}`
              : dictation.phase === 'processing'
                ? 'Writing…'
                : 'Speak'
          }
          tone={dictation.phase === 'recording' ? 'danger' : 'default'}
          loading={dictation.phase === 'processing'}
          disabled={!editable || improving}
          onPress={dictation.toggle}
          accessibilityLabel={dictation.phase === 'recording' ? 'Stop recording' : 'Speak instead of typing'}
        />
        {ai && (
          <PillButton
            icon="sparkles"
            label={improving ? 'Writing…' : empty ? 'Generate with AI' : 'Improve with AI'}
            tone="primary"
            loading={improving}
            disabled={!editable || dictation.phase !== 'idle'}
            onPress={improve}
          />
        )}
        {before !== null && !busy && (
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => {
              onChangeText(before);
              setBefore(null);
            }}
          >
            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>Undo</Text>
          </Pressable>
        )}
      </View>
      {pendingSpoken !== null && (
        <View style={{ gap: space.sm, padding: space.md, borderRadius: 14, backgroundColor: colors.surface }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>The box already has text. You said:</Text>
          <Text numberOfLines={3} style={{ fontSize: 14, fontStyle: 'italic', color: colors.textMuted }}>
            “{pendingSpoken}”
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            <PillButton
              icon="add"
              label="Add to the end"
              tone="primary"
              onPress={() => {
                setBefore(value);
                onChangeText(appendSpoken(value, pendingSpoken).slice(0, maxLength));
                setPendingSpoken(null);
              }}
            />
            <PillButton
              icon="swap-horizontal"
              label="Replace"
              onPress={() => {
                setBefore(value);
                onChangeText(pendingSpoken.slice(0, maxLength));
                setPendingSpoken(null);
              }}
            />
            <PillButton icon="close" label="Discard" onPress={() => setPendingSpoken(null)} />
          </View>
        </View>
      )}
      {dictation.phase === 'recording' && (
        <Muted>Listening… speak in Hindi, Punjabi or English. Tap Stop when you finish (up to {dictation.maxSeconds / 60} minute).</Muted>
      )}
      {footer ? <Muted style={{ fontSize: 12 }}>{footer}</Muted> : null}
      <ErrorText message={dictation.error ?? aiError} />
    </Field>
  );
}
