package com.bmss.backend.repository;

import com.bmss.backend.model.Item;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ItemRepository extends JpaRepository<Item, Integer> {

    // Métodos existentes...
    List<Item> findAllByOrderByAnalyzedAtDesc(Pageable pageable);
    List<Item> findAllBySourceNameContainingIgnoreCase(String source, Pageable pageable);
    List<Item> findBySourceNameNotContainingIgnoreCase(String source, Pageable pageable);
    List<Item> findBySourceNameContainingIgnoreCase(String sourceName, Pageable pageable);
    List<Item> findTop20BySourceNameOrderByPublishedAtDesc(String sourceName);
    boolean existsByUrl(String url);

    // 🔹 NOVOS MÉTODOS PARA TWEETS
    List<Item> findByIsTweetTrueOrderByPublishedAtDesc(Pageable pageable);
    List<Item> findTop20ByIsTweetTrueOrderByPublishedAtDesc();
    boolean existsByTweetId(String tweetId);
}