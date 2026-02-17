import { useState } from "react";
import { Booking, ROOMS } from "@/lib/types";
import { saveBooking, isRoomAvailable } from "@/lib/bookingStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface BookingFormProps {
  initialRoom?: string;
  editBooking?: Booking | null;
  onDone: () => void;
}

export default function BookingForm({ initialRoom, editBooking, onDone }: BookingFormProps) {
  const [guestName, setGuestName] = useState(editBooking?.guestName ?? "");
  const [phone, setPhone] = useState(editBooking?.phone ?? "");
  const [room, setRoom] = useState(editBooking?.room ?? initialRoom ?? "101");
  const [checkIn, setCheckIn] = useState(editBooking?.checkIn ?? new Date().toISOString().split("T")[0]);
  const [checkOut, setCheckOut] = useState(editBooking?.checkOut ?? "");
  const [amount, setAmount] = useState(editBooking?.amount?.toString() ?? "");
  const [advance, setAdvance] = useState(editBooking?.advance?.toString() ?? "0");
  const [notes, setNotes] = useState(editBooking?.notes ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !checkIn || !checkOut || !amount) {
      toast.error("Please fill all required fields");
      return;
    }
    if (new Date(checkOut) <= new Date(checkIn)) {
      toast.error("Check-out must be after check-in");
      return;
    }
    if (!isRoomAvailable(room, checkIn, checkOut, editBooking?.id)) {
      toast.error("Room not available for selected dates");
      return;
    }

    const booking: Booking = {
      id: editBooking?.id ?? crypto.randomUUID(),
      guestName,
      phone,
      room,
      checkIn,
      checkOut,
      amount: parseFloat(amount),
      advance: parseFloat(advance || "0"),
      status: editBooking?.status ?? "confirmed",
      createdAt: editBooking?.createdAt ?? new Date().toISOString(),
      notes,
    };

    saveBooking(booking);
    toast.success(editBooking ? "Booking updated!" : "Booking created!");
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Guest Name *</Label>
          <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Full name" required />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
        </div>
        <div className="space-y-2">
          <Label>Room *</Label>
          <Select value={room} onValueChange={setRoom}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROOMS.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Check-in *</Label>
          <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Check-out *</Label>
          <Input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Total Amount (₹) *</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" required />
        </div>
        <div className="space-y-2">
          <Label>Advance Paid (₹)</Label>
          <Input type="number" value={advance} onChange={(e) => setAdvance(e.target.value)} placeholder="0" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special requests..." rows={2} />
      </div>
      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
        <Button type="submit">{editBooking ? "Update Booking" : "Book Now"}</Button>
      </div>
    </form>
  );
}
