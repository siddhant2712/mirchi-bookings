import { useState } from "react";
import { Booking } from "@/lib/types";
import { saveBooking, isRoomAvailable } from "@/lib/bookingStore";
import { getSettings, getRoomRate, getRooms } from "@/lib/settingsStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface BookingFormProps {
  initialRoom?: string;
  editBooking?: Booking | null;
  onDone: () => void;
}

export default function BookingForm({
  initialRoom,
  editBooking,
  onDone,
}: BookingFormProps) {
  const ROOMS = getRooms();
  const [guestName, setGuestName] = useState(editBooking?.guestName ?? "");
  const [phone, setPhone] = useState(editBooking?.phone ?? "");
  const [selectedRooms, setSelectedRooms] = useState<string[]>(
    editBooking ? [editBooking.room] : initialRoom ? [initialRoom] : [],
  );
  const [checkIn, setCheckIn] = useState<Date | undefined>(
    editBooking?.checkIn ? new Date(editBooking.checkIn) : new Date(),
  );
  const [checkOut, setCheckOut] = useState<Date | undefined>(
    editBooking?.checkOut ? new Date(editBooking.checkOut) : undefined,
  );
  const [amount, setAmount] = useState(editBooking?.amount?.toString() ?? "");
  const [advance, setAdvance] = useState(
    editBooking?.advance?.toString() ?? "0",
  );
  const [notes, setNotes] = useState(editBooking?.notes ?? "");
  const [guestCompanyName, setGuestCompanyName] = useState(
    editBooking?.guestCompanyName ?? "",
  );
  const [guestGstNumber, setGuestGstNumber] = useState(
    editBooking?.guestGstNumber ?? "",
  );

  const isEditing = !!editBooking;

  const nights =
    checkIn && checkOut && checkOut > checkIn
      ? Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86400000)
      : 0;
  const suggestedTotal =
    !isEditing && nights > 0 && selectedRooms.length > 0
      ? selectedRooms.reduce((sum, rid) => sum + getRoomRate(rid) * nights, 0)
      : 0;
  const currency = getSettings().currency;
  const settings = getSettings();

  const toggleRoom = (roomId: string) => {
    if (isEditing) return; // Can't change room when editing
    setSelectedRooms((prev) =>
      prev.includes(roomId)
        ? prev.filter((r) => r !== roomId)
        : [...prev, roomId],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !guestName ||
      !checkIn ||
      !checkOut ||
      !amount ||
      selectedRooms.length === 0
    ) {
      toast.error(
        "Please fill all required fields and select at least one room",
      );
      return;
    }
    if (checkOut <= checkIn) {
      toast.error("Check-out must be after check-in");
      return;
    }

    // Include default times from settings when storing datetimes
    const defaultIn = getSettings().defaultCheckInTime || "14:00";
    const defaultOut = getSettings().defaultCheckOutTime || "11:00";
    const checkInStr = `${format(checkIn, "yyyy-MM-dd")}T${defaultIn}`;
    const checkOutStr = `${format(checkOut, "yyyy-MM-dd")}T${defaultOut}`;
    const perRoomAmount = parseFloat(amount) / selectedRooms.length;
    const perRoomAdvance = parseFloat(advance || "0") / selectedRooms.length;

    // Check availability for all selected rooms
    for (const roomId of selectedRooms) {
      if (!isRoomAvailable(roomId, checkInStr, checkOutStr, editBooking?.id)) {
        const label = ROOMS.find((r) => r.id === roomId)?.label ?? roomId;
        toast.error(`${label} is not available for selected dates`);
        return;
      }
    }

    if (isEditing) {
      const booking: Booking = {
        ...editBooking!,
        guestName,
        phone,
        room: selectedRooms[0],
        checkIn: checkInStr,
        checkOut: checkOutStr,
        amount: parseFloat(amount),
        advance: parseFloat(advance || "0"),
        notes,
        guestCompanyName: guestCompanyName || undefined,
        guestGstNumber: guestGstNumber || undefined,
      };
      saveBooking(booking);
      toast.success("Booking updated!");
    } else {
      for (const roomId of selectedRooms) {
        const booking: Booking = {
          id: crypto.randomUUID(),
          guestName,
          phone,
          room: roomId,
          checkIn: checkInStr,
          checkOut: checkOutStr,
          amount:
            selectedRooms.length === 1
              ? parseFloat(amount)
              : Math.round(perRoomAmount),
          advance:
            selectedRooms.length === 1
              ? parseFloat(advance || "0")
              : Math.round(perRoomAdvance),
          status: "confirmed",
          createdAt: new Date().toISOString(),
          notes,
          guestCompanyName: guestCompanyName || undefined,
          guestGstNumber: guestGstNumber || undefined,
        };
        saveBooking(booking);
      }
      toast.success(
        selectedRooms.length > 1
          ? `${selectedRooms.length} rooms booked for ${guestName}!`
          : "Booking created!",
      );
    }

    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Guest Name *</Label>
          <Input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Full name"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Company name (for invoice)</Label>
          <Input
            value={guestCompanyName}
            onChange={(e) => setGuestCompanyName(e.target.value)}
            placeholder="Customer company name"
          />
        </div>
        <div className="space-y-2">
          <Label>GST number (for invoice)</Label>
          <Input
            value={guestGstNumber}
            onChange={(e) => setGuestGstNumber(e.target.value)}
            placeholder="Customer GST No."
          />
        </div>
      </div>

      {/* Room selection */}
      <div className="space-y-2">
        <Label>{isEditing ? "Room" : "Select Rooms *"}</Label>
        {isEditing ? (
          <p className="text-sm text-muted-foreground">
            {ROOMS.find((r) => r.id === selectedRooms[0])?.label}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {ROOMS.map((room) => (
              <label
                key={room.id}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer transition-colors text-sm",
                  selectedRooms.includes(room.id)
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-muted-foreground/40",
                )}
              >
                <Checkbox
                  checked={selectedRooms.includes(room.id)}
                  onCheckedChange={() => toggleRoom(room.id)}
                />
                {room.label}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Date pickers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Check-in *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !checkIn && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {checkIn ? format(checkIn, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={checkIn}
                onSelect={setCheckIn}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>Check-out *</Label>
          <p className="text-xs text-muted-foreground">
            Default check-out time: {getSettings().defaultCheckOutTime} (set in
            Settings)
          </p>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !checkOut && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {checkOut ? format(checkOut, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={checkOut}
                onSelect={setCheckOut}
                disabled={(date) => (checkIn ? date <= checkIn : false)}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>
            Total Amount ({currency}) *
            {!isEditing && selectedRooms.length > 1
              ? ` (split across ${selectedRooms.length} rooms)`
              : ""}
          </Label>
          {!isEditing && suggestedTotal > 0 && (
            <p className="text-xs text-muted-foreground">
              From rates:{" "}
              {selectedRooms
                .map((rid) => {
                  const r = ROOMS.find((x) => x.id === rid);
                  const rate = getRoomRate(rid);
                  return rate ? `${r?.label} ${currency}${rate}/day` : null;
                })
                .filter(Boolean)
                .join(", ")}{" "}
              × {nights} night{nights !== 1 ? "s" : ""} = {currency}
              {suggestedTotal}
            </p>
          )}
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={suggestedTotal > 0 ? String(suggestedTotal) : "0"}
            onFocus={(e) => {
              if (!amount && suggestedTotal > 0)
                setAmount(String(suggestedTotal));
            }}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Advance Paid ({currency})</Label>
          <Input
            type="number"
            value={advance}
            onChange={(e) => setAdvance(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Special requests..."
          rows={2}
        />
      </div>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit">
          {isEditing
            ? "Update Booking"
            : selectedRooms.length > 1
              ? `Book ${selectedRooms.length} Rooms`
              : "Book Now"}
        </Button>
      </div>
    </form>
  );
}
