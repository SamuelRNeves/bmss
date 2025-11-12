package com.bmss.backend.controller;

import com.bmss.backend.dto.NotificationDTO;
import com.bmss.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notificacoes")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class NotificationController {

    private static final Logger log = LoggerFactory.getLogger(NotificationController.class);

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> listarNotificacoes(
            @RequestParam(defaultValue = "8") int limit
    ) {
        try {
            List<NotificationDTO> notificacoes = notificationService.listarNotificacoes(limit);

            Map<String, Object> meta = new LinkedHashMap<>();
            meta.put("total", notificacoes.size());
            meta.put("generatedAt", LocalDateTime.now().toString());
            long unread = notificacoes.stream()
                    .filter(n -> n != null && n.getCategory() != null)
                    .filter(n -> !"summary".equalsIgnoreCase(n.getCategory()))
                    .count();
            meta.put("unread", unread);

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("data", notificacoes);
            body.put("meta", meta);
            body.put("message", notificacoes.isEmpty()
                    ? "⚠️ Nenhuma análise disponível no momento."
                    : "✅ Notificações atualizadas com base nas análises de sentimento.");

            return ResponseEntity.ok(body);
        } catch (Exception e) {
            log.error("Erro ao listar notificações", e);

            Map<String, Object> meta = Map.of(
                    "total", 0,
                    "generatedAt", LocalDateTime.now().toString(),
                    "unread", 0
            );

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("data", Collections.emptyList());
            body.put("meta", meta);
            body.put("message", "❌ Falha ao gerar notificações: " + e.getMessage());

            return ResponseEntity.internalServerError().body(body);
        }
    }
}
