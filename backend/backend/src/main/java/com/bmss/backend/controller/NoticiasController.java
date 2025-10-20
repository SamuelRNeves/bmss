package com.bmss.backend.controller;

import com.bmss.backend.dto.FeedDTO;
import com.bmss.backend.service.NewsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.*;

@RestController
@RequestMapping("/api/v1/noticias")
@CrossOrigin(origins = "http://localhost:3000")
public class NoticiasController {

    @Autowired
    private NewsService noticiasService;

    @GetMapping("/top5")
    public ResponseEntity<List<FeedDTO>> getUltimasNoticias() {
        List<FeedDTO> noticias = noticiasService.getLatestNews();
        return ResponseEntity.ok(noticias);
    }
}
