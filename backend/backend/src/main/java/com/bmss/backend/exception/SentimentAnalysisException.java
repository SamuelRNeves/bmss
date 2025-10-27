package com.bmss.backend.exception;

/**
 * Exceção personalizada para tratar falhas na comunicação com o microserviço Flask.
 */
public class SentimentAnalysisException extends RuntimeException {

    public SentimentAnalysisException(String message) {
        super(message);
    }

    public SentimentAnalysisException(String message, Throwable cause) {
        super(message, cause);
    }
}
