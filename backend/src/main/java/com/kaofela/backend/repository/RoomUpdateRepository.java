package com.kaofela.backend.repository;

import com.kaofela.backend.model.RoomUpdate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoomUpdateRepository extends JpaRepository<RoomUpdate, Long> {

    List<RoomUpdate> findByRoomIdOrderByIdAsc(String roomId);

    long countByRoomId(String roomId);
}