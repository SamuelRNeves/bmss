package com.bmss.backend.controller;

import com.bmss.backend.model.Comment;
import com.bmss.backend.repository.CommentRepository;
import com.bmss.backend.repository.ItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/comments")
public class CommentController {

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private ItemRepository itemRepository;

    @GetMapping("/item/{itemId}")
    public List<Comment> getCommentsByItem(@PathVariable Integer itemId) {
        return commentRepository.findByItemId(itemId);
    }

    @PostMapping("/item/{itemId}")
    public ResponseEntity<Comment> addComment(@PathVariable Integer itemId, @RequestBody Comment comment) {
        return itemRepository.findById(itemId)
                .map(item -> {
                    comment.setItem(item);
                    Comment saved = commentRepository.save(comment);
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
