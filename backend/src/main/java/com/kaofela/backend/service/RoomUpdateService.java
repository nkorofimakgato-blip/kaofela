package com.kaofela.backend.service;

import com.kaofela.backend.model.RoomUpdate;
import com.kaofela.backend.repository.RoomUpdateRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RoomUpdateService {

    private static final Logger log = LoggerFactory.getLogger(RoomUpdateService.class);

    private final RoomUpdateRepository repo;

    public RoomUpdateService(RoomUpdateRepository repo) {
        this.repo = repo;
    }

    /** Returns every stored update for a room, in insertion order. */
    public List<byte[]> loadUpdates(String roomId) {
        List<byte[]> updates = repo.findByRoomIdOrderByIdAsc(roomId)
                .stream()
                .map(RoomUpdate::getPayload)
                .toList();
        log.info("[room={}] Loaded {} stored updates", roomId, updates.size());
        return updates;
    }

    /** Appends one update blob. Swallows errors so a DB hiccup never kills a live session. */
    public void append(String roomId, byte[] payload) {
        try {
            repo.save(new RoomUpdate(roomId, payload));
        } catch (Exception e) {
            log.error("[room={}] Failed to persist update ({} bytes)",
                    roomId, payload.length, e);
        }
    }
}