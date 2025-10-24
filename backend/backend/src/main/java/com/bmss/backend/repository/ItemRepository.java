package com.bmss.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.bmss.backend.model.Item;

import java.util.List;

@Repository
public interface ItemRepository extends JpaRepository<Item, Integer> {

    // 🔹 Retorna os 50 itens mais recentemente analisados
    List<Item> findTop50ByOrderByAnalyzedAtDesc();
}
