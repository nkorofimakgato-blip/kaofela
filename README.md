\# Kaofela



> Real-time collaborative text editor with a per-author contribution leaderboard.



Kaofela is a browser-based collaborative writing tool built from scratch on Yjs CRDTs. Multiple users edit the same document in real time, see each other's cursors, and watch a live leaderboard of who's contributing the most — measured in characters and active typing time.



\*\*\[Live demo](#)\*\* ← \*placeholder — swap in your Vercel URL after Phase 8D\*



!\[Kaofela editor](docs/screenshot-editor.png)



\---



\## Features



\- \*\*Real-time collaboration\*\* — multiple users edit the same document with sub-100ms sync

\- \*\*Live cursors\*\* — each user gets a colored cursor with their name; no flicker, no lag

\- \*\*Contribution leaderboard\*\* — every keystroke is attributed to its author, ranked live by characters typed and active time

\- \*\*Room isolation\*\* — the URL \*is\* the room; `?room=alpha` and `?room=beta` are fully separate worlds

\- \*\*Persistent documents\*\* — a backend restart doesn't lose your work; every Yjs update is journaled to Postgres/H2 and replayed on connect

\- \*\*Persistent identity\*\* — same name and color across refreshes, stored client-side

\- \*\*Rich text\*\* — bold, italics, headings, lists, blockquotes, code blocks

\- \*\*Team chat sidebar\*\* — synced through the same Yjs document

\- \*\*AI writing assistant\*\* — a Groq-backed chat panel that reads the current document



\---



\## Architecture



```

┌─────────────────┐          ┌──────────────────┐          ┌─────────────────┐

│  Browser Tab A  │          │  Browser Tab B   │          │  Browser Tab C  │

│  React + TipTap │          │  React + TipTap  │          │  React + TipTap │

│  Yjs (client)   │          │  Yjs (client)    │          │  Yjs (client)   │

└────────┬────────┘          └────────┬─────────┘          └────────┬────────┘

&#x20;        │                            │                             │

&#x20;        │  binary Yjs updates over WebSocket (?room=…)             │

&#x20;        └────────────────────────────┼─────────────────────────────┘

&#x20;                                     ▼

&#x20;                      ┌──────────────────────────────┐

&#x20;                      │   Spring Boot (port 8080)    │

&#x20;                      │   YjsWebSocketHandler        │

&#x20;                      │   • broadcast to room peers  │

&#x20;                      │   • append update → DB       │

&#x20;                      │   • replay history on join   │

&#x20;                      └──────────────┬───────────────┘

&#x20;                                     ▼

&#x20;                      ┌──────────────────────────────┐

&#x20;                      │  H2 (local) / Postgres (prod)│

&#x20;                      │  room\_update(id, room, blob) │

&#x20;                      └──────────────────────────────┘

```



\*\*The interesting bit:\*\* the backend is a \*pure relay with a journal\*. It doesn't parse Yjs's internal CRDT structure — it just stores each binary update blob in insertion order and replays them to anyone who joins. Yjs on the client merges everything correctly regardless of arrival order, so the server never needs to understand what's inside the payloads. Awareness (cursor) messages are filtered out before persistence so we don't waste DB rows on ephemeral data.



\---



\## Tech Stack



| Layer | Choice | Why |

|---|---|---|

| Editor | TipTap 2 (ProseMirror) | Mature, extensible, first-class Yjs support |

| CRDT | Yjs | The de-facto standard for real-time collaboration |

| Frontend | Vite + React + TypeScript | Fast dev loop, typed hooks |

| Styling | Tailwind CSS | Rapid UI iteration |

| Backend | Spring Boot 4 | WebSocket + JPA in one runtime |

| Transport | Raw WebSocket (binary) | The y-websocket protocol |

| Persistence | H2 (dev) / Postgres (prod) | Zero-setup local, production-ready remote |

| AI | Groq (llama-3.3-70b) | Fast, free tier |



\---



\## Running Locally



\### Prerequisites



\- \*\*Node.js 20+\*\*

\- \*\*Java 21+\*\*

\- \*\*Maven\*\* (or use the bundled `./mvnw`)



\### 1. Backend



```powershell

cd backend

./mvnw spring-boot:run

```



The server starts on `http://localhost:8080`. Data is written to `backend/data/kaofela.mv.db` (H2 file mode) — safe to delete to reset all rooms.



\### 2. Frontend



In a second terminal:



```powershell

cd frontend

npm install

npm run dev

```



Open `http://localhost:5173`.



\### 3. Try it



Open the same URL in two windows — or use an incognito window for a distinct identity — and start typing. You'll see:



\- Text sync live across both windows

\- A colored cursor with the other user's name

\- The \*\*Contrib\*\* tab in the right sidebar showing a live leaderboard

\- The \*\*Chat\*\* tab syncing messages



Use `?room=<name>` to create or join a specific room:



```

http://localhost:5173/?room=my-project

```



\---



\## How It Works



\### 1. Document sync



Each client holds a Yjs `Y.Doc`. TipTap is bound to it via `@tiptap/extension-collaboration`. When a user types, Yjs produces a compact binary update describing the change. `y-websocket` sends it to the backend, which broadcasts it to every other client in the same room. Yjs merges the update — order doesn't matter, duplicates don't matter, conflicts resolve deterministically.



\### 2. Persistence



The backend inspects the first two bytes of every binary message to distinguish Yjs \*\*sync\*\* updates from \*\*awareness\*\* (cursor) pings. Sync updates get appended to a `room\_update` table as opaque blobs. When a new client connects to a room, the server replays every stored blob in order before forwarding any live traffic. The client catches up instantly.



This design keeps the backend completely ignorant of CRDT internals — no Yjs-Java port, no protocol reimplementation. The DB is a write-only append log; correctness lives entirely on the clients.



\### 3. Contribution tracking



A custom ProseMirror plugin hooks into every transaction. For each step that inserts text, it counts characters and calls `recordTyping()`. That writes to a `Y.Map` keyed by the user's persistent `userId`, so the leaderboard is itself part of the collaborative document — every client sees the same totals in real time. Remote transactions are skipped using Yjs's `y-sync$` meta flag so you never get credit for someone else's typing.



Active time is measured as the sum of gaps between consecutive keystrokes under 30 seconds — so idling doesn't inflate your score.



\### 4. Identity



On first visit, the client generates a random name, color, and UUID and stores them in `localStorage`. Every subsequent visit reuses them. Two tabs in the same browser share an identity (correct); an incognito window gets its own (also correct).



\---



\## Roadmap



\- \[ ] PDF / Markdown export

\- \[ ] Comments and threads

\- \[ ] Version history / time travel

\- \[ ] Room permissions (view-only links)

\- \[ ] Mobile-optimized layout

\- \[ ] ML Kit ingredient recognition \*(for the sibling "Intelligent Recipes" project)\*



\---



\## License



MIT — see \[LICENSE](LICENSE).

