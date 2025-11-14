package com.bmss.backend.service;

import java.time.Instant;

public record EmailDeliveryResult(
        boolean sent,
        String recipient,
        String subject,
        Instant attemptedAt,
        String providerMessageId,
        String failureReason
) {

    public static EmailDeliveryResult success(String recipient, String subject, Instant attemptedAt, String messageId) {
        return new EmailDeliveryResult(true, recipient, subject, attemptedAt, messageId, null);
    }

    public static EmailDeliveryResult failure(String recipient, String subject, Instant attemptedAt, String reason) {
        return new EmailDeliveryResult(false, recipient, subject, attemptedAt, null, reason);
    }
}
