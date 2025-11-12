package com.bmss.backend.service;

import com.bmss.backend.dto.NotificationDTO;
import com.bmss.backend.model.Item;
import com.bmss.backend.repository.ItemRepository;
import com.bmss.backend.repository.SentimentRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final ItemRepository itemRepository;
    private final SentimentRepository sentimentRepository;

    public List<NotificationDTO> listarNotificacoes(int limit) {
        int safeLimit = Math.max(3, Math.min(limit, 24));
        LinkedHashMap<String, NotificationDTO> resultado = new LinkedHashMap<>();

        try {
            NotificationDTO resumo = construirResumo();
            if (resumo != null) {
                resultado.put(resumo.getId(), resumo);
            }
        } catch (Exception e) {
            log.warn("Falha ao montar resumo de notificações: {}", e.getMessage());
        }

        List<Item> itens = Collections.emptyList();
        try {
            itens = buscarItensAnalisados(safeLimit * 3);
        } catch (Exception e) {
            log.error("Erro ao buscar itens analisados para notificações", e);
        }

        if (itens.isEmpty()) {
            if (resultado.isEmpty()) {
                resultado.put("summary", NotificationDTO.emptySummary());
            }
            return new ArrayList<>(resultado.values());
        }

        int anexados = 0;
        for (Item item : itens) {
            if (anexados >= safeLimit) {
                break;
            }
            NotificationDTO dto = NotificationDTO.fromItem(item);
            if (dto == null) {
                continue;
            }
            if (resultado.containsKey(dto.getId())) {
                continue;
            }
            resultado.put(dto.getId(), dto);
            anexados++;
        }

        if (resultado.isEmpty()) {
            resultado.put("summary", NotificationDTO.emptySummary());
        }

        return new ArrayList<>(resultado.values());
    }

    private List<Item> buscarItensAnalisados(int limit) {
        if (limit <= 0) {
            return Collections.emptyList();
        }

        int tamanho = Math.min(limit, 60);
        Sort sort = Sort.by(Sort.Order.desc("publishedAt"), Sort.Order.desc("createdAt"));
        Pageable pageable = PageRequest.of(0, tamanho, sort);
        return itemRepository.findBySentimentLabelIsNotNullOrderByPublishedAtDesc(pageable);
    }

    private NotificationDTO construirResumo() {
        long total = sentimentRepository.count();
        if (total <= 0) {
            return NotificationDTO.emptySummary();
        }

        List<Object[]> distribuicao = sentimentRepository.findSentimentDistribution();
        double positivo = 0.0;
        double neutro = 0.0;
        double negativo = 0.0;

        for (Object[] linha : distribuicao) {
            if (linha == null || linha.length < 3) {
                continue;
            }
            Object labelObj = linha[0];
            Object percentualObj = linha[2];
            if (!(labelObj instanceof String) || !(percentualObj instanceof Number)) {
                continue;
            }
            String label = ((String) labelObj).toLowerCase(Locale.ROOT);
            double percentual = ((Number) percentualObj).doubleValue();
            switch (label) {
                case "positive":
                case "positivo":
                    positivo = percentual;
                    break;
                case "negative":
                case "negativo":
                    negativo = percentual;
                    break;
                default:
                    neutro = percentual;
            }
        }

        return NotificationDTO.summary(total, positivo, neutro, negativo);
    }
}
