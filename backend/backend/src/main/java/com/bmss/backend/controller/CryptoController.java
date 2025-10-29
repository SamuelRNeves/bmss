package com.bmss.backend.controller;

import com.bmss.backend.service.CryptoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/crypto")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class CryptoController {

    private final CryptoService cryptoService;

    @GetMapping("/bitcoin")
    public ResponseEntity<Map<String, Object>> getBitcoinPrice() {
        try {
            Map<String, Object> bitcoinData = cryptoService.getBitcoinPrice();
            return ResponseEntity.ok(bitcoinData);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(
                Map.of("error", "Falha ao buscar cotação do Bitcoin")
            );
        }
    }
}