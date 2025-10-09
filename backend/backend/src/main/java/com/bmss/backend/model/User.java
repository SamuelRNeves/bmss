package com.bmss.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    private String name;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @ManyToOne
    @JoinColumn(name = "role_id") // FK para roles.id
    private Role role;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

	public String getEmail() {
		// TODO Auto-generated method stub
		return null;
	}

	public String getPasswordHash() {
		// TODO Auto-generated method stub
		return null;
	}

	public Role getRole() {
		// TODO Auto-generated method stub
		return role;
	}
}

