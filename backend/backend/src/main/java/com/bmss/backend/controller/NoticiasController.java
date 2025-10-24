package com.bmss.backend.controller;

import com.bmss.backend.dto.FeedDTO;
import com.bmss.backend.service.NoticiasService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/noticias")
@CrossOrigin(origins = "http://localhost:3000")
public class NoticiasController {

    @Autowired
    private NoticiasService noticiasService;

    // ============================================================
    // 🔹 Endpoint principal usado pelo frontend (apenas leitura)
    // ============================================================
    @GetMapping("/ultimas")
    public ResponseEntity<Map<String, Object>> ultimas(
            @RequestParam(defaultValue = "bitcoin") String q,
            @RequestParam(defaultValue = "10") int limit
    ) {
        System.out.println("🔎 [Frontend] Solicitando últimas notícias para: " + q);

        List<FeedDTO> noticias = noticiasService.buscarNoticias(limit, q);

        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("total", noticias.size());
        resposta.put("keyword", q);
        resposta.put("data", noticias);
        resposta.put("message", noticias.isEmpty()
                ? "⚠️ Nenhuma notícia encontrada."
                : "✅ Notícias reais retornadas com sucesso.");

        System.out.println("✅ Enviando " + noticias.size() + " notícias ao frontend.");
        return ResponseEntity.ok(resposta);
    }

    // ============================================================
    // 🔹 Endpoint de debug para testes manuais
    // ============================================================
    @GetMapping("/debug")
    public ResponseEntity<Map<String, Object>> debugNoticias(
            @RequestParam(defaultValue = "bitcoin") String q,
            @RequestParam(defaultValue = "10") int limit
    ) {
        System.out.println("🧠 [Debug] Testando busca manual de notícias para: " + q);

        List<FeedDTO> noticias = noticiasService.buscarNoticias(limit, q);

        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("total", noticias.size());
        resposta.put("keyword", q);
        resposta.put("data", noticias);
        resposta.put("message", noticias.isEmpty()
                ? "⚠️ Nenhuma notícia real encontrada (verifique a API GNews ou o filtro de domínios)."
                : "✅ Notícias reais retornadas com sucesso.");

        if (noticias.isEmpty()) {
            System.out.println("⚠️ Nenhuma notícia retornada.");
        } else {
            System.out.println("✅ " + noticias.size() + " notícias encontradas.");
        }

        return ResponseEntity.ok(resposta);
    }

    // ============================================================
    // 🧠 NOVO: Endpoint para executar análise e salvar no banco
    // ============================================================
    // ============================================================
// 🔹 Endpoint para analisar e salvar no banco
// ============================================================
@GetMapping("/analisar")
public ResponseEntity<Map<String, Object>> analisarNoticias(
        @RequestParam(defaultValue = "bitcoin") String q
) {
    System.out.println("🧠 Analisando e salvando notícias para: " + q);

    noticiasService.fetchAndStoreNews(q);

    Map<String, Object> resposta = new LinkedHashMap<>();
    resposta.put("message", "✅ Análise concluída e dados salvos no banco!");
    return ResponseEntity.ok(resposta);
}

}
