import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors, fonts, radius, space } from '@/lib/theme';

/** Scrollable page with the brand background and safe-area padding. */
export function Screen({
  children,
  edges = ['top'],
  scroll = true,
}: {
  children: React.ReactNode;
  edges?: Edge[];
  scroll?: boolean;
}) {
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.screenBody} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.screenBody, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function H1(props: TextProps) {
  return <Text accessibilityRole="header" {...props} style={[styles.h1, props.style]} />;
}
export function H2(props: TextProps) {
  return <Text accessibilityRole="header" {...props} style={[styles.h2, props.style]} />;
}
export function Body(props: TextProps) {
  return <Text {...props} style={[styles.body, props.style]} />;
}
export function Muted(props: TextProps) {
  return <Text {...props} style={[styles.muted, props.style]} />;
}
export function ErrorText({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <Text accessibilityRole="alert" style={styles.error}>
      {children}
    </Text>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'dangerOutline';
export function Button({
  title,
  variant = 'primary',
  loading,
  disabled,
  style,
  ...rest
}: PressableProps & { title: string; variant?: ButtonVariant; loading?: boolean; style?: StyleProp<ViewStyle> }) {
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      style={({ pressed }) => [
        styles.button,
        variantStyles[variant].box,
        pressed && { opacity: 0.85 },
        off && { opacity: 0.5 },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles[variant].text.color} />
      ) : (
        <Text style={[styles.buttonText, variantStyles[variant].text]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.muted} {...props} style={[styles.input, props.style]} />;
}

/** Label + control + error, with the label wired for screen readers. */
export function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.xs }}>
      <Text style={styles.label}>{label}</Text>
      {children}
      <ErrorText>{error}</ErrorText>
    </View>
  );
}

export function TextField({ label, error, ...input }: TextInputProps & { label: string; error?: string }) {
  return (
    <Field label={label} error={error}>
      <Input accessibilityLabel={label} {...input} style={[input.style, error ? { borderColor: colors.danger } : null]} />
    </Field>
  );
}

export function Card({ children, style, onPress, accessibilityLabel }: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { borderColor: colors.navy }, style]}
    >
      {children}
    </Pressable>
  );
}

/** Single-choice list, used where the web uses radio groups and selects. */
export function ChoiceList<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string; hint?: string }[];
  value: T | '';
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ gap: space.sm }}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[styles.choice, selected && styles.choiceSelected]}
          >
            <View style={[styles.radio, selected && styles.radioOn]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.body}>{o.label}</Text>
              {o.hint ? <Text style={styles.muted}>{o.hint}</Text> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Select-style field: shows the current choice, opens a searchable list. */
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Choose…',
  error,
}: {
  label: string;
  value: T | '';
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  placeholder?: string;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const current = options.find((o) => o.value === value);
  const shown = query ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : options;
  return (
    <Field label={label} error={error}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current?.label ?? 'not chosen'}`}
        accessibilityHint="Opens a list of options"
        onPress={() => setOpen(true)}
        style={[styles.input, { justifyContent: 'center' }, error ? { borderColor: colors.danger } : null]}
      >
        <Text style={[styles.body, !current && { color: colors.muted }]}>{current?.label ?? placeholder}</Text>
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
          <View style={{ padding: space.lg, gap: space.md, flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.h2}>{label}</Text>
              <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={{ padding: space.sm }}>
                <Text style={[styles.buttonText, { color: colors.navy }]}>Close</Text>
              </Pressable>
            </View>
            {options.length > 8 && (
              <Input placeholder="Search" value={query} onChangeText={setQuery} accessibilityLabel={`Search ${label}`} autoCorrect={false} />
            )}
            <FlatList
              data={shown}
              keyExtractor={(o) => o.value}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: item.value === value }}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                    setQuery('');
                  }}
                  style={[styles.choice, { marginBottom: space.sm }, item.value === value && styles.choiceSelected]}
                >
                  <Text style={styles.body}>{item.label}</Text>
                </Pressable>
              )}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </Field>
  );
}

export function Checkbox({ label, checked, onChange, children }: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start', minHeight: 44, paddingVertical: space.xs }}
    >
      <View style={[styles.checkbox, checked && styles.checkboxOn]}>
        {checked ? <Text style={{ color: colors.white, fontFamily: fonts.bold, fontSize: 13 }}>✓</Text> : null}
      </View>
      <View style={{ flex: 1 }}>{children ?? <Text style={styles.body}>{label}</Text>}</View>
    </Pressable>
  );
}

export function Pill({ text, tone = 'navy' }: { text: string; tone?: 'navy' | 'success' | 'warning' | 'danger' | 'muted' }) {
  const color = { navy: colors.navy, success: colors.success, warning: colors.warning, danger: colors.danger, muted: colors.muted }[tone];
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <Text style={[styles.pillText, { color }]}>{text}</Text>
    </View>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={{ paddingVertical: space.xl, alignItems: 'center', gap: space.sm }}>
      <ActivityIndicator color={colors.navy} />
      <Muted>{label}</Muted>
    </View>
  );
}

const variantStyles = {
  primary: StyleSheet.create({ box: { backgroundColor: colors.navy }, text: { color: colors.white } }),
  secondary: StyleSheet.create({ box: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.navy }, text: { color: colors.navy } }),
  danger: StyleSheet.create({ box: { backgroundColor: colors.danger }, text: { color: colors.white } }),
  dangerOutline: StyleSheet.create({ box: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.danger }, text: { color: colors.danger } }),
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  screenBody: { padding: space.lg, paddingBottom: space.xxl * 2, gap: space.lg },
  h1: { fontFamily: fonts.bold, fontSize: 26, color: colors.navy },
  h2: { fontFamily: fonts.semibold, fontSize: 18, color: colors.charcoal },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.charcoal },
  muted: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.muted },
  label: { fontFamily: fonts.medium, fontSize: 14, color: colors.charcoal },
  error: { fontFamily: fonts.regular, fontSize: 13, color: colors.danger },
  button: { minHeight: 48, borderRadius: radius.md, paddingHorizontal: space.lg, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: fonts.semibold, fontSize: 15 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.charcoal,
    backgroundColor: colors.white,
  },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  choice: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, minHeight: 48 },
  choiceSelected: { borderColor: colors.navy, backgroundColor: '#EEF2FA' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.muted },
  radioOn: { borderColor: colors.navy, borderWidth: 6 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: space.sm, paddingVertical: 2, alignSelf: 'flex-start' },
  pillText: { fontFamily: fonts.medium, fontSize: 12, textTransform: 'capitalize' },
});
