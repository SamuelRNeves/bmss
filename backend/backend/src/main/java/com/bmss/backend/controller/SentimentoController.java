package com.bmss.backend.controller;

import com.bmss.backend.repository.SentimentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class SentimentoController {

    private final SentimentRepository sentimentRepository;

    // 🔹 Endpoint para KPIs de Sentimento
    // No SentimentoController.java - ATUALIZE o método getSentimentSummary
@GetMapping("/sentimento")
public ResponseEntity<Map<String, Object>> getSentimentSummary() {
    try {
        // Buscar todos os sentimentos analisados recentemente
        List<Object[]> results = sentimentRepository.findSentimentDistribution();
        
        Map<String, Double> distribution = new HashMap<>();
        distribution.put("positive", 0.0);
        distribution.put("neutral", 0.0);
        distribution.put("negative", 0.0);
        
        Long totalAnalisados = sentimentRepository.count();
        
        if (!results.isEmpty() && totalAnalisados > 0) {
            for (Object[] result : results) {
                String label = ((String) result[0]).toLowerCase();
                Long count = (Long) result[1];
                Double percentage = (Double) result[2];
                
                distribution.put(label, percentage);
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("positive", distribution.get("positive"));
            response.put("neutral", distribution.get("neutral"));
            response.put("negative", distribution.get("negative"));
            response.put("totalAnalisados", totalAnalisados);
            response.put("timestamp", LocalDateTime.now().toString());
            response.put("isFallback", false); // 🔹 DADOS REAIS
            
            return ResponseEntity.ok(response);
        } else {
            // 🔹 SEM DADOS NO BANCO - mas não é fallback, é situação real
            Map<String, Object> response = new HashMap<>();
            response.put("positive", 0.0);
            response.put("neutral", 0.0);
            response.put("negative", 0.0);
            response.put("totalAnalisados", 0);
            response.put("timestamp", LocalDateTime.now().toString());
            response.put("isFallback", false); // 🔹 Ainda são dados reais (vazios)
            response.put("empty", true);
            
            return ResponseEntity.ok(response);
        }
        
    } catch (Exception e) {
        // 🔹 SÓ AQUI é fallback real (erro na consulta)
        Map<String, Object> fallback = new HashMap<>();
        fallback.put("positive", 0.35);
        fallback.put("neutral", 0.45);
        fallback.put("negative", 0.20);
        fallback.put("totalAnalisados", 0);
        fallback.put("timestamp", LocalDateTime.now().toString());
        fallback.put("isFallback", true); // 🔹 VERDADEIRO FALLBACK
        fallback.put("error", e.getMessage());
        return ResponseEntity.ok(fallback);
    }
}

    // 🔹 Endpoint para Tendências (últimos 7 dias)
    // No SentimentoController.java - ATUALIZE o método getTendencias
@GetMapping("/tendencias")
public ResponseEntity<List<Map<String, Object>>> getTendencias() {
    try {
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(7);
        
        List<Object[]> trendsData = sentimentRepository.findDailySentimentTrends(startDate, endDate);
        
        List<Map<String, Object>> trends = new ArrayList<>();
        boolean hasRealData = false;
        
        // Preencher últimos 7 dias
        for (int i = 6; i >= 0; i--) {
            LocalDate date = endDate.minusDays(i);
            String dayKey = date.toString();
            
            Map<String, Object> dayData = new HashMap<>();
            dayData.put("day", formatDay(date));
            dayData.put("date", dayKey);
            dayData.put("positive", 0.0);
            dayData.put("neutral", 0.0);
            dayData.put("negative", 0.0);
            dayData.put("total", 0);
            dayData.put("isFallback", false); // 🔹 Inicialmente não é fallback
            
            // Encontrar dados para este dia
            for (Object[] trend : trendsData) {
                String trendDate = ((java.sql.Date) trend[0]).toLocalDate().toString();
                if (trendDate.equals(dayKey)) {
                    String label = ((String) trend[1]).toLowerCase();
                    Long count = (Long) trend[2];
                    Double percentage = (Double) trend[3];
                    
                    dayData.put(label, percentage);
                    dayData.put("total", count);
                    hasRealData = true;
                    break;
                }
            }
            
            trends.add(dayData);
        }
        
        // 🔹 Se não encontrou dados reais, marca como vazio mas não como fallback
        if (!hasRealData) {
            for (Map<String, Object> day : trends) {
                day.put("empty", true);
            }
        }
        
        return ResponseEntity.ok(trends);
        
    } catch (Exception e) {
        // 🔹 SÓ AQUI é fallback real
        List<Map<String, Object>> fallback = generateFallbackTrends();
        for (Map<String, Object> day : fallback) {
            day.put("isFallback", true); // 🔹 VERDADEIRO FALLBACK
        }
        return ResponseEntity.ok(fallback);
    }
}
    
    private String formatDay(LocalDate date) {
        return date.getDayOfMonth() + "/" + date.getMonthValue();
    }
    
    private List<Map<String, Object>> generateFallbackTrends() {
        List<Map<String, Object>> trends = new ArrayList<>();
        LocalDate today = LocalDate.now();
        
        double[] positiveTrend = {0.25, 0.30, 0.35, 0.40, 0.45, 0.42, 0.38};
        double[] neutralTrend = {0.50, 0.48, 0.45, 0.42, 0.40, 0.43, 0.47};
        double[] negativeTrend = {0.25, 0.22, 0.20, 0.18, 0.15, 0.15, 0.15};
        
        for (int i = 6; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            Map<String, Object> dayData = new HashMap<>();
            dayData.put("day", formatDay(date));
            dayData.put("positive", positiveTrend[6-i]);
            dayData.put("neutral", neutralTrend[6-i]);
            dayData.put("negative", negativeTrend[6-i]);
            dayData.put("total", 15 + (int)(Math.random() * 10));
            dayData.put("fallback", true);
            trends.add(dayData);
        }
        
        return trends;
    }
}