package com.bmss.backend.repository;

import com.bmss.backend.model.Sentiment;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SentimentRepository extends JpaRepository<Sentiment, Integer> {
    
    // 🔹 Distribuição de sentimentos em porcentagem
    @Query("SELECT s.label, COUNT(s), ROUND(COUNT(s) * 100.0 / (SELECT COUNT(s2) FROM Sentiment s2), 2) " +
           "FROM Sentiment s GROUP BY s.label ORDER BY COUNT(s) DESC")
    List<Object[]> findSentimentDistribution();
    
    // 🔹 Tendências diárias dos últimos dias
    @Query("SELECT FUNCTION('DATE', s.createdAt), s.label, COUNT(s), " +
           "ROUND(COUNT(s) * 100.0 / TOTAL.count, 2) " +
           "FROM Sentiment s, " +
           "(SELECT FUNCTION('DATE', s2.createdAt) as date, COUNT(s2) as count " +
           " FROM Sentiment s2 WHERE s2.createdAt BETWEEN :startDate AND :endDate " +
           " GROUP BY FUNCTION('DATE', s2.createdAt)) TOTAL " +
           "WHERE FUNCTION('DATE', s.createdAt) = TOTAL.date " +
           "AND s.createdAt BETWEEN :startDate AND :endDate " +
           "GROUP BY FUNCTION('DATE', s.createdAt), s.label " +
           "ORDER BY FUNCTION('DATE', s.createdAt) DESC")
    List<Object[]> findDailySentimentTrends(@Param("startDate") LocalDate startDate, 
                                           @Param("endDate") LocalDate endDate);
    
    // Contagem total
    long count();
}