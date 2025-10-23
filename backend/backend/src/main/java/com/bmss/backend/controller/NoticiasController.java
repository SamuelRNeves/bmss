 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/backend/backend/src/main/java/com/bmss/backend/controller/NoticiasController.java b/backend/backend/src/main/java/com/bmss/backend/controller/NoticiasController.java
index b790f3fda05125c08fcf4442440f77f396cd1765..e359bb6e928ccf7ac9bdc0957a94ed84646938cd 100644
--- a/backend/backend/src/main/java/com/bmss/backend/controller/NoticiasController.java
+++ b/backend/backend/src/main/java/com/bmss/backend/controller/NoticiasController.java
@@ -1,45 +1,55 @@
 package com.bmss.backend.controller;
 
 import com.bmss.backend.dto.FeedDTO;
+import com.bmss.backend.model.Item;
+import com.bmss.backend.repository.ItemRepository;
 import com.bmss.backend.service.NoticiasService;
 import org.springframework.beans.factory.annotation.Autowired;
+import org.springframework.data.domain.Page;
+import org.springframework.data.domain.PageRequest;
+import org.springframework.data.domain.Pageable;
+import org.springframework.data.domain.Sort;
 import org.springframework.http.ResponseEntity;
-import org.springframework.web.bind.annotation.*;
-import java.util.List;
-import java.util.stream.Collectors;
+import org.springframework.web.bind.annotation.CrossOrigin;
+import org.springframework.web.bind.annotation.GetMapping;
+import org.springframework.web.bind.annotation.RequestMapping;
+import org.springframework.web.bind.annotation.RequestParam;
+import org.springframework.web.bind.annotation.RestController;
 
-import java.util.Map;
+import java.util.List;
 
 @RestController
 @RequestMapping("/api/v1/noticias")
 @CrossOrigin(origins = "http://localhost:3000")
 public class NoticiasController {
 
     @Autowired
     private NoticiasService noticiasService;
 
+    @Autowired
+    private ItemRepository itemRepository;
+
     // 🔹 Lista as últimas notícias
     @GetMapping("/ultimas")
-public ResponseEntity<List<FeedDTO>> ultimas(
-        @RequestParam(defaultValue = "12") int limit,
-        @RequestParam(defaultValue = "bitcoin") String q) {
-
-    List<FeedDTO> noticias = noticiasService.buscarNoticias(limit, q);
+    public ResponseEntity<List<FeedDTO>> ultimas(
+            @RequestParam(defaultValue = "12") int limit,
+            @RequestParam(defaultValue = "bitcoin") String q) {
 
-    // 🔹 Envia os títulos e descrições para análise rápida
-    List<String> textos = noticias.stream()
-            .map(n -> n.getTitle() + ". " + n.getDescription())
-            .collect(Collectors.toList());
-
-    List<Map<String, Object>> analises = noticiasService.analyzeBatch(textos);
-
-    for (int i = 0; i < noticias.size() && i < analises.size(); i++) {
-        Map<String, Object> analise = analises.get(i);
-        noticias.get(i).setSentimento((String) analise.getOrDefault("label", "neutral"));
-        noticias.get(i).setScore(Double.valueOf(analise.getOrDefault("score", 0.0).toString()));
+        List<FeedDTO> noticias = noticiasService.buscarNoticias(limit, q);
+        return ResponseEntity.ok(noticias);
     }
 
-    return ResponseEntity.ok(noticias);
-}
+    // ============================================================
+    // 🔹 Notícias persistidas (ex.: histórico para dashboards)
+    // ============================================================
+    @GetMapping("/todas")
+    public ResponseEntity<List<Item>> listarTodas(
+            @RequestParam(defaultValue = "0") int page,
+            @RequestParam(defaultValue = "10") int size) {
+
+        Pageable pageable = PageRequest.of(page, size, Sort.by("publishedAt").descending());
+        Page<Item> pageResult = itemRepository.findAll(pageable);
+        return ResponseEntity.ok(pageResult.getContent());
+    }
 
 }
 
EOF
)