'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  attachmentUrl,
  useConversation,
  useMarkRead,
  useMessages,
  useRealtimeMessages,
  useSendMessage,
  useUserId,
  type Message,
} from '@/lib/messages/queries';
import { inputCls } from '@/components/auth/field';
import { cn } from '@/lib/utils';

function Attachment({ message }: { message: Message }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!message.attachment_path) return;
    attachmentUrl(message.attachment_path).then(setUrl).catch(() => setFailed(true));
  }, [message.attachment_path]);

  if (failed) return <p className="text-xs text-signal-soft">Attachment unavailable</p>;
  if (!url) return <p className="text-xs text-paper/40">Loading attachment…</p>;
  if (message.attachment_type === 'image') {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Attachment" className="mt-1 max-h-56 rounded-lg object-cover" />
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-2 text-sm underline">
      &#128206; Document
    </a>
  );
}

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const userId = useUserId();
  const conversation = useConversation(id);
  const messages = useMessages(id);
  const send = useSendMessage(id);
  const markRead = useMarkRead(id);
  useRealtimeMessages(id);

  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const markReadRef = useRef(markRead.mutate);
  markReadRef.current = markRead.mutate;

  const me = userId.data ?? null;
  const isCustomer = conversation.data?.customer_id === me;
  const counterpart = isCustomer
    ? conversation.data?.garages?.name
    : conversation.data?.customer?.full_name || 'Customer';

  // mark incoming messages read whenever the thread is open and new ones land
  useEffect(() => {
    if (!me || !messages.data) return;
    if (messages.data.some((m) => m.sender_id !== me && !m.read_at)) {
      markReadRef.current(me);
    }
  }, [me, messages.data]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.data?.length]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() && !file) return;
    send.mutate(
      { body: body.trim(), file },
      { onSuccess: () => { setBody(''); setFile(null); } },
    );
  }

  return (
    <main className="mx-auto flex h-[calc(100vh-4.25rem)] max-w-3xl flex-col px-4 py-6">
      <header className="border-b border-ink-line pb-4">
        <Link href="/dashboard/messages" className="text-sm text-paper/60 hover:text-volt-bright">
          &larr; Messages
        </Link>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-display text-2xl font-bold">
            {isCustomer && conversation.data?.garages ? (
              <Link href={`/garages/${conversation.data.garages.slug}`} className="hover:text-volt-bright">
                {counterpart}
              </Link>
            ) : (
              counterpart
            )}
          </h1>
          {conversation.data?.service_requests?.title && (
            <p className="text-sm text-paper/50">Re: {conversation.data.service_requests.title}</p>
          )}
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto py-6">
        {messages.isPending && <p className="text-paper/60">Loading…</p>}
        {messages.data?.length === 0 && (
          <p className="text-center text-sm text-paper/40">No messages yet — say hello.</p>
        )}
        {messages.data?.map((m) => {
          const own = m.sender_id === me;
          return (
            <div key={m.id} className={cn('flex', own ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-4 py-2.5',
                  own ? 'rounded-br-sm bg-volt text-white' : 'rounded-bl-sm border border-ink-line bg-ink-soft',
                )}
              >
                {m.body && <p className="whitespace-pre-wrap text-sm">{m.body}</p>}
                {m.attachment_path && <Attachment message={m} />}
                <p className={cn('mt-1 text-right text-[11px]', own ? 'text-white/70' : 'text-paper/40')}>
                  {new Date(m.created_at).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })}
                  {own && (
                    <span className={cn('ml-1', m.read_at ? 'text-white' : 'text-white/50')} title={m.read_at ? 'Read' : 'Sent'}>
                      {m.read_at ? '✓✓' : '✓'}
                    </span>
                  )}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} className="border-t border-ink-line pt-4">
        {file && (
          <p className="mb-2 flex items-center gap-2 text-sm text-paper/60">
            &#128206; {file.name}
            <button type="button" className="text-paper/40 hover:text-signal" aria-label="Remove attachment"
              onClick={() => setFile(null)}>
              &#10005;
            </button>
          </p>
        )}
        {send.isError && (
          <p role="alert" className="mb-2 text-sm text-signal">
            {send.error instanceof Error && /under \d+ MB/.test(send.error.message)
              ? send.error.message
              : 'Could not send — try again.'}
          </p>
        )}
        <div className="flex items-end gap-2">
          <label className="btn-ghost cursor-pointer !px-3 !py-3" aria-label="Attach a file">
            &#128206;
            <input
              type="file"
              accept="image/*,application/pdf,.doc,.docx"
              className="sr-only"
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); e.target.value = ''; }}
            />
          </label>
          <textarea
            aria-label="Message"
            rows={1}
            className={cn(inputCls, 'max-h-32 min-h-[3rem] flex-1 resize-none')}
            placeholder="Write a message…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit(e);
              }
            }}
          />
          <button type="submit" className="btn-primary !px-5" disabled={send.isPending || (!body.trim() && !file)}>
            {send.isPending ? '…' : 'Send'}
          </button>
        </div>
      </form>
    </main>
  );
}
