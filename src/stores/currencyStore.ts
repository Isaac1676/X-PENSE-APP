import { create } from "zustand";

export type CurrencyType = "FCFA" | "EUR";

interface CurrencyStore {
  currency: CurrencyType;
  setCurrency: (currency: CurrencyType) => void;
}

export const useCurrencyStore = create<CurrencyStore>((set) => {
  const savedCurrency = localStorage.getItem("currency") as CurrencyType;
  const initialCurrency = savedCurrency === "EUR" ? "EUR" : "FCFA";

  return {
    currency: initialCurrency,
    setCurrency: (currency: CurrencyType) => {
      localStorage.setItem("currency", currency);
      set({ currency });
    },
  };
});
