function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }

  if (value && typeof value === 'object' && value.constructor === Object) {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};

    Object.keys(record)
      .sort()
      .forEach((key) => {
        const normalized = normalizeValue(record[key]);
        if (normalized !== undefined) {
          sorted[key] = normalized;
        }
      });

    return sorted;
  }

  return value;
}

export function normalizeQueryKey(queryKey: readonly unknown[]): readonly unknown[] {
  return queryKey.map((segment) => normalizeValue(segment));
}

export function hashQueryKey(queryKey: readonly unknown[]): string {
  return JSON.stringify(normalizeQueryKey(queryKey));
}
