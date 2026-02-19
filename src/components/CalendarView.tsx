import { useState, useMemo } from "react";
import { format, addDays, startOfDay } from "date-fns";
import { getBookings } from "@/lib/bookingStore";
import { getRooms } from "@/lib/settingsStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS_VISIBLE = 14;

interface CalendarViewProps {
  refreshKey?: number;
}

export default function CalendarView({ refreshKey = 0 }: CalendarViewProps) {
  const [startDate, setStartDate] = useState(() => startOfDay(new Date()));

  const dates = useMemo(() => {
    return Array.from({ length: DAYS_VISIBLE }, (_, i) =>
      addDays(startDate, i),
    );
  }, [startDate]);

  const bookings = useMemo(() => getBookings(), [refreshKey]);

  type CellPhase = "free" | "check-in" | "occupied" | "check-out";

  const getCellPhase = (
    roomId: string,
    date: Date,
  ): { phase: CellPhase; booking?: (typeof bookings)[0] } => {
    const dayStart = startOfDay(date).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;
    const b = bookings.find((bk) => {
      if (
        bk.room !== roomId ||
        bk.status === "cancelled" ||
        bk.status === "checked-out"
      )
        return false;
      const inT = new Date(bk.checkIn).getTime();
      const outT = new Date(bk.checkOut).getTime();
      // overlaps with this day
      return outT >= dayStart && inT <= dayEnd;
    });
    if (!b) return { phase: "free" };
    const inT = new Date(b.checkIn).getTime();
    const outT = new Date(b.checkOut).getTime();
    const isCheckIn = inT >= dayStart && inT <= dayEnd;
    const isCheckOut = outT - 1 >= dayStart && outT - 1 <= dayEnd;
    if (isCheckIn) return { phase: "check-in", booking: b };
    if (isCheckOut) return { phase: "check-out", booking: b };
    return { phase: "occupied", booking: b };
  };

  const goPrev = () => setStartDate((d) => addDays(d, -DAYS_VISIBLE));
  const goNext = () => setStartDate((d) => addDays(d, DAYS_VISIBLE));
  const goToday = () => setStartDate(startOfDay(new Date()));

  return (
    <Card className="rounded-xl border border-border/80 shadow-sm shadow-black/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg">Booking Calendar</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goPrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToday}>
              <CalendarIcon className="h-4 w-4 mr-1" /> Today
            </Button>
            <Button variant="outline" size="sm" onClick={goNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {format(dates[0], "MMM d")} –{" "}
              {format(dates[dates.length - 1], "MMM d, yyyy")}
            </span>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded bg-emerald-500/40 border border-emerald-600/50" />{" "}
                Check-in
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded bg-amber-500/40 border border-amber-600/50" />{" "}
                Occupied
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded bg-sky-500/40 border border-sky-600/50" />{" "}
                Check-out
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
          <table className="w-full border-collapse text-sm min-w-max">
            <thead>
              <tr className="border-b bg-muted/50 sticky top-0 z-10">
                <th className="text-left p-2 font-semibold w-28 min-w-[7rem] sticky left-0 z-20 bg-muted border-r whitespace-nowrap">
                  Room
                </th>
                {dates.map((d) => (
                  <th
                    key={d.toISOString()}
                    className={cn(
                      "text-center p-2 font-medium min-w-[5rem] border-b border-r last:border-r-0",
                      d.toDateString() === new Date().toDateString() &&
                        "bg-primary/10",
                    )}
                  >
                    {format(d, "EEE")}
                    <span className="block text-xs font-normal text-muted-foreground">
                      {format(d, "d MMM")}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {getRooms().map((room) => (
                <tr key={room.id} className="border-b hover:bg-muted/30">
                  <td className="sticky left-0 z-10 p-2 font-medium border-r bg-card whitespace-nowrap">
                    {room.label}
                  </td>
                  {dates.map((d) => {
                    const { phase, booking } = getCellPhase(room.id, d);
                    const isToday =
                      d.toDateString() === new Date().toDateString();
                    const phaseStyles = {
                      free: "",
                      "check-in":
                        "bg-emerald-500/20 border-l-2 border-l-emerald-500",
                      occupied: "bg-amber-500/15 border-l-2 border-l-amber-500",
                      "check-out": "bg-sky-500/20 border-l-2 border-l-sky-500",
                    };
                    return (
                      <td
                        key={d.toISOString()}
                        className={cn(
                          "p-2 border-r last:border-r-0 align-top min-w-[5rem]",
                          isToday && "bg-primary/5",
                          phaseStyles[phase],
                        )}
                      >
                        {phase === "free" ? (
                          <span className="text-muted-foreground">—</span>
                        ) : booking ? (
                          <div className="space-y-0.5">
                            <div
                              className="text-xs font-medium truncate max-w-[6rem]"
                              title={`${booking.guestName} • ${booking.checkIn} to ${booking.checkOut} (${phase})`}
                            >
                              {booking.guestName}
                            </div>
                            {phase === "check-in" && (
                              <div className="text-[10px] text-muted-foreground">
                                in: {format(new Date(booking.checkIn), "HH:mm")}
                              </div>
                            )}
                            {phase === "check-out" && (
                              <div className="text-[10px] text-muted-foreground">
                                out:{" "}
                                {format(new Date(booking.checkOut), "HH:mm")}
                              </div>
                            )}
                            {phase === "occupied" && (
                              <div className="text-[10px] text-muted-foreground">
                                occupied
                              </div>
                            )}
                          </div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
