import { useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCaret from '@tiptap/extension-collaboration-caret'
import { useYjsProvider } from '../hooks/useYjsProvider'

const ROOM_ID = 'demo-room'
const USER_NAME = `User-${Math.floor(Math.random() * 1000)}`

export default function Editor() {
  const { ydoc, provider, connected } = useYjsProvider(ROOM_ID, USER_NAME)

  const extensions = useMemo(() => {
    if (!ydoc || !provider) return []

    return [
      StarterKit.configure({
        // Disable TipTap's built-in history — Yjs handles undo/redo
        history: false,
      }),
      Collaboration.configure({
        document: ydoc,
      }),
      CollaborationCaret.configure({
        provider,
        user: {
          name: USER_NAME,
          color: '#22d3ee',
        },
      }),
    ]
  }, [ydoc, provider])

  const editor = useEditor(
    {
      extensions,
      immediatelyRender: false,
    },
    [extensions]
  )

  if (!ydoc || !provider) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-gray-500">
        Connecting to room…
      </div>
    )
  }

  if (!editor) return null

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f]">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-cyan-400">Kaofela</h1>
          <span className="text-xs text-gray-500">Room: {ROOM_ID}</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">You are: {USER_NAME}</span>
          <div
            className={`w-2 h-2 rounded-full ${
              connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
            }`}
            title={connected ? 'Connected' : 'Disconnected'}
          />
        </div>
      </header>

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
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
          label="H1"
          title="Heading 1"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          label="H2"
          title="Heading 2"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
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
      className={`
        min-w-9 h-9 px-2 rounded-md text-sm font-medium transition-colors
        ${
          active
            ? 'bg-cyan-500 text-black'
            : 'text-gray-400 hover:text-white hover:bg-gray-800'
        }
      `}
    >
      {label}
    </button>
  )
}