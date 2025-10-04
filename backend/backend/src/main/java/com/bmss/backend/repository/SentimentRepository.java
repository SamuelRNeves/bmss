package com.bmss.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.bmss.backend.model.Sentiment;

public interface SentimentRepository extends JpaRepository<Sentiment, Integer> {}
