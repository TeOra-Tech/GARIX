import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGarage } from '@/lib/garage-context';
import { useUnreadNotificationCount } from '@/lib/inbox';
import { H1, H2 } from '@/components/ui';
import { colors, fonts, radius, space } from '@/lib/theme';

/** Garage name (with a switcher when the owner runs several) and the notification bell. */
export function GarageHeader() {
  const { garage, garages, selectGarage } = useGarage();
  const unread = useUnreadNotificationCount().data ?? 0;
  const [picking, setPicking] = useState(false);

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 2, color: colors.goldText }}>
          {garage?.plan === 'pro' ? 'GARIX PRO' : 'YOUR GARAGE'}
        </Text>
        <Pressable
          accessibilityRole={garages.length > 1 ? 'button' : 'header'}
          accessibilityHint={garages.length > 1 ? 'Switch garage' : undefined}
          disabled={garages.length < 2}
          onPress={() => setPicking(true)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <H1 style={{ flexShrink: 1 }}>{garage?.name ?? 'Garage'}</H1>
          {garages.length > 1 && <Ionicons name="chevron-down" size={20} color={colors.navy} />}
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        onPress={() => router.push('/garage/notifications')}
        style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name="notifications-outline" size={26} color={colors.navy} />
        {unread > 0 && (
          <View style={{ position: 'absolute', top: 6, right: 6, backgroundColor: colors.danger, borderRadius: 999, minWidth: 18, paddingHorizontal: 4, alignItems: 'center' }}>
            <Text style={{ color: colors.white, fontFamily: fonts.semibold, fontSize: 11 }}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        )}
      </Pressable>

      <Modal visible={picking} transparent animationType="slide" onRequestClose={() => setPicking(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <SafeAreaView edges={['bottom']} style={{ backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.lg, gap: space.sm }}>
            <H2>Switch garage</H2>
            {garages.map((g) => (
              <Pressable
                key={g.id}
                accessibilityRole="button"
                accessibilityState={{ selected: g.id === garage?.id }}
                onPress={() => { selectGarage(g.id); setPicking(false); }}
                style={{ padding: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: g.id === garage?.id ? colors.navy : colors.line }}
              >
                <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: colors.charcoal }}>{g.name}</Text>
              </Pressable>
            ))}
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}
