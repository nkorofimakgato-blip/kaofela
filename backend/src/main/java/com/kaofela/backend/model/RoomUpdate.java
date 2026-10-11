package com.kaofela.backend.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(
    name = "room_update",
    indexes = @Index(name = "idx_room_update_room", columnList = "room_id")
)
public class RoomUpdate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "room_id", nullable = false, length = 64)
    private String roomId;

    @Column(name = "payload", nullable = false)
    private byte[] payload;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public RoomUpdate() {}

    public RoomUpdate(String roomId, byte[] payload) {
        this.roomId = roomId;
        this.payload = payload;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getRoomId() { return roomId; }
    public byte[] getPayload() { return payload; }
    public Instant getCreatedAt() { return createdAt; }
}