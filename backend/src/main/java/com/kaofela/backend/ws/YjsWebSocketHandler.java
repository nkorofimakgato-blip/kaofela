package com.kaofela.backend.ws;

import com.kaofela.backend.service.RoomUpdateService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.BinaryWebSocketHandler;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class YjsWebSocketHandler extends BinaryWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(YjsWebSocketHandler.class);

    // y-websocket protocol:
    //   byte 0 = message type (0 = sync, 1 = awareness, 3 = query awareness, ...)
    //   byte 1 = sync subtype (0 = step1, 1 = step2, 2 = update)
    private static final int MSG_SYNC = 0;
    private static final int SYNC_STEP2 = 1;
    private static final int SYNC_UPDATE = 2;

    private final Map<String, Set<WebSocketSession>> rooms = new ConcurrentHashMap<>();
    private final RoomUpdateService roomUpdateService;

    public YjsWebSocketHandler(RoomUpdateService roomUpdateService) {
        this.roomUpdateService = roomUpdateService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String roomId = extractRoomId(session);
        if (roomId == null) {
            log.warn("Closing session with no room ID: {}", session.getId());
            session.close(CloseStatus.BAD_DATA);
            return;
        }

        rooms.computeIfAbsent(roomId, k -> ConcurrentHashMap.newKeySet()).add(session);

        // Replay stored updates to this new client BEFORE any peer traffic.
        // Yjs merges these into its local state — the client effectively
        // "catches up" to where the room was when the last person left.
        List<byte[]> history = roomUpdateService.loadUpdates(roomId);
        for (byte[] msg : history) {
            if (!session.isOpen()) break;
            try {
                synchronized (session) {
                    session.sendMessage(new BinaryMessage(msg));
                }
            } catch (IOException e) {
                log.warn("[room={}] Failed to replay to {}: {}",
                        roomId, session.getId(), e.getMessage());
                break;
            }
        }

        log.info("[room={}] Client connected: {} (total in room: {}), replayed {} updates",
                roomId, session.getId(), rooms.get(roomId).size(), history.size());
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) throws Exception {
        String roomId = extractRoomId(session);
        if (roomId == null) return;

        ByteBuffer payload = message.getPayload();
        byte[] bytes = new byte[payload.remaining()];
        payload.get(bytes);

        // Persist only sync messages carrying Yjs update bytes (step2 or update).
        // Awareness (cursor) messages and step1 (state-vector requests) are ephemeral
        // and must not be replayed to future clients.
        if (isPersistableUpdate(bytes)) {
            roomUpdateService.append(roomId, bytes);
        }

        log.debug("[room={}] Received {} bytes from {}",
                roomId, bytes.length, session.getId());

        broadcast(roomId, session, bytes);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        String roomId = extractRoomId(session);
        log.error("[room={}] Transport error on session {}", roomId, session.getId(), exception);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String roomId = extractRoomId(session);
        if (roomId == null) return;

        Set<WebSocketSession> peers = rooms.get(roomId);
        if (peers != null) {
            peers.remove(session);
            log.info("[room={}] Client disconnected: {} (remaining: {})",
                    roomId, session.getId(), peers.size());
            if (peers.isEmpty()) {
                rooms.remove(roomId);
                log.info("[room={}] Room removed (no clients)", roomId);
            }
        }
    }

    private boolean isPersistableUpdate(byte[] bytes) {
        if (bytes.length < 2) return false;
        int type = bytes[0] & 0xFF;
        int subtype = bytes[1] & 0xFF;
        return type == MSG_SYNC && (subtype == SYNC_STEP2 || subtype == SYNC_UPDATE);
    }

    private void broadcast(String roomId, WebSocketSession sender, byte[] bytes) {
        Set<WebSocketSession> peers = rooms.get(roomId);
        if (peers == null) return;

        BinaryMessage forward = new BinaryMessage(bytes);
        for (WebSocketSession peer : peers) {
            if (peer.getId().equals(sender.getId())) continue;
            if (!peer.isOpen()) continue;

            try {
                synchronized (peer) {
                    peer.sendMessage(forward);
                }
            } catch (IOException e) {
                log.warn("[room={}] Failed to send to {}: {}",
                        roomId, peer.getId(), e.getMessage());
            }
        }
    }

    private String extractRoomId(WebSocketSession session) {
        String path = session.getUri() != null ? session.getUri().getPath() : null;
        if (path == null) return null;

        int idx = path.lastIndexOf('/');
        if (idx < 0 || idx == path.length() - 1) return null;
        return path.substring(idx + 1);
    }
}