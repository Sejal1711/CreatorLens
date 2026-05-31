'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { VideoMetadata } from '@/types'

interface ChatPanelProps {
  sessionId: string
  videoMetadata: VideoMetadata[]
}

const SUGGESTIONS = [
  'Why did one video get more engagement than the other?',
  'Compare the hooks in the first 5 seconds of each video.',
  "What's the engagement rate of each video?",
  'Who are the creators and what are their follower counts?',
  'Suggest improvements for the lower-performing video.',
]

export function ChatPanel({ sessionId, videoMetadata }: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputText, setInputText] = useState('')

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: { sessionId, videoMetadata },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionId]
  )

  const { messages, sendMessage, status } = useChat({
    id: sessionId,
    transport,
  })

  const isStreaming = status === 'streaming' || status === 'submitted'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    const text = inputText.trim()
    if (!text || isStreaming) return
    sendMessage({ text })
    setInputText('')
  }

  function pickSuggestion(q: string) {
    sendMessage({ text: q })
    inputRef.current?.focus()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25 }}
      className="flex flex-col h-full rounded-xl border border-[#3D2F61] bg-[#141020]/90 backdrop-blur-sm overflow-hidden shadow-xl shadow-purple-950/30"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#3D2F61] shrink-0 bg-[#0F0C1A]/80">
        <div className={`w-2 h-2 rounded-full transition-colors ${isStreaming ? 'bg-violet-400 animate-pulse' : 'bg-purple-700'}`} />
        <span className="text-sm font-semibold text-white">Video Analyst</span>
        {isStreaming && (
          <Badge variant="outline" className="ml-auto text-[10px] text-gray-300 border-[#3D2F61] bg-[#1A1430]">
            Thinking…
          </Badge>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-5">
          {messages.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <p className="text-xs text-gray-500 text-center pt-2">Videos are ready — ask anything</p>
              <div className="grid gap-2">
                {SUGGESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => pickSuggestion(q)}
                    className="text-left text-xs px-3 py-2.5 rounded-xl border border-[#3D2F61] bg-[#1A1430]/60 hover:bg-[#241B3D] hover:border-purple-700/60 text-gray-300 hover:text-white transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'user' ? (
                  <div className="max-w-[80%] rounded-2xl rounded-br-sm px-3.5 py-2.5 bg-purple-600 text-white text-sm shadow-lg shadow-purple-900/40">
                    <MessageContent parts={msg.parts} isUser />
                  </div>
                ) : (
                  <div className="w-full rounded-2xl rounded-bl-sm px-4 py-3 bg-gray-800/30 border border-gray-700/40">
                    <MessageContent parts={msg.parts} isUser={false} />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator — only before assistant starts responding */}
          {isStreaming && messages[messages.length - 1]?.role === 'user' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
              <div className="bg-gray-800/30 border border-gray-700/40 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-purple-500"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 p-3 border-t border-[#3D2F61] shrink-0 bg-[#0F0C1A]/80">
        <Input
          ref={inputRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask about your videos…"
          disabled={isStreaming}
          className="bg-[#0F0C1A] border-gray-700/50 text-white placeholder:text-gray-600 text-sm h-9 focus-visible:ring-0 focus-visible:border-purple-600/60"
        />
        <Button
          type="submit"
          disabled={isStreaming || !inputText.trim()}
          className="shrink-0 h-9 bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-lg shadow-purple-900/40 disabled:opacity-40"
        >
          Send
        </Button>
      </form>
    </motion.div>
  )
}

function MessageContent({ parts, isUser }: { parts: any[] | undefined; isUser: boolean }) {
  if (!parts || parts.length === 0) return null

  return (
    <div className="space-y-2">
      {parts.map((part: any, i: number) => {
        if (part.type === 'text') {
          return isUser ? (
            <p key={i} className="leading-relaxed text-sm">{part.text}</p>
          ) : (
            <MarkdownBlock key={i} text={part.text} />
          )
        }

        // Tool calls: show a subtle spinner while running, hide when done
        if (typeof part.type === 'string' && part.type.startsWith('tool-')) {
          const isDone = part.state === 'output-available' || part.state === 'output-error'
          if (isDone) return null
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 py-0.5"
            >
              <div className="flex gap-0.5">
                {[0, 1, 2].map((j) => (
                  <motion.span
                    key={j}
                    className="inline-block w-1 h-1 rounded-full bg-purple-500"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: j * 0.15 }}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500">Analyzing videos…</span>
            </motion.div>
          )
        }

        return null
      })}
    </div>
  )
}

function MarkdownBlock({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="text-base font-bold text-white mt-3 mb-2 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-bold text-white mt-3 mb-1.5 first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-100 mt-2 mb-1 first:mt-0">{children}</h3>,
        p: ({ children }) => <p className="text-sm text-gray-200 leading-relaxed mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
        em: ({ children }) => <em className="italic text-gray-300">{children}</em>,
        ul: ({ children }) => <ul className="space-y-1 mb-2 pl-1">{children}</ul>,
        ol: ({ children }) => <ol className="space-y-1 mb-2 pl-1 list-decimal list-inside">{children}</ol>,
        li: ({ children }) => (
          <li className="text-sm text-gray-300 leading-relaxed flex gap-2">
            <span className="text-gray-600 shrink-0 mt-0.5">•</span>
            <span>{children}</span>
          </li>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-3 rounded-xl border border-gray-700/60">
            <table className="w-full text-xs border-collapse">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-gray-800/70">{children}</thead>,
        tbody: ({ children }) => <tbody className="divide-y divide-gray-700/50">{children}</tbody>,
        tr: ({ children }) => <tr className="hover:bg-gray-800/30 transition-colors">{children}</tr>,
        th: ({ children }) => <th className="px-3 py-2 text-left font-semibold text-gray-200 whitespace-nowrap">{children}</th>,
        td: ({ children }) => <td className="px-3 py-2 text-gray-300">{children}</td>,
        code: ({ children, className }) =>
          Boolean(className) ? (
            <pre className="bg-gray-900 rounded-xl p-3 text-xs text-gray-300 overflow-x-auto my-2 border border-gray-700/50">
              <code>{children}</code>
            </pre>
          ) : (
            <code className="bg-gray-800/60 rounded px-1.5 py-0.5 text-xs text-violet-400 font-mono">{children}</code>
          ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-purple-600/50 pl-3 my-2 text-gray-400 italic">{children}</blockquote>
        ),
        hr: () => <hr className="border-gray-700/50 my-3" />,
      }}
    >
      {text}
    </ReactMarkdown>
  )
}
