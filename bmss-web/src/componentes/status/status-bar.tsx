const resolvedSummary = useMemo(() => {
  const fallbackPayload = fallbackSummary
    ? ({
        id: "fallback-summary",
        title: fallbackSummary.title,
        description: fallbackSummary.description ?? fallbackSummary.title,
        sentiment: fallbackSummary.sentiment,
        category: "summary" as const,
        publishedAt: fallbackSummary.publishedAt,
      } satisfies NotificationPayload)
    : null;

  const baseSummary = summary ?? fallbackPayload;
  if (!baseSummary) return null;

  const parseDate = (value?: string | null) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const fallbackDate = parseDate(fallbackPayload?.publishedAt);
  const baseDate = parseDate(baseSummary.publishedAt);
  const fallbackIsFresher = Boolean(
    fallbackDate && (!baseDate || fallbackDate.getTime() > baseDate.getTime())
  );

  const shouldEnhanceWithFallback =
    fallbackPayload &&
    (fallbackIsFresher || !baseSummary.description || baseSummary.description === baseSummary.title);

  if (!shouldEnhanceWithFallback) return baseSummary;

  return {
    ...baseSummary,
    ...fallbackPayload,
    id: baseSummary.id,
    title: fallbackIsFresher ? fallbackPayload.title : baseSummary.title?.trim() || fallbackPayload.title,
    description: fallbackPayload.description,
    publishedAt: fallbackIsFresher
      ? fallbackPayload.publishedAt ?? baseSummary.publishedAt
      : baseSummary.publishedAt ?? fallbackPayload.publishedAt,
  } satisfies NotificationPayload;
}, [fallbackSummary, summary]);