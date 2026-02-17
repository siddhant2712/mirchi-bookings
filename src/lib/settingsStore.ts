const STORAGE_KEY = "mirchi-hotel-settings";

export interface AppSettings {
  defaultCheckOutTime: string;
  businessName: string;
  invoiceTitle: string;
  invoiceFooter: string;
  currency: string;
  taxRatePercent: number;
  businessAddress: string;
  businessContact: string;
  /** Hotel GST number (for invoice) */
  businessGstNumber: string;
  /** Room ID -> rate per day (amount) */
  roomRates: Record<string, number>;
  showTaxInRevenue: boolean;
}

const defaults: AppSettings = {
  defaultCheckOutTime: "11:00",
  businessName: "🌶️ Mirchi Hotel",
  invoiceTitle: "Tax Invoice",
  invoiceFooter: "Thank you for staying with us! 🌶️",
  currency: "₹",
  taxRatePercent: 18,
  businessAddress: "",
  businessContact: "",
  businessGstNumber: "",
  roomRates: {},
  showTaxInRevenue: true,
};

export function getSettings(): AppSettings {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return { ...defaults };
    const parsed = JSON.parse(data) as Partial<AppSettings>;
    return { ...defaults, ...parsed };
  } catch {
    return { ...defaults };
  }
}

export function saveSettings(settings: Partial<AppSettings>): void {
  const current = getSettings();
  const next = { ...current, ...settings };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function resetSettings(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Get rate per day for a room (0 if not set) */
export function getRoomRate(roomId: string): number {
  const s = getSettings();
  return s.roomRates?.[roomId] ?? 0;
}
