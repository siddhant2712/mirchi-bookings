import { getRooms } from "@/lib/settingsStore";
import { getBookings } from "@/lib/bookingStore";
import { Bed, PartyPopper } from "lucide-react";

interface RoomGridProps {
  onSelectRoom: (roomId: string) => void;
  selectedDate?: Date;
}

export default function RoomGrid({
  onSelectRoom,
  selectedDate,
}: RoomGridProps) {
  const bookings = getBookings();
  const rooms = getRooms();
  const targetDate = selectedDate
    ? new Date(selectedDate.setHours(0, 0, 0, 0))
    : new Date(new Date().setHours(0, 0, 0, 0));

  const getStatus = (roomId: string) => {
    const active = bookings.find((b) => {
      if (b.room !== roomId) return false;
      if (b.status === "checked-out" || b.status === "cancelled") return false;
      try {
        const inDate = new Date(b.checkIn);
        const outDate = new Date(b.checkOut);
        inDate.setHours(0, 0, 0, 0);
        outDate.setHours(0, 0, 0, 0);
        return (
          inDate.getTime() <= targetDate.getTime() &&
          outDate.getTime() > targetDate.getTime()
        );
      } catch {
        return false;
      }
    });
    if (active?.status === "checked-in") return "occupied";
    if (active?.status === "confirmed") return "reserved";
    return "available";
  };

  const getGuestName = (roomId: string) => {
    const active = bookings.find(
      (b) =>
        b.room === roomId &&
        b.status !== "checked-out" &&
        b.status !== "cancelled" &&
        b.checkIn <= targetDate &&
        b.checkOut > targetDate,
    );
    return active?.guestName;
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {rooms.map((room) => {
        const status = getStatus(room.id);
        const guest = getGuestName(room.id);
        const statusColors = {
          available: "bg-success/10 border-success/30 hover:border-success",
          reserved: "bg-warning/10 border-warning/30 hover:border-warning",
          occupied:
            "bg-destructive/10 border-destructive/30 hover:border-destructive",
        };
        const statusLabels = {
          available: "Available",
          reserved: "Reserved",
          occupied: "Occupied",
        };

        return (
          <button
            key={room.id}
            onClick={() => onSelectRoom(room.id)}
            className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-5 transition-all cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.02] ${statusColors[status]}`}
          >
            {room.type === "Room" ? (
              <Bed className="h-8 w-8 text-foreground/70" />
            ) : (
              <PartyPopper className="h-8 w-8 text-foreground/70" />
            )}
            <span className="font-bold text-base text-foreground">
              {room.label}
            </span>
            {guest && (
              <span className="text-xs text-foreground/60 truncate max-w-full">
                {guest}
              </span>
            )}
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                status === "available"
                  ? "bg-success text-success-foreground"
                  : status === "reserved"
                    ? "bg-warning text-warning-foreground"
                    : "bg-destructive text-destructive-foreground"
              }`}
            >
              {statusLabels[status]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
