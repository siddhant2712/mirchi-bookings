const STORAGE_KEY = "mirchi-hotel-settings";

export interface RoomConfig {
  id: string;
  label: string;
  type: string;
}

export interface AppSettings {
  defaultCheckOutTime: string;
  businessName: string;
  invoiceTitle: string;
  invoiceFooter: string;
  currency: string;
  /** @deprecated use cgstPercent + sgstPercent */
  taxRatePercent: number;
  cgstPercent: number;
  sgstPercent: number;
  businessAddress: string;
  businessContact: string;
  /** Hotel GST number (for invoice) */
  businessGstNumber: string;
  /** Room ID -> rate per day (amount) */
  roomRates: Record<string, number>;
  showTaxInRevenue: boolean;
  /** Custom room list - if empty, uses defaults */
  rooms: RoomConfig[];
  /** Display label for CGST line on invoice */
  cgstLabel: string;
  /** Display label for SGST line on invoice */
  sgstLabel: string;
}

export const DEFAULT_ROOMS: RoomConfig[] = [
  { id: "101", type: "Room", label: "Room 101" },
  { id: "102", type: "Room", label: "Room 102" },
  { id: "103", type: "Room", label: "Room 103" },
  { id: "104", type: "Room", label: "Room 104" },
  { id: "105", type: "Room", label: "Room 105" },
  { id: "106", type: "Room", label: "Room 106" },
  { id: "107", type: "Room", label: "Room 107" },
  { id: "108", type: "Room", label: "Room 108" },
  { id: "109", type: "Room", label: "Room 109" },
  { id: "PH", type: "Party Hall", label: "Party Hall" },
];

const defaults: AppSettings = {
  defaultCheckOutTime: "11:00",
  businessName: "🌶️ Mirchi Hotel",
  invoiceTitle: "Tax Invoice",
  invoiceFooter: "Thank you for staying with us! 🌶️",
  currency: "₹",
  taxRatePercent: 18,
  cgstPercent: 9,
  sgstPercent: 9,
  businessAddress: "",
  businessContact: "",
  businessGstNumber: "",
  roomRates: {},
  showTaxInRevenue: true,
  cgstLabel: "CGST",
  sgstLabel: "SGST",
  rooms: [],
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

/** Get active rooms (custom or default) */
export function getRooms(): RoomConfig[] {
  const s = getSettings();
  return s.rooms && s.rooms.length > 0 ? s.rooms : DEFAULT_ROOMS;
}

/** Get total tax percent */
export function getTotalTaxPercent(): number {
  const s = getSettings();
  return (s.cgstPercent || 0) + (s.sgstPercent || 0);
}
