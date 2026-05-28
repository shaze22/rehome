'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageCircle, Send, Loader2 } from 'lucide-react'

interface Message {
  id: string
  content: string
  createdAt: string
  senderId: string
  sender: { name: string | null; avatar: string | null }
}

interface Props {
  listingId: string
  currentUserId: string | null
  sellerId: string
}

export function ListingChat({ listingId, currentUserId, sellerId }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    fetch(`/api/messages?listingId=${listingId}`)
      .then(r => r.json())
      .then(d => { setMessages(d.messages ?? []); setInitialLoading(false) })

    const supabase = createClient()
    const channel = supabase
      .channel(`chat:${listingId}`)
      .on('broadcast', { event: 'new_message' }, ({ payload }) => {
        setMessages(prev => [...prev, payload])
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [open, listingId])

  useEffect(() => {
    if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [open, messages.length])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || !currentUserId) return
    setLoading(true)
    await fetch('/api/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId, content }),
    })
    setContent('')
    setLoading(false)
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: 'var(--bg-card)' }}
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <MessageCircle className="w-4 h-4" style={{ color: 'var(--blue)' }} />
          Tanya Penjual
        </div>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ backgroundColor: 'var(--bg-elevated)' }}>
          {/* Messages */}
          <div className="h-48 overflow-y-auto p-3 space-y-2 scrollbar-thin">
            {initialLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-center text-xs py-4" style={{ color: 'var(--text-muted)' }}>
                Belum ada mesej. Tanya penjual sekarang!
              </p>
            ) : (
              messages.map(msg => {
                const isMe = msg.senderId === currentUserId
                const isSeller = msg.senderId === sellerId
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-xl text-xs`}
                      style={{
                        backgroundColor: isMe ? 'var(--teal)' : 'var(--bg-surface)',
                        color: isMe ? 'white' : 'var(--text-primary)',
                      }}>
                      {!isMe && (
                        <p className="text-xs font-semibold mb-0.5" style={{ color: isSeller ? 'var(--orange)' : 'var(--text-secondary)' }}>
                          {msg.sender.name ?? 'Pengguna'}{isSeller ? ' (Penjual)' : ''}
                        </p>
                      )}
                      <p>{msg.content}</p>
                      <p className="text-xs mt-0.5 opacity-60">{new Date(msg.createdAt).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {currentUserId ? (
            <form onSubmit={handleSend} className="flex gap-2 p-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <input
                value={content} onChange={e => setContent(e.target.value)}
                placeholder="Taip mesej..."
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
              <button type="submit" disabled={loading || !content.trim()}
                className="px-3 py-2 rounded-lg disabled:opacity-50"
                style={{ backgroundColor: 'var(--teal)', color: 'white' }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          ) : (
            <p className="text-center text-xs p-3" style={{ color: 'var(--text-muted)' }}>
              Log masuk untuk hantar mesej
            </p>
          )}
        </div>
      )}
    </div>
  )
}
