package com.bmss.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.bmss.backend.model.Role;

public interface RoleRepository extends JpaRepository<Role, Integer> {}
