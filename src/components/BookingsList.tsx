import { useState } from "react";
import { Booking } from "@/lib/types";
import { getRooms } from "@/lib/settingsStore";
import { getBookings, saveBooking, deleteBooking } from "@/lib/bookingStore";
import { getSettings } from "@/lib/settingsStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Edit, Trash2, LogIn, LogOut, FileText, Calendar, Bed, Wallet, CheckCircle2, IndianRupee, Filter } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";

interface BookingsListProps {
  onEdit: (booking: Booking) => void;
  onInvoice: (booking: Booking) => void;
  onCheckInOut?: () => void;
  refreshKey: number;
}

type DateFilter = "all" | "this-month" | "last-month" | "this-week" | "custom";

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), "dd MMM yyyy");
  } catch {
    return dateStr;
  }
}

function nightsCount(checkIn: string, checkOut: string): number {
  try {
    return Math.max(1, differenceInDays(new Date(checkOut), new Date(checkIn)));
  } catch {
    return 1;
  }
}

export default function BookingsList({ onEdit, onInvoice, onCheckInOut, refreshKey }: BookingsListProps) {
  const [dueOnly, setDueOnly] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const now = new Date();
  const allBookings = getBookings().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const rooms = getRooms();

  const filterByDate = (b: Booking): boolean => {
    const checkIn = new Date(b.checkIn).getTime();
    if (dateFilter === "all") return true;
    if (dateFilter === "this-month") {
      return now.getMonth() === new Date(b.checkIn).getMonth() && now.getFullYear() === new Date(b.checkIn).getFullYear();
    }
    if (dateFilter === "last-month") {
      const last = new Date(now.getFullYear(), now.getMonth() - 1);
      return last.getMonth() === new Date(b.checkIn).getMonth() && last.getFullYear() === new Date(b.checkIn).getFullYear();
    }
    if (dateFilter === "this-week") {
      const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0,0,0,0);
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6); weekEnd.setHours(23,59,59,999);
      return checkIn >= weekStart.getTime() && checkIn <= weekEnd.getTime();
    }
    if (dateFilter === "custom" && customFrom && customTo) {
      const from = new Date(customFrom).setHours(0,0,0,0);
      const to = new Date(customTo).setHours(23,59,59,999);
      return checkIn >= from && checkIn <= to;
    }
    return true;
  };

  let filtered = allBookings.filter(filterByDate);
  filtered = dueOnly ? filtered.filter((b) => b.amount - b.advance > 0 && b.status !== "cancelled") : filtered;
  const bookings = filtered;
  const settings = getSettings();
  const currency = settings.currency;
  const roomLabel = (id: string) => rooms.find((r) => r.id === id)?.label ?? id;

  const statusStyles: Record<Booking["status"], string> = {
    confirmed: "bg-amber-100 text-amber-800 border-amber-200",
    "checked-in": "bg-emerald-100 text-emerald-800 border-emerald-200",
    "checked-out": "bg-slate-100 text-slate-600 border-slate-200",
    cancelled: "bg-red-100 text-red-700 border-red-200",
  };

  const handleCheckIn = (b: Booking) => {
    saveBooking({ ...b, status: "checked-in" });
    toast.success(`${b.guestName} checked in`);
    onCheckInOut?.();
    window.dispatchEvent(new Event("bookings-updated"));
  };

  const handleCheckOut = (b: Booking) => {
    saveBooking({ ...b, status: "checked-out" });
    toast.success(`${b.guestName} checked out`);
    onCheckInOut?.();
    window.dispatchEvent(new Event("bookings-updated"));
  };

  const handleClear = (b: Booking) => {
    saveBooking({ ...b, advance: b.amount });
    toast.success(`Balance cleared for ${b.guestName}`);
    window.dispatchEvent(new Event("bookings-updated"));
  };

  const handleDelete = (b: Booking) => {
    if (confirm(`Delete booking for ${b.guestName}?`)) {
      deleteBooking(b.id);
      toast.success("Booking deleted");
      window.dispatchEvent(new Event("bookings-updated"));
    }
  };

  if (!allBookings.length) {
    return (
      <div className="text-center py-16 px-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <Calendar className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground font-medium">No bookings yet</p>
        <p className="text-sm text-muted-foreground mt-1">Click a room or use New Booking to get started</p>
      </div>
    );
  }

  const dueCount = allBookings.filter((b) => b.amount - b.advance > 0 && b.status !== "cancelled").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
            <SelectTrigger className="w-[160px] h-9">
              <Filter className="h-4 w-4 mr-1" />
              <SelectValue placeholder="Filter by date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All dates</SelectItem>
              <SelectItem value="this-week">This week</SelectItem>
              <SelectItem value="this-month">This month</SelectItem>
              <SelectItem value="last-month">Last month</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
          {dateFilter === "custom" && (
            <div className="flex items-center gap-1">
              <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-9 w-36" />
              <span className="text-muted-foreground">to</span>
              <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-9 w-36" />
            </div>
          )}
          <Button
            variant={dueOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setDueOnly(!dueOnly)}
            className="flex items-center gap-2"
          >
            <IndianRupee className="h-4 w-4" />
            Due only {dueCount > 0 && `(${dueCount})`}
          </Button>
        </div>
        {bookings.length < allBookings.length && (
          <span className="text-xs text-muted-foreground">Showing {bookings.length} of {allBookings.length}</span>
        )}
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-12 px-4 border border-dashed rounded-lg bg-muted/20">
          <p className="text-muted-foreground font-medium">No bookings match the selected filters</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-b-2 border-border">
                <TableHead className="font-semibold">Guest</TableHead>
                <TableHead className="font-semibold">Room</TableHead>
                <TableHead className="font-semibold">Check-in</TableHead>
                <TableHead className="font-semibold">Check-out</TableHead>
                <TableHead className="font-semibold">Nights</TableHead>
                <TableHead className="font-semibold">Amount</TableHead>
                <TableHead className="font-semibold">Advance</TableHead>
                <TableHead className="font-semibold">Due</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b, i) => {
                const nights = nightsCount(b.checkIn, b.checkOut);
                const due = b.amount - b.advance;
                return (
                  <TableRow key={b.id} className={cn("transition-colors", i % 2 === 1 && "bg-muted/20")}>
                    <TableCell className="font-medium">
                      <span className="block">{b.guestName}</span>
                      {b.phone && <span className="block text-xs text-muted-foreground">{b.phone}</span>}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <Bed className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        {roomLabel(b.room)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="block text-sm font-medium">{formatDate(b.checkIn)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="block text-sm font-medium">{formatDate(b.checkOut)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center justify-center w-8 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {nights}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1">
                        <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-semibold">{currency}{b.amount.toLocaleString()}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {currency}{b.advance.toLocaleString()}
                    </TableCell>
                    <TableCell className={cn("font-semibold", due > 0 ? "text-destructive" : "text-emerald-600")}>
                      {due > 0 ? `${currency}${due.toLocaleString()}` : "✓ Paid"}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("border font-medium capitalize text-xs", statusStyles[b.status])}>
                        {b.status.replace("-", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end flex-wrap">
                        {b.status === "confirmed" && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-emerald-100 hover:text-emerald-700" title="Check In" onClick={() => handleCheckIn(b)}>
                            <LogIn className="h-4 w-4" />
                          </Button>
                        )}
                        {b.status === "checked-in" && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-sky-100 hover:text-sky-700" title="Check Out" onClick={() => handleCheckOut(b)}>
                            <LogOut className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" title="Invoice" onClick={() => onInvoice(b)}>
                          <FileText className="h-4 w-4" />
                        </Button>
                        {due > 0 && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-emerald-100 hover:text-emerald-700" title="Clear balance" onClick={() => handleClear(b)}>
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-8 w-8" title="Edit" onClick={() => onEdit(b)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" title="Delete" onClick={() => handleDelete(b)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
