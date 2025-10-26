package com.bmss.backend.exception;

public class SentimentAnalysisException extends RuntimeException {
    public SentimentAnalysisException(String message) {
        super(message);
    }

    public SentimentAnalysisException(String message, Throwable cause) {
        super(message, cause);
    }
}
