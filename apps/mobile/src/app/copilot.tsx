import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { copilotReply, type CopilotTurn } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, radius, space } from '@/ui/theme';

interface Message {
  id: string;
  from: 'user' | 'assistant';
  text: string;
  isError?: boolean;
  /** Offered instead of an AI reply: opens a studio with the request already filled in. */
  action?: { label: string; href: Href };
}

// Images, videos and voiceovers cost far more than a text reply, so the chat hands them to their studio, which shows
// the credit cost before anything is spent. Same wording rules as the web Co-pilot (src/components/FloatingAIAssistant.tsx).
const ASK = String.raw`^\s*(?:please\s+)?(?:(?:can|could) you\s+)?(?:create|generate|make|produce|draw|design|record|give me|show me)\b[^.?!\n]{0,40}?\b`;
const STUDIO_INTENTS: { test: RegExp; studio: 'image' | 'video' | 'voice'; label: string; reply: string }[] = [
  {
    test: new RegExp(`${ASK}(?:video|reel|short|animation)\\b`, 'i'),
    studio: 'video',
    label: 'Open Video Studio',
    reply: 'Videos are made in Video Studio, where you pick the length and format and see the credit cost before you start.',
  },
  {
    test: new RegExp(`${ASK}(?:voiceover|voice-over|voice over|narration|audio|speech)\\b`, 'i'),
    studio: 'voice',
    label: 'Open Voiceover',
    reply: 'Voiceovers are made in the Voiceover studio, where you choose the language and voice and hear it before saving.',
  },
  {
    test: new RegExp(`(?:^\\s*/image\\b)|(?:${ASK}(?:image|picture|photo|poster|logo|illustration|banner|graphic|thumbnail|artwork)\\b)`, 'i'),
    studio: 'image',
    label: 'Open Image Studio',
    reply: 'Images are made in Image Studio, where you pick the size for each platform and see the credit cost first.',
  },
];

const STUDIO_PATHS = { image: '/create/image', video: '/create/video', voice: '/create/voice' } as const;

let nextId = 0;
const newId = () => String(++nextId);

export default function Copilot() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const list = useRef<FlatList<Message>>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: newId(),
      from: 'assistant',
      text: `Hi${user?.firstName ? ` ${user.firstName}` : ''}! I can write captions and scripts, suggest hooks, plan posts and explain how Lumora works. Each reply uses 1 credit. AI text is a draft: check facts and any insurance wording before you post.`,
    },
  ]);

  function add(m: Omit<Message, 'id'>) {
    setMessages((prev) => [...prev, { ...m, id: newId() }]);
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    // Only real conversation goes back to the server: not the greeting, errors or studio hand-offs.
    const history: CopilotTurn[] = messages
      .slice(1)
      .filter((m) => !m.isError && !m.action)
      .slice(-8)
      .map((m) => ({ role: m.from, text: m.text }));
    setInput('');
    add({ from: 'user', text });

    const intent = STUDIO_INTENTS.find((s) => s.test.test(text));
    if (intent) {
      const prompt = text.replace(/^\s*\/image\s*/i, '');
      add({ from: 'assistant', text: intent.reply, action: { label: intent.label, href: { pathname: STUDIO_PATHS[intent.studio], params: { prompt } } } });
      return;
    }

    setBusy(true);
    try {
      const { reply } = await copilotReply({ message: text, history });
      add({ from: 'assistant', text: reply || 'I could not come up with a reply. Please try again.' });
    } catch (e) {
      add({ from: 'assistant', isError: true, text: `${e instanceof Error ? e.message : 'Something went wrong.'} No credit was charged.` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <FlatList
        ref={list}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: space.lg, gap: space.md }}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={busy ? <ActivityIndicator color={colors.primary} style={{ alignSelf: 'flex-start', marginLeft: space.md }} /> : null}
        renderItem={({ item }) => {
          const mine = item.from === 'user';
          return (
            <View
              style={{
                alignSelf: mine ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                gap: space.sm,
                padding: space.md,
                borderRadius: radius.card,
                backgroundColor: mine ? colors.primary : item.isError ? colors.dangerTint : colors.surface,
              }}
            >
              <Text selectable style={{ fontSize: 15, lineHeight: 21, color: mine ? '#fff' : item.isError ? colors.danger : colors.text }}>
                {item.text}
              </Text>
              {item.action && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(item.action!.href)}
                  style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: space.sm, paddingHorizontal: space.md, borderRadius: radius.pill, backgroundColor: colors.primary }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>{item.action.label}</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </Pressable>
              )}
            </View>
          );
        }}
      />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: space.sm,
          paddingHorizontal: space.lg,
          paddingTop: space.sm,
          paddingBottom: insets.bottom + space.sm,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask for a caption, hook or plan..."
          placeholderTextColor={colors.textFaint}
          multiline
          maxLength={2000}
          accessibilityLabel="Message"
          style={{ flex: 1, maxHeight: 120, minHeight: 44, borderRadius: radius.control, backgroundColor: colors.surface, paddingHorizontal: space.md, paddingTop: 12, paddingBottom: 12, fontSize: 16, color: colors.text }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send"
          onPress={send}
          disabled={!input.trim() || busy}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: !input.trim() || busy ? 0.5 : 1 }}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
