import { useMemo, useState } from 'react'
import { useEditor, EditorContent, Extension } from '@tiptap/react'
import { Plugin } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import { useYjsProvider } from '../hooks/useYjsProvider'
import { useContributionTracker } from '../hooks/useContributionTracker'
import ContributionPanel from './ContributionPanel'
import type * as Y from 'yjs'
import type { WebsocketProvider } from 'y-websocket'

const ROOM_ID = 'demo-room'

function randomColor(): string {
  const palette = [
    '#22d3ee',
    '#a78bfa',
    '#f472b6',
    '#34d399',
    '#fbbf24',
    '#fb7185',
    '#60a5fa',
  ]
  return palette[Math.floor(Math.random() * palette.length)]
}

export default function Editor() {
  const [userName] = useState(
    () => `User-${Math.floor(Math.random() * 1000)}`
  )
  const [userColor] = useState(() => randomColor())

  const { ydoc, provider, connected } = useYjsProvider(
    ROOM_ID,
    userName,
    userColor
  )

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f]">
      <header className="border-b border-gray-800 bg-gray-950 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-cyan-400">Kaofela</h1>
          <span className="text-xs text-gray-500">Room: {ROOM_ID}</span>
        </div>
        <div className="flex items-center gap-3">
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
          userName={userName}
          userColor={userColor}
        />
      )}
    </div>
  )
}

// ----- Inner editor -----

interface EditorInnerProps {
  ydoc: Y.Doc
  provider: WebsocketProvider
  userName: string
  userColor: string
}

function EditorInner({
  ydoc,
  provider,
  userName,
  userColor,
}: EditorInnerProps) {
  const { contributions, recordTyping } = useContributionTracker(
    ydoc,
    userName,
    userColor
  )

  // A ProseMirror plugin that counts characters inserted on LOCAL edits only.
  const contributionExtension = useMemo(() => {
    return Extension.create({
      name: 'contributionTracker',
      addProseMirrorPlugins() {
        return [
          new Plugin({
            appendTransaction(transactions) {
              for (const tr of transactions) {
                if (!tr.docChanged) continue
                // Skip Yjs-originated (remote) updates — only count local edits
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
                  // defer to avoid "setState during render"
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

      {/* Right sidebar — contributions */}
      <aside className="w-72 border-l border-gray-800 bg-gray-950 overflow-y-auto flex-shrink-0">
        <ContributionPanel contributions={contributions} />
      </aside>
    </div>
  )
}

// ----- Toolbar button -----

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