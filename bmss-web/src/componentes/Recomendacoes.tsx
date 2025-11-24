const buildPurchaseGuidance = (
  perfil: InvestorProfile,
  percentualPositivo: number,
  percentualNeutro: number,
  percentualNegativo: number
): PurchaseGuidance => {
  const viesLiquidez = percentualNeutro >= 0.2;
  const margemPositiva = percentualPositivo - percentualNegativo;
  const choqueVendedor = percentualNegativo >= 0.65;
  const vantagemNegativa = percentualNegativo - percentualPositivo;
  const neutroAmortecedor = percentualNeutro >= 0.55;

  if (perfil === "AGRESSIVO") {
    if (choqueVendedor && percentualPositivo < 0.08) {
      return {
        status: "evitar",
        titulo: "Pressão vendedora dominante",
        detalhe:
          "Mesmo tolerando ruído, o perfil agressivo preserva munição quando o negativo passa de 65% e o positivo não reage. Foque em trades curtos ou espere alívio.",
      };
    }

    if (percentualPositivo >= 0.03 && (viesLiquidez || margemPositiva > -0.15)) {
      return {
        status: "comprar",
        titulo: "Janela tática aberta",
        detalhe:
          "Com 3%+ de sinais positivos e pelo menos 20% neutros, há espaço para entradas rápidas com stops curtos. O agressivo prioriza velocidade e aceita drawdown de curto prazo.",
      };
    }

    if (vantagemNegativa > 0.12 && !neutroAmortecedor) {
      return {
        status: "observar",
        titulo: "Venda ainda fala mais alto",
        detalhe:
          "Negativo supera o positivo e o neutro não está amortecendo bem. O agressivo pode operar contrarian em prazos curtos, mas sem travar capital em posições longas.",
      };
    }

    return {
      status: "observar",
      titulo: "Paciência estratégica",
      detalhe:
        "Espere o neutro subir para perto de 30% ou o positivo reagir antes de alavancar. Preserve liquidez para capturar rompimentos com stops curtos.",
    };
  }

  if (perfil === "MODERADO") {
    if (
      percentualPositivo >= 0.15 &&
      percentualNegativo <= 0.4 &&
      (percentualPositivo >= percentualNegativo || neutroAmortecedor)
    ) {
      return {
        status: "comprar",
        titulo: "Compras graduais liberadas",
        detalhe:
          "Balanceado entre prudência e oportunidade: com 15%+ positivos, venda contida e neutro amortecendo, o moderado pode comprar em parcelas, mantendo stops mais folgados.",
      };
    }

    if (percentualNegativo >= 0.6 || margemPositiva <= -0.2) {
      return {
        status: "evitar",
        titulo: "Cenário frágil para novas posições",
        detalhe: "Sentimento negativo muito alto ou vantagem vendedora relevante. Preservar capital e aguardar que o neutro volte a amortecer o risco.",
      };
    }

    if (vantagemNegativa >= 0.08 && !neutroAmortecedor) {
      return {
        status: "observar",
        titulo: "Aguardar reequilíbrio",
        detalhe:
          "O negativo ainda supera o positivo. Espere o neutro segurar melhor a volatilidade ou o positivo virar a liderança antes de novas compras.",
      };
    }

    return {
      status: "observar",
      titulo: "Aguardando confirmação",
      detalhe:
        "Priorize equilíbrio: monte posições pequenas quando houver neutro acima de 20% e espere o positivo superar o negativo antes de acelerar compras.",
    };
  }

  // Perfil CONSERVADOR
  if (percentualPositivo >= 0.2 && percentualNegativo <= 0.3 && percentualNeutro >= 0.2) {
    return {
      status: "comprar",
      titulo: "Entrada seletiva permitida",
      detalhe:
        "O conservador teme quedas de curto prazo; por isso exige 20%+ de sinais positivos, neutro robusto e venda contida para iniciar posições protegidas e menores.",
    };
  }

  if (percentualNegativo >= 0.45 || margemPositiva < -0.1) {
    return {
      status: "evitar",
      titulo: "Preservar capital",
      detalhe: "Ambiente defensivo para o conservador. Fique em caixa ou ativos estáveis até que a pressão vendedora recue e o neutro volte a amortecer a volatilidade.",
    };
  }

  return {
    status: "observar",
    titulo: "Monitorando sinais",
    detalhe:
      "Mantenha postura cautelosa; o conservador espera que o positivo fique mais encorpado e que o negativo permaneça abaixo de 30% antes de alocar novo capital.",
  };
};