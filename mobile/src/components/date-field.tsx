import { useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatDate, isoDate } from '@/lib/vehicle-care';
import { Button, Field } from '@/components/ui';
import { colors, fonts, radius, space } from '@/lib/theme';

/** Date field: native dialog on Android, inline calendar in a sheet on iOS. Value is YYYY-MM-DD or ''. */
export function DateField({ label, value, onChange, error, optional, minimumDate }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  optional?: boolean;
  minimumDate?: Date;
}) {
  const [open, setOpen] = useState(false);
  const current = value ? new Date(`${value}T12:00:00`) : new Date();

  function handle(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'set' && date) onChange(isoDate(date));
  }

  return (
    <Field label={label} error={error}>
      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value ? formatDate(value) : 'not set'}`}
          accessibilityHint="Opens a date picker"
          onPress={() => setOpen(true)}
          style={{
            flex: 1, minHeight: 48, justifyContent: 'center', paddingHorizontal: space.md,
            borderWidth: 1, borderColor: error ? colors.danger : colors.line, borderRadius: radius.md,
          }}
        >
          <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: value ? colors.charcoal : colors.muted }}>
            {value ? formatDate(value) : 'Choose a date'}
          </Text>
        </Pressable>
        {optional && value ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Clear ${label}`} onPress={() => onChange('')} style={{ padding: space.sm }}>
            <Text style={{ fontFamily: fonts.medium, color: colors.navy }}>Clear</Text>
          </Pressable>
        ) : null}
      </View>

      {open && Platform.OS === 'android' && (
        <DateTimePicker value={current} mode="date" onChange={handle} minimumDate={minimumDate} />
      )}
      {Platform.OS === 'ios' && (
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' }}>
            <SafeAreaView edges={['bottom']} style={{ backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.lg }}>
              <DateTimePicker value={current} mode="date" display="inline" onChange={handle} minimumDate={minimumDate} accentColor={colors.navy} />
              <Button title="Done" onPress={() => { if (!value) onChange(isoDate(current)); setOpen(false); }} />
            </SafeAreaView>
          </View>
        </Modal>
      )}
    </Field>
  );
}
