package com.bmss.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.bmss.backend.model.User;

public interface UserRepository extends JpaRepository<User, Integer> {
    User findByEmail(String email);

    User getById(Integer id);
}
