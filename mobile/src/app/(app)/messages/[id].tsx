import { useEffect, useRef, useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/lib/auth';
import {
  useAttachmentUrl,
  useConversation,
  useMarkRead,
  useMessages,
  useRealtimeMessages,
  useSendMessage,
  type Message,
} from '@/lib/inbox';
import type { PickedPhoto } from '@/lib/queries';
import { Button, ErrorText, Input, Loading, Muted } from '@/components/ui';
import { colors, fonts, radius, space } from '@/lib/theme';

const time = (d: string) => new Date(d).toLocaleString('en-IE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function Attachment({ path }: { path: string }) {
  const url = useAttachmentUrl(path);
  if (!url.data) return <Muted>Loading photo…</Muted>;
  return <Image source={{ uri: url.data }} style={{ width: 200, height: 200, borderRadius: radius.md }} accessibilityLabel="Photo attachment" />;
}

function Bubble({ m, mine }: { m: Message; mine: boolean }) {
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginBottom: space.sm }}>
      <View
        style={{
          maxWidth: '82%',
          backgroundColor: mine ? colors.navy : colors.surface,
          borderColor: colors.line,
          borderWidth: mine ? 0 : 1,
          borderRadius: radius.lg,
          padding: space.md,
          gap: space.sm,
        }}
      >
        {m.attachment_path ? <Attachment path={m.attachment_path} /> : null}
        {m.body ? (
          <Text style={{ fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: mine ? colors.white : colors.charcoal }}>{m.body}</Text>
        ) : null}
      </View>
      <Muted style={{ fontSize: 11, marginTop: 2 }}>
        {time(m.created_at)}
        {mine ? (m.read_at ? ' · Read' : ' · Sent') : ''}
      </Muted>
    </View>
  );
}

export default function Thread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const me = session?.user.id;
  const conversation = useConversation(id);
  const messages = useMessages(id);
  const send = useSendMessage(id);
  const markRead = useMarkRead(id);
  const [body, setBody] = useState('');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const list = useRef<FlatList<Message>>(null);
  useRealtimeMessages(id);

  // Read receipts: mark incoming messages read whenever new ones arrive while the thread is open.
  const incomingUnread = messages.data?.some((m) => m.sender_id !== me && !m.read_at) ?? false;
  const { mutate: markReadNow } = markRead;
  useEffect(() => {
    if (incomingUnread) markReadNow();
  }, [incomingUnread, markReadNow]);

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled) return;
    const a = result.assets[0];
    setPhoto({ uri: a.uri, mimeType: a.mimeType ?? 'image/jpeg', fileName: a.fileName ?? `photo-${Date.now()}.jpg` });
  }

  function submit() {
    const text = body.trim();
    if (!text && !photo) return;
    send.mutate({ body: text, photo }, { onSuccess: () => { setBody(''); setPhoto(null); } });
  }

  const sendError = send.isError
    ? (send.error as Error).message === 'TOO_LARGE'
      ? 'Photos must be under 10 MB.'
      : 'Your message didn’t send. Try again.'
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }} edges={['bottom']}>
      <Stack.Screen options={{ title: conversation.data?.garages?.name ?? 'Messages' }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        {conversation.data?.service_requests?.title ? (
          <Muted style={{ paddingHorizontal: space.lg, paddingTop: space.sm }}>Re: {conversation.data.service_requests.title}</Muted>
        ) : null}
        {messages.isPending ? (
          <Loading />
        ) : (
          <FlatList
            ref={list}
            data={messages.data ?? []}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: space.lg }}
            onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={<Muted>Say hello — ask the garage a question about their quote.</Muted>}
            renderItem={({ item }) => <Bubble m={item} mine={item.sender_id === me} />}
          />
        )}
        <View style={{ borderTopWidth: 1, borderColor: colors.line, padding: space.md, gap: space.sm }}>
          {photo && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Image source={{ uri: photo.uri }} style={{ width: 56, height: 56, borderRadius: radius.sm }} />
              <Pressable accessibilityRole="button" onPress={() => setPhoto(null)} style={{ padding: space.sm }}>
                <Text style={{ fontFamily: fonts.medium, color: colors.danger }}>Remove photo</Text>
              </Pressable>
            </View>
          )}
          <ErrorText>{sendError}</ErrorText>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.sm }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Attach a photo"
              onPress={pickPhoto}
              style={{ minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 22, color: colors.navy }}>＋</Text>
            </Pressable>
            <Input
              accessibilityLabel="Message"
              placeholder="Write a message"
              value={body}
              onChangeText={setBody}
              multiline
              maxLength={4000}
              style={{ flex: 1, maxHeight: 120 }}
            />
            <Button title="Send" onPress={submit} loading={send.isPending} disabled={!body.trim() && !photo} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
