export const CURRENCIES = [
  { code: "IDR", symbol: "Rp", label: "IDR - Indonesian Rupiah" },
  { code: "USD", symbol: "$", label: "USD - US Dollar" },
  { code: "SGD", symbol: "S$", label: "SGD - Singapore Dollar" },
  { code: "EUR", symbol: "\u20AC", label: "EUR - Euro" },
  { code: "JPY", symbol: "\u00A5", label: "JPY - Japanese Yen" },
  { code: "GBP", symbol: "\u00A3", label: "GBP - British Pound" },
  { code: "AUD", symbol: "A$", label: "AUD - Australian Dollar" },
  { code: "MYR", symbol: "RM", label: "MYR - Malaysian Ringgit" },
  { code: "PHP", symbol: "\u20B1", label: "PHP - Philippine Peso" },
  { code: "THB", symbol: "\u0E3F", label: "THB - Thai Baht" },
  { code: "HKD", symbol: "HK$", label: "HKD - Hong Kong Dollar" },
  { code: "CNY", symbol: "\u00A5", label: "CNY - Chinese Yuan" },
  { code: "KRW", symbol: "\u20A9", label: "KRW - South Korean Won" },
  { code: "SAR", symbol: "\u0631.\u0633", label: "SAR - Saudi Riyal" },
  { code: "VND", symbol: "\u20AB", label: "VND - Vietnamese Dong" },
];

const LOCALE_MAP: Record<string, string> = {
  IDR: "id-ID",
  USD: "en-US",
  SGD: "en-SG",
  EUR: "de-DE",
  JPY: "ja-JP",
  GBP: "en-GB",
  AUD: "en-AU",
  MYR: "ms-MY",
  PHP: "en-PH",
  THB: "th-TH",
  HKD: "en-HK",
  CNY: "zh-CN",
  KRW: "ko-KR",
  SAR: "ar-SA",
  VND: "vi-VN",
};

export function getCurrencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol || code;
}

export function formatCurrency(amount: number, currency: string): string {
  const locale = LOCALE_MAP[currency] || "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}
