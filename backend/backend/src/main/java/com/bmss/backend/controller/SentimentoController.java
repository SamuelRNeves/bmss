package com.bmss.backend.controller;

import com.bmss.backend.service.SentimentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

import java.util.*;

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "http://localhost:3000")
public class SentimentoController {

    @Autowired
    private SentimentService sentimentService;

    @GetMapping("/sentimento")
    public ResponseEntity<Map<String, Double>> calcularSentimentoGeral() {
        List<String> noticias = List.of(
                "Bitcoin rompe resistência dos 70 mil dólares",
                "ETF de Bitcoin atrai fluxo recorde em outubro",
                "Hashrate do Bitcoin atinge novo pico histórico",
                "Empresas adotam BTC como reserva de valor",
                "Mercado prevê corte de juros e impacto no BTC"
        );

        int positivos = 0, neutros = 0, negativos = 0;

        for (String texto : noticias) {
            Map<String, Object> analise = sentimentService.analyzeText(texto);
            String label = (String) analise.get("label");

            if ("positive".equalsIgnoreCase(label)) positivos++;
            else if ("neutral".equalsIgnoreCase(label)) neutros++;
            else if ("negative".equalsIgnoreCase(label)) negativos++;
        }

        int total = positivos + neutros + negativos;
        if (total == 0) total = 1; // evita divisão por zero

        Map<String, Double> resultado = new HashMap<>();
        resultado.put("positive", positivos / (double) total);
        resultado.put("neutral", neutros / (double) total);
        resultado.put("negative", negativos / (double) total);

        return ResponseEntity.ok(resultado);
    }
}
