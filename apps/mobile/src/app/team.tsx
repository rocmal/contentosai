import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { addTeamMemberByEmail, listRoles, listTeamMembers, removeTeamMember, type Role, type TeamMember } from '@/lib/api-account';
import { useAuth } from '@/lib/auth';
import { Button, Card, Chip, ChipRow, ErrorText, Field, Input, Muted, Screen } from '@/ui/kit';
import { colors, space } from '@/ui/theme';

export default function Team() {
  const { user } = useAuth();
  const canManage = !!user?.permissions?.includes('organizations.manage-members');
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleId, setRoleId] = useState<string | undefined>();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setMembers(await listTeamMembers(user));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your team.');
      setMembers([]);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      listTeamMembers(user)
        .then(setMembers)
        .catch((e: unknown) => {
          setError(e instanceof Error ? e.message : 'Could not load your team.');
          setMembers([]);
        });
    }
    if (canManage) {
      listRoles()
        .then((r) => {
          setRoles(r);
          setRoleId((r.find((x) => x.slug === 'member') ?? r[0])?.id);
        })
        .catch(() => undefined);
    }
  }, [user, canManage]);

  async function invite() {
    if (!user || !roleId) return;
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await addTeamMemberByEmail(user, email.trim(), roleId);
      setEmail('');
      setNote('Added to your team.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add that person.');
    } finally {
      setBusy(false);
    }
  }

  function confirmRemove(m: TeamMember) {
    Alert.alert('Remove from team?', `${m.firstName} ${m.lastName} will lose access to your workspace.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          if (!user) return;
          try {
            await removeTeamMember(user, m.userId);
            await load();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not remove that person.');
          }
        },
      },
    ]);
  }

  return (
    <Screen>
      <View style={{ gap: space.lg, paddingTop: space.md }}>
        {canManage && (
          <Card style={{ gap: space.md }}>
            <Field label="Add a teammate">
              <Input
                placeholder="Their Lumora email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                accessibilityLabel="Teammate email"
              />
            </Field>
            {roles.length > 0 && (
              <ChipRow>
                {roles.map((r) => (
                  <Chip key={r.id} label={r.name} selected={roleId === r.id} onPress={() => setRoleId(r.id)} />
                ))}
              </ChipRow>
            )}
            <Muted>They need a Lumora account first. Your plan sets how many seats you have.</Muted>
            <Button title="Add to team" onPress={invite} loading={busy} disabled={!email.trim() || !roleId} />
            {note && <Muted>{note}</Muted>}
          </Card>
        )}
        <ErrorText message={error} />

        {members === null ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          members.map((m) => (
            <Card key={m.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                  {`${m.firstName} ${m.lastName}`.trim() || m.email}
                </Text>
                <Muted>
                  {m.email} · {m.roleName}
                </Muted>
              </View>
              {canManage && m.userId !== user?.id && (
                <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${m.email}`} onPress={() => confirmRemove(m)} hitSlop={8}>
                  <Text style={{ color: colors.danger, fontWeight: '600' }}>Remove</Text>
                </Pressable>
              )}
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}
