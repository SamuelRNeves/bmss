package com.bmss.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.bmss.backend.model.Comment;

public interface CommentRepository extends JpaRepository<Comment, Long> {
}
