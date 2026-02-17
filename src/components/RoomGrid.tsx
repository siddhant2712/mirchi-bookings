import { ROOMS } from "@/lib/types";
import { getBookings } from "@/lib/bookingStore";
import { Bed, PartyPopper } from "lucide-react";

interface RoomGridProps {
  onSelectRoom: (roomId: string) => void;
}

export default function RoomGrid({ onSelectRoom }: RoomGridProps) {
  const bookings = getBookings();
  const today = new Date().toISOString().split("T")[0];

  const getStatus = (roomId: string) => {
    const active = bookings.find(
      (b) =>
        b.room === roomId &&
        b.status !== "checked-out" &&
        b.status !== "cancelled" &&
        b.checkIn <= today &&
        b.checkOut > today
    );
    if (active?.status === "checked-in") return "occupied";
    if (active?.status === "confirmed") return "reserved";
    return "available";
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {ROOMS.map((room) => {
        const status = getStatus(room.id);
        const statusColors = {
          available: "bg-success/10 border-success/30 hover:border-success",
          reserved: "bg-warning/10 border-warning/30 hover:border-warning",
          occupied: "bg-destructive/10 border-destructive/30 hover:border-destructive",
        };
        const statusLabels = { available: "Available", reserved: "Reserved", occupied: "Occupied" };

        return (
          <button
            key={room.id}
            onClick={() => onSelectRoom(room.id)}
            className={`relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all cursor-pointer ${statusColors[status]}`}
          >
            {room.type === "Room" ? (
              <Bed className="h-8 w-8 text-foreground/70" />
            ) : (
              <PartyPopper className="h-8 w-8 text-foreground/70" />
            )}
            <span className="font-bold text-lg text-foreground">{room.label}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              status === "available" ? "bg-success text-success-foreground" :
              status === "reserved" ? "bg-warning text-warning-foreground" :
              "bg-destructive text-destructive-foreground"
            }`}>
              {statusLabels[status]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
