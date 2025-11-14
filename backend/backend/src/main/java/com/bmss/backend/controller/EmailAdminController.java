package com.bmss.backend.controller;

import com.bmss.backend.service.EmailDeliveryResult;
import com.bmss.backend.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/admin/email")
@RequiredArgsConstructor
public class EmailAdminController {

    private final EmailService emailService;

    @GetMapping("/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> consultarUltimoEnvio() {
        Optional<EmailDeliveryResult> lastDelivery = emailService.getLastDeliveryResult();

        Map<String, Object> response = new HashMap<>();
        response.put("enabled", emailService.isEmailEnabled());
        emailService.getDisabledReasonMessage().ifPresent(reason -> response.put("disabledReason", reason));

        if (lastDelivery.isEmpty()) {
            response.put("sent", false);
            response.put("message", "Nenhum envio foi processado ainda.");
            return ResponseEntity.ok(response);
        }

        EmailDeliveryResult result = lastDelivery.get();
        response.put("sent", result.sent());
        response.put("recipient", result.recipient());
        response.put("subject", result.subject());
        response.put("attemptedAt", result.attemptedAt());
        response.put("providerMessageId", result.providerMessageId());
        response.put("failureReason", result.failureReason());

        return ResponseEntity.ok(response);
    }
}
