package com.bmss.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.bmss.backend.model.Source;

public interface SourceRepository extends JpaRepository<Source, Integer> {}
