package com.bmss.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.bmss.backend.model.Item;

public interface ItemRepository extends JpaRepository<Item, Integer> {}
