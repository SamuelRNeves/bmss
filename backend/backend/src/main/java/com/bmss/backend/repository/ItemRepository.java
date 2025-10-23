package com.bmss.backend.repository;

import com.bmss.backend.model.Item;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ItemRepository extends JpaRepository<Item, Integer> {
    List<Item> findAllByOrderByPublishedAtDesc(Pageable pageable);
    List<Item> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
