import { getItem, setItem, removeItem } from "./idbStorage";

const STORAGE_KEY = "mirchi-invoices";

export interface StoredInvoice {
  id: string; // unique id for the invoice (bookingId + timestamp)
  bookingId: string;
  createdAt: string; // ISO date string
  guestName: string;
  phone: string;
  description: string;
  dateRange: string;
  roomBaseAmount: number;
  extraItems: { desc: string; amount: number }[];
  advancePaid: number;
  extraNotes: string;
  subtotal: number;
  cgstLabel: string;
  sgstLabel: string;
  cgstPercent: number;
  sgstPercent: number;
  cgstAmount: number;
  sgstAmount: number;
  totalTax: number;
  total: number;
  balance: number;
  currency: string;
  // hotel/settings values are optional
  hotelName?: string;
  hotelGstNumber?: string;
  hotelAddress?: string;
  hotelPhone?: string;
  invoiceTitle?: string;
  invoiceFooter?: string;
}

function loadInvoices(): StoredInvoice[] {
  try {
    const data = getItem(STORAGE_KEY);
    return data ? (JSON.parse(data) as StoredInvoice[]) : [];
  } catch {
    return [];
  }
}

function saveAll(invoices: StoredInvoice[]) {
  setItem(STORAGE_KEY, JSON.stringify(invoices));
}

export function getInvoices(): StoredInvoice[] {
  return loadInvoices();
}

export function saveInvoice(inv: StoredInvoice): void {
  const invoices = loadInvoices();
  invoices.push(inv);
  saveAll(invoices);
  try {
    window.dispatchEvent(new Event("invoices-updated"));
  } catch {}
}

export function clearInvoices(): void {
  saveAll([]);
  try {
    window.dispatchEvent(new Event("invoices-updated"));
  } catch {}
}

export function deleteInvoice(id: string): void {
  const invoices = loadInvoices().filter((i) => i.id !== id);
  saveAll(invoices);
  try {
    window.dispatchEvent(new Event("invoices-updated"));
  } catch {}
}

export function exportInvoicesJSON(): string {
  const invoices = loadInvoices();
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    count: invoices.length,
    invoices,
  }, null, 2);
}

export function downloadInvoicesJSON(): void {
  const content = exportInvoicesJSON();
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mirchi-invoices.json";
  a.click();
  URL.revokeObjectURL(url);
}
