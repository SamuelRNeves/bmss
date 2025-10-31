package com.bmss.backend.dto;

public class RegisterRequest {
    private String name;
    private String email;
    private String notificationPreference = "diario"; // diario, imediato, desativado

    // Construtor padrão
    public RegisterRequest() {}

    // Getters e Setters
    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getNotificationPreference() {
        return notificationPreference;
    }

    public void setNotificationPreference(String notificationPreference) {
        this.notificationPreference = notificationPreference;
    }
}