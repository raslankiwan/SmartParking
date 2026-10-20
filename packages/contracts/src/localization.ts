import countries from "i18n-iso-countries";
export const countryCodes = Object.keys(countries.getAlpha2Codes());
/** Monetary amounts are integer minor units, including zero/three-decimal currencies. */
export function currencyDigits(currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).resolvedOptions().maximumFractionDigits!;
}
export function toMinorUnits(amount: number, currency: string) {
  return Math.round(amount * 10 ** currencyDigits(currency));
}
export function formatMoney(amount: number, currency = "ILS", locale?: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    amount / 10 ** currencyDigits(currency),
  );
}
export const cityKey = (street: { city: string; countryCode?: string }) =>
  JSON.stringify([street.countryCode || "", street.city]);
