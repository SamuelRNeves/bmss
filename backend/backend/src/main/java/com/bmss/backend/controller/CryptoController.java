package com.bmss.backend.controller;

import com.bmss.backend.service.CryptoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/crypto")
public class CryptoController {

    private final CryptoService cryptoService;

    public CryptoController(CryptoService cryptoService) {
        this.cryptoService = cryptoService;
    }

    @GetMapping("/bitcoin")
    public ResponseEntity<?> getBitcoinPrice() {
        return ResponseEntity.ok(cryptoService.getBitcoinPrice());
    }

    @GetMapping("/bitcoin/24h")
    public ResponseEntity<?> getBitcoin24h() {
        return ResponseEntity.ok(cryptoService.getBitcoin24h());
    }

    @GetMapping("/bitcoin/historico")
    public ResponseEntity<?> getHistoricoBitcoin(@RequestParam(defaultValue = "30") int dias) {
        return ResponseEntity.ok(cryptoService.getBitcoinHistorico(dias));
    }

    @GetMapping("/bitcoin/historico-completo")
    public ResponseEntity<?> getHistoricoCompletoBitcoin() {
        return ResponseEntity.ok(cryptoService.getBitcoinHistoricoCompleto());
    }
}
