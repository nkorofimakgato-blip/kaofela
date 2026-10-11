package com.kaofela.backend;

import com.kaofela.backend.model.User;
import com.kaofela.backend.repository.UserRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/db-test")
public class DbTestController {

    private final UserRepository userRepository;

    public DbTestController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    public Map<String, Object> test() {
        long count = userRepository.count();
        return Map.of(
            "status", "ok",
            "message", "PostgreSQL is connected",
            "userCount", count
        );
    }
}