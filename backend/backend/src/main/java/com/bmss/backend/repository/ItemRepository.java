package com.bmss.backend.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.bmss.backend.model.Item;

public interface ItemRepository extends JpaRepository<Item, Integer> {
    List<Item> findByCategory_NameIgnoreCase(String categoryName);
    Page<Item> findAll(Pageable pageable);
}
