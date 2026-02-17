import { Booking } from "./types";

const STORAGE_KEY = "mirchi-hotel-bookings";

export function getBookings(): Booking[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

export function deleteBooking(id: string): void {
  const bookings = getBookings().filter((b) => b.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

export function clearAllBookings(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function exportBookingsJSON(): string {
  return JSON.stringify(getBookings(), null, 2);
}

export function exportBookingsCSV(): string {
  const bookings = getBookings();
  if (!bookings.length) return "";
  const headers = ["id", "guestName", "phone", "room", "checkIn", "checkOut", "amount", "advance", "status", "createdAt", "notes"];
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
