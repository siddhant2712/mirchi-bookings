import { Booking, ROOMS } from "@/lib/types";
import { getBookings, saveBooking, deleteBooking } from "@/lib/bookingStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2, LogIn, LogOut, FileText } from "lucide-react";
import { toast } from "sonner";

interface BookingsListProps {
  onEdit: (booking: Booking) => void;
  onInvoice: (booking: Booking) => void;
  refreshKey: number;
}

export default function BookingsList({ onEdit, onInvoice, refreshKey }: BookingsListProps) {
  const bookings = getBookings().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const roomLabel = (id: string) => ROOMS.find((r) => r.id === id)?.label ?? id;

  const statusVariant = (s: Booking["status"]) => {
    switch (s) {
      case "confirmed": return "secondary" as const;
      case "checked-in": return "default" as const;
      case "checked-out": return "outline" as const;
      case "cancelled": return "destructive" as const;
    }
  };

  const handleCheckIn = (b: Booking) => {
    saveBooking({ ...b, status: "checked-in" });
    toast.success(`${b.guestName} checked in`);
    window.dispatchEvent(new Event("bookings-updated"));
  };

  const handleCheckOut = (b: Booking) => {
    saveBooking({ ...b, status: "checked-out" });
    toast.success(`${b.guestName} checked out`);
    window.dispatchEvent(new Event("bookings-updated"));
  };

  const handleDelete = (b: Booking) => {
    if (confirm(`Delete booking for ${b.guestName}?`)) {
      deleteBooking(b.id);
      toast.success("Booking deleted");
      window.dispatchEvent(new Event("bookings-updated"));
    }
  };

  if (!bookings.length) {
    return <p className="text-muted-foreground text-center py-8">No bookings yet. Click a room or use "New Booking" to get started.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Guest</TableHead>
            <TableHead>Room</TableHead>
            <TableHead>Check-in</TableHead>
            <TableHead>Check-out</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Balance</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((b) => (
            <TableRow key={b.id}>
              <TableCell className="font-medium">
                {b.guestName}
                {b.phone && <span className="block text-xs text-muted-foreground">{b.phone}</span>}
              </TableCell>
              <TableCell>{roomLabel(b.room)}</TableCell>
              <TableCell>{b.checkIn}</TableCell>
              <TableCell>{b.checkOut}</TableCell>
              <TableCell>₹{b.amount}</TableCell>
              <TableCell className={b.amount - b.advance > 0 ? "text-destructive font-semibold" : ""}>
                ₹{b.amount - b.advance}
              </TableCell>
              <TableCell><Badge variant={statusVariant(b.status)}>{b.status}</Badge></TableCell>
              <TableCell>
                <div className="flex gap-1 justify-end flex-wrap">
                  {b.status === "confirmed" && (
                    <Button size="icon" variant="ghost" title="Check In" onClick={() => handleCheckIn(b)}>
                      <LogIn className="h-4 w-4" />
                    </Button>
                  )}
                  {b.status === "checked-in" && (
                    <Button size="icon" variant="ghost" title="Check Out" onClick={() => handleCheckOut(b)}>
                      <LogOut className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" title="Invoice" onClick={() => onInvoice(b)}>
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" title="Edit" onClick={() => onEdit(b)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" title="Delete" onClick={() => handleDelete(b)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
