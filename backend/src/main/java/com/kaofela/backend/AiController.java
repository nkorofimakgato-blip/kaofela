package com.kaofela.backend;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private static final Logger log = LoggerFactory.getLogger(AiController.class);

    @Value("${groq.api-key}")
    private String apiKey;

    @Value("${groq.model}")
    private String model;

    @Value("${groq.url}")
    private String groqUrl;

    public record Message(String role, String content) {}

    public record AiRequest(String system, List<Message> messages) {}

    @PostMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<StreamingResponseBody> chat(@RequestBody AiRequest req) {
        if (apiKey == null || apiKey.isBlank()) {
            log.error("Groq API key is missing. Set GROQ_API_KEY env var.");
            return ResponseEntity.status(500)
                .contentType(MediaType.APPLICATION_JSON)
                .body(out -> out.write(
                    "{\"error\":\"Server misconfigured: missing Groq API key\"}".getBytes()
                ));
        }

        // Build the messages list with the system prompt first
        List<Map<String, String>> groqMessages = new java.util.ArrayList<>();
        groqMessages.add(Map.of(
            "role", "system",
            "content", req.system() == null ? "You are a helpful assistant." : req.system()
        ));

        List<Message> trimmed = req.messages();
        if (trimmed.size() > 20) trimmed = trimmed.subList(trimmed.size() - 20, trimmed.size());
        for (Message m : trimmed) {
            groqMessages.add(Map.of("role", m.role(), "content", m.content()));
        }

        Map<String, Object> body = Map.of(
            "model", model,
            "stream", true,
            "temperature", 0.7,
            "max_tokens", 500,
            "messages", groqMessages
        );

        String jsonBody = toJson(body);

        StreamingResponseBody stream = out -> {
            try {
                HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .build();

                HttpRequest groqReq = HttpRequest.newBuilder()
                    .uri(URI.create(groqUrl))
                    .timeout(Duration.ofSeconds(60))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

                HttpResponse<InputStream> groqRes = client.send(
                    groqReq,
                    HttpResponse.BodyHandlers.ofInputStream()
                );

                if (groqRes.statusCode() != 200) {
                    String errText = new String(groqRes.body().readAllBytes());
                    log.error("Groq error {}: {}", groqRes.statusCode(), errText);
                    out.write(("data: {\"error\":\"" + escapeJson(errText) + "\"}\n\n").getBytes());
                    out.write("data: [DONE]\n\n".getBytes());
                    out.flush();
                    return;
                }

                try (InputStream in = groqRes.body()) {
                    byte[] buf = new byte[4096];
                    int n;
                    while ((n = in.read(buf)) != -1) {
                        out.write(buf, 0, n);
                        out.flush();
                    }
                }
            } catch (Exception e) {
                log.error("AI stream failed", e);
                try {
                    out.write(("data: {\"error\":\"" + escapeJson(e.getMessage()) + "\"}\n\n").getBytes());
                    out.write("data: [DONE]\n\n".getBytes());
                    out.flush();
                } catch (Exception ignored) {}
            }
        };

        return ResponseEntity.ok()
            .contentType(MediaType.TEXT_EVENT_STREAM)
            .body(stream);
    }

    /** Minimal JSON serializer — avoids pulling in Jackson here. */
    @SuppressWarnings("unchecked")
    private String toJson(Object value) {
        if (value == null) return "null";
        if (value instanceof String s) return "\"" + escapeJson(s) + "\"";
        if (value instanceof Number || value instanceof Boolean) return value.toString();
        if (value instanceof Map<?, ?> map) {
            StringBuilder sb = new StringBuilder("{");
            boolean first = true;
            for (Map.Entry<?, ?> e : ((Map<?, ?>) value).entrySet()) {
                if (!first) sb.append(",");
                first = false;
                sb.append(toJson(e.getKey())).append(":").append(toJson(e.getValue()));
            }
            return sb.append("}").toString();
        }
        if (value instanceof Iterable<?> it) {
            StringBuilder sb = new StringBuilder("[");
            boolean first = true;
            for (Object o : it) {
                if (!first) sb.append(",");
                first = false;
                sb.append(toJson(o));
            }
            return sb.append("]").toString();
        }
        return "null";
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}