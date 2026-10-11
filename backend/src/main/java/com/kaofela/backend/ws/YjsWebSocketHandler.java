package com.kaofela.backend.ws;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.BinaryWebSocketHandler;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class YjsWebSocketHandler extends BinaryWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(YjsWebSocketHandler.class);

    private final Map<String, Set<WebSocketSession>> rooms = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String roomId = extractRoomId(session);
        if (roomId == null) {
            log.warn("Closing session with no room ID: {}", session.getId());
            session.close(CloseStatus.BAD_DATA);
            return;
        }

        rooms.computeIfAbsent(roomId, k -> ConcurrentHashMap.newKeySet()).add(session);
        log.info("[room={}] Client connected: {} (total in room: {})",
                roomId, session.getId(), rooms.get(roomId).size());
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) throws Exception {
        String roomId = extractRoomId(session);
        if (roomId == null) return;

        ByteBuffer payload = message.getPayload();
        byte[] bytes = new byte[payload.remaining()];
        payload.get(bytes);

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