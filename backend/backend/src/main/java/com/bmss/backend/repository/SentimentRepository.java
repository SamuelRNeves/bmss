package com.bmss.backend.repository;

import com.bmss.backend.model.Sentiment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SentimentRepository extends JpaRepository<Sentiment, Integer> {
}
