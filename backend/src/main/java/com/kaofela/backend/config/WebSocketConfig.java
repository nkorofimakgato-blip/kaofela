package com.kaofela.backend.config;

import com.kaofela.backend.ws.YjsWebSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final YjsWebSocketHandler yjsHandler;

    public WebSocketConfig(YjsWebSocketHandler yjsHandler) {
        this.yjsHandler = yjsHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry
            .addHandler(yjsHandler, "/ws/{roomId}")
            .setAllowedOrigins("*");
    }
}