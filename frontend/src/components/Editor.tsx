import { useMemo, useState } from 'react'
import { useEditor, EditorContent, Extension } from '@tiptap/react'
import { Plugin } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import { useYjsProvider } from '../hooks/useYjsProvider'
import { useContributionTracker } from '../hooks/useContributionTracker'
import { useChat } from '../hooks/useChat'
import { useIdentity } from '../hooks/useIdentity'
import { useAiChat } from '../hooks/useAiChat'
import { useRoomId } from '../hooks/useRoomId'
import ContributionPanel from './ContributionPanel'
import ChatPanel from './ChatPanel'
import AiPanel from './AiPanel'
import type * as Y from 'yjs'
import type { WebsocketProvider } from 'y-websocket'

export default function Editor() {
  const { userId, name: userName, color: userColor } = useIdentity()
  const roomId = useRoomId()

  const { ydoc, provider, connected } = useYjsProvider(
    roomId,
    userName,
    userColor
  )

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f]">
      <header className="border-b border-gray-800 bg-gray-950 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-cyan-400">Kaofela</h1>
          <span className="text-xs text-gray-500">Room: {roomId}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`
              navigator.clipboard.writeText(url)
            }}
            className="text-[11px] text-gray-400 hover:text-cyan-400 border border-gray-800 hover:border-cyan-400/40 rounded px-2 py-1 transition-colors"
            title="Copy room link"
          >
            Copy link
          </button>
          <span className="text-xs text-gray-400">You are: {userName}</span>
          <div
            className={`w-2 h-2 rounded-full ${
              connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
            }`}
          />
        </div>
      </header>

      {!ydoc || !provider ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Connecting to room…
        </div>
      ) : (
        <EditorInner
          ydoc={ydoc}
          provider={provider}
          userId={userId}
          userName={userName}
          userColor={userColor}
        />
      )}
    </div>
  )
}

interface EditorInnerProps {
  ydoc: Y.Doc
  provider: WebsocketProvider
  userId: string
  userName: string
  userColor: string
}

type SidebarTab = 'contribution' | 'chat' | 'ai'

function EditorInner({
  ydoc,
  provider,
  userId,
  userName,
  userColor,
}: EditorInnerProps) {
  const myClientId = userId

  const { contributions, recordTyping } = useContributionTracker(
    ydoc,
    userName,
    userColor
  )
  const { messages, sendMessage } = useChat(
    ydoc,
    myClientId,
    userName,
    userColor
  )

  const [tab, setTab] = useState<SidebarTab>('contribution')

  const contributionExtension = useMemo(() => {
    return Extension.create({
      name: 'contributionTracker',
      addProseMirrorPlugins() {
        return [
          new Plugin({
            appendTransaction(transactions) {
              for (const tr of transactions) {
                if (!tr.docChanged) continue
                if ((tr as any).getMeta('y-sync$') !== undefined) continue

                let inserted = 0
                tr.steps.forEach((step: any) => {
                  const slice = step.slice
                  if (!slice) return
                  slice.content.forEach((node: any) => {
                    if (node.isText && node.text) {
                      inserted += node.text.length
                    }
                  })
                })

                if (inserted > 0) {
                  Promise.resolve().then(() => recordTyping(inserted))
                }
              }
              return null
            },
          }),
        ]
      },
    })
  }, [recordTyping])

  const extensions = useMemo(
    () => [
      StarterKit.configure({ history: false }),
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({
        provider,
        user: { name: userName, color: userColor },
      }),
      contributionExtension,
    ],
    [ydoc, provider, userName, userColor, contributionExtension]
  )

  const editor = useEditor({ extensions })

  // AI chat — reads the current document text on every send
  const ai = useAiChat(() => editor?.getText() ?? '')

  if (!editor) return null

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Editor column */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="border-b border-gray-800 bg-gray-950 px-4 py-2 flex items-center gap-1 flex-wrap">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            label="B"
            title="Bold"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            label="I"
            title="Italic"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            label="S"
            title="Strikethrough"
          />
          <div className="w-px h-6 bg-gray-800 mx-2" />
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            active={editor.isActive('heading', { level: 1 })}
            label="H1"
            title="Heading 1"
          />
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            active={editor.isActive('heading', { level: 2 })}
            label="H2"
            title="Heading 2"
          />
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            active={editor.isActive('heading', { level: 3 })}
            label="H3"
            title="Heading 3"
          />
          <div className="w-px h-6 bg-gray-800 mx-2" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            label="• List"
            title="Bullet list"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            label="1. List"
            title="Numbered list"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            label='"'
            title="Quote"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive('codeBlock')}
            label="</>"
            title="Code block"
          />
        </div>

        {/* Editor content */}
        <div className="flex-1 overflow-y-auto py-8 px-4">
          <div className="max-w-4xl mx-auto bg-white text-gray-900 rounded-xl shadow-2xl">
            <EditorContent editor={editor} className="tiptap" />
          </div>
        </div>
      </div>

      {/* Right sidebar */}
      <aside className="w-80 border-l border-gray-800 bg-gray-950 flex flex-col flex-shrink-0">
        {/* Tabs */}
        <div className="flex border-b border-gray-800 flex-shrink-0">
          <TabButton
            active={tab === 'contribution'}
            onClick={() => setTab('contribution')}
            label="Contrib"
          />
          <TabButton
            active={tab === 'chat'}
            onClick={() => setTab('chat')}
            label={`Chat${messages.length > 0 ? ` (${messages.length})` : ''}`}
          />
          <TabButton
            active={tab === 'ai'}
            onClick={() => setTab('ai')}
            label="AI"
          />
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {tab === 'contribution' && (
            <div className="h-full overflow-y-auto">
              <ContributionPanel contributions={contributions} />
            </div>
          )}
          {tab === 'chat' && (
            <ChatPanel
              messages={messages}
              onSend={sendMessage}
              myClientId={myClientId}
            />
          )}
          {tab === 'ai' && (
            <AiPanel
              messages={ai.messages}
              streaming={ai.streaming}
              error={ai.error}
              onSend={ai.send}
              onClear={ai.clear}
            />
          )}
        </div>
      </aside>
    </div>
  )
}

interface TabButtonProps {
  active: boolean
  onClick: () => void
  label: string
}

function TabButton({ active, onClick, label }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
        active
          ? 'text-cyan-400 border-b-2 border-cyan-400'
          : 'text-gray-500 hover:text-gray-300 border-b-2 border-transparent'
      }`}
    >
      {label}
    </button>
  )
}

interface ToolbarButtonProps {
  onClick: () => void
  active: boolean
  label: string
  title: string
}

function ToolbarButton({ onClick, active, label, title }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`min-w-9 h-9 px-2 rounded-md text-sm font-medium transition-colors ${
        active
          ? 'bg-cyan-500 text-black'
          : 'text-gray-400 hover:text-white hover:bg-gray-800'
      }`}
    >
      {label}
    </button>
  )
}