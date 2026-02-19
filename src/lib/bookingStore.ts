import { Booking } from "./types";
import { getItem, setItem, removeItem } from "./idbStorage";

const STORAGE_KEY = "mirchi-hotel-bookings";
const DELETED_KEY = "mirchi-hotel-bookings-deleted";

export function getBookings(): Booking[] {
  try {
    const data = getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function getDeletedBookings(): Booking[] {
  try {
    const data = getItem(DELETED_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveBooking(booking: Booking): void {
  const bookings = getBookings();
  const idx = bookings.findIndex((b) => b.id === booking.id);
  if (idx >= 0) bookings[idx] = booking;
  else bookings.push(booking);
  setItem(STORAGE_KEY, JSON.stringify(bookings));
  try { window.dispatchEvent(new Event("bookings-updated")); } catch {}
}

export function deleteBooking(id: string): void {
  const bookings = getBookings();
  const remaining = bookings.filter((b) => b.id !== id);
  const deleted = getDeletedBookings();
  const moved = bookings.find((b) => b.id === id);
  if (moved) {
    (moved as any).deletedAt = new Date().toISOString();
    deleted.push(moved);
    setItem(DELETED_KEY, JSON.stringify(deleted));
  }
  setItem(STORAGE_KEY, JSON.stringify(remaining));
  try { window.dispatchEvent(new Event("bookings-updated")); } catch {}
}

export function restoreDeletedBooking(id: string): void {
  const deleted = getDeletedBookings();
  const idx = deleted.findIndex((d) => d.id === id);
  if (idx < 0) return;
  const item = deleted.splice(idx, 1)[0];
  try {
    delete (item as any).deletedAt;
    delete (item as any).purgedAt;
  } catch {}
  const bookings = getBookings();
  bookings.push(item);
  setItem(STORAGE_KEY, JSON.stringify(bookings));
  setItem(DELETED_KEY, JSON.stringify(deleted));
  try { window.dispatchEvent(new Event("bookings-updated")); } catch {}
}

export function purgeDeletedBooking(id: string): void {
  const deleted = getDeletedBookings();
  const idx = deleted.findIndex((d) => d.id === id);
  if (idx < 0) return;
  const item = deleted[idx];
  (item as any).purgedAt = new Date().toISOString();
  deleted[idx] = item;
  setItem(DELETED_KEY, JSON.stringify(deleted));
  try { window.dispatchEvent(new Event("bookings-updated")); } catch {}
}

export function clearAllBookings(): void {
  const bookings = getBookings();
  if (bookings.length) {
    const deleted = getDeletedBookings();
    const now = new Date().toISOString();
    bookings.forEach((b) => (b as any).deletedAt = now);
    setItem(DELETED_KEY, JSON.stringify([...deleted, ...bookings]));
  }
  removeItem(STORAGE_KEY);
  try { window.dispatchEvent(new Event("bookings-updated")); } catch {}
}

export function exportBookingsJSON(includeDeleted = false): string {
  const active = getBookings();
  if (!includeDeleted) return JSON.stringify(active, null, 2);
  const deleted = getDeletedBookings();
  return JSON.stringify({ active, deleted }, null, 2);
}

export function exportBookingsCSV(): string {
  const bookings = getBookings();
  if (!bookings.length) return "";
  const headers = ["id", "guestName", "phone", "room", "checkIn", "checkOut", "amount", "advance", "status", "createdAt", "notes", "guestCompanyName", "guestGstNumber"];
  const rows = bookings.map((b) =>
    headers.map((h) => `"${String((b as any)[h] ?? "").replace(/"/g, '""')}"`).join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function isRoomAvailable(roomId: string, checkIn: string, checkOut: string, excludeBookingId?: string): boolean {
  const bookings = getBookings().filter(
    (b) => b.room === roomId && b.status !== "checked-out" && b.status !== "cancelled" && b.id !== excludeBookingId
  );
  const newIn = new Date(checkIn).getTime();
  const newOut = new Date(checkOut).getTime();
  return !bookings.some((b) => {
    const bIn = new Date(b.checkIn).getTime();
    const bOut = new Date(b.checkOut).getTime();
    return newIn < bOut && newOut > bIn;
  });
}
