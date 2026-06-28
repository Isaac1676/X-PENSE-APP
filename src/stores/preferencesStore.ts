import { create } from "zustand";

export type NumberFormatType = "space" | "comma";
export type DateFormatType = "DD/MM/YYYY" | "MM/DD/YYYY";

interface PreferencesStore {
  numberFormat: NumberFormatType;
  dateFormat: DateFormatType;
  fiscalMonthStart: number;
  notificationsEnabled: boolean;
  setNumberFormat: (format: NumberFormatType) => void;
  setDateFormat: (format: DateFormatType) => void;
  setFiscalMonthStart: (day: number) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
}

export const usePreferencesStore = create<PreferencesStore>((set) => {
  const savedNumberFormat = (localStorage.getItem("pref_numberFormat") as NumberFormatType) || "space";
  const savedDateFormat = (localStorage.getItem("pref_dateFormat") as DateFormatType) || "DD/MM/YYYY";
  const savedFiscalMonthStart = parseInt(localStorage.getItem("pref_fiscalMonthStart") || "1", 10);
  const savedNotificationsEnabled = localStorage.getItem("pref_notificationsEnabled") === "true";

  return {
    numberFormat: savedNumberFormat,
    dateFormat: savedDateFormat,
    fiscalMonthStart: savedFiscalMonthStart,
    notificationsEnabled: savedNotificationsEnabled,

    setNumberFormat: (format: NumberFormatType) => {
      localStorage.setItem("pref_numberFormat", format);
      set({ numberFormat: format });
    },
    setDateFormat: (format: DateFormatType) => {
      localStorage.setItem("pref_dateFormat", format);
      set({ dateFormat: format });
    },
    setFiscalMonthStart: (day: number) => {
      localStorage.setItem("pref_fiscalMonthStart", day.toString());
      set({ fiscalMonthStart: day });
    },
    setNotificationsEnabled: (enabled: boolean) => {
      localStorage.setItem("pref_notificationsEnabled", enabled.toString());
      set({ notificationsEnabled: enabled });
    },
  };
});
