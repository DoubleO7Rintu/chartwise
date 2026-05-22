export type FormatCurrencyOptions = {
  currency?: string;
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

export function formatCurrency(value: number, options: FormatCurrencyOptions = {}): string {
  const {
    currency = 'USD',
    locale = 'en-US',
    minimumFractionDigits,
    maximumFractionDigits,
  } = options;

  if (!Number.isFinite(value)) {
    return 'N/A';
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}

export function abbreviateNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return 'N/A';
  }

  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    return `${sign}${stripTrailingZeroes(abs / 1_000_000_000)}B`;
  }

  if (abs >= 1_000_000) {
    return `${sign}${stripTrailingZeroes(abs / 1_000_000)}M`;
  }

  if (abs >= 1_000) {
    return `${sign}${stripTrailingZeroes(abs / 1_000)}K`;
  }

  return `${value}`;
}

export function formatPrice(value: number, currency = 'USD'): string {
  if (!Number.isFinite(value)) {
    return 'N/A';
  }

  if (value === 0) {
    return formatCurrency(0, { currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const abs = Math.abs(value);

  if (abs < 0.01) {
    return formatCurrency(value, { currency, minimumFractionDigits: 6, maximumFractionDigits: 8 });
  }

  if (abs < 1) {
    return formatCurrency(value, { currency, minimumFractionDigits: 4, maximumFractionDigits: 6 });
  }

  return formatCurrency(value, { currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function stripTrailingZeroes(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '');
}
