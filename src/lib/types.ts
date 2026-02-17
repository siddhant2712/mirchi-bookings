export interface Booking {
  id: string;
  guestName: string;
  phone: string;
  room: string;
  checkIn: string;
  checkOut: string;
  amount: number;
  advance: number;
  status: "confirmed" | "checked-in" | "checked-out" | "cancelled";
  createdAt: string;
  notes?: string;
}

export const ROOMS = [
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
] as const;
