package com.bmss.backend.repository;

import com.bmss.backend.model.Item;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ItemRepository extends JpaRepository<Item, Integer> {

    // 🔹 Busca as notícias mais recentes com limite e ordenação definidos via Pageable
    List<Item> findAllByOrderByAnalyzedAtDesc(Pageable pageable);

    // 🔹 Evita duplicatas ao salvar
    boolean existsByUrl(String url);
}
