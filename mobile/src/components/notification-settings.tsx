import { Switch, Text, View } from 'react-native';
import { useNotificationPreferences, useUpdatePreferences, type NotificationPreferences } from '@/lib/inbox';
import { Card, ErrorText, H2, Muted } from '@/components/ui';
import { colors, fonts, space } from '@/lib/theme';

type Key = 'in_app_enabled' | 'email_enabled' | 'sms_enabled';
const ROWS: { key: Key; label: string; hint: string }[] = [
  { key: 'in_app_enabled', label: 'In the app', hint: 'New quotes, messages and job updates' },
  { key: 'email_enabled', label: 'Email', hint: 'The same updates by email' },
  { key: 'sms_enabled', label: 'Text message', hint: 'Only the most important updates' },
];
// Defaults when no preferences row exists yet (matches the web).
const DEFAULTS: Record<Key, boolean> = { in_app_enabled: true, email_enabled: true, sms_enabled: false };

export function NotificationSettings() {
  const prefs = useNotificationPreferences();
  const update = useUpdatePreferences();
  const value = (k: Key) => (prefs.data ? (prefs.data as NotificationPreferences)[k] : DEFAULTS[k]);

  return (
    <Card>
      <H2>Notifications</H2>
      {ROWS.map((r) => (
        <View key={r.key} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: colors.charcoal }}>{r.label}</Text>
            <Muted>{r.hint}</Muted>
          </View>
          <Switch
            accessibilityLabel={`${r.label} notifications`}
            value={value(r.key)}
            disabled={prefs.isPending || update.isPending}
            onValueChange={(v) => update.mutate({ [r.key]: v })}
            trackColor={{ true: colors.navy, false: colors.line }}
          />
        </View>
      ))}
      <ErrorText>{update.isError ? 'Could not save your choice. Try again.' : null}</ErrorText>
    </Card>
  );
}
