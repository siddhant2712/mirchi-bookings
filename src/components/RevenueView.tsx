import { useState, useMemo } from "react";
import { getBookings } from "@/lib/bookingStore";
import { getSettings } from "@/lib/settingsStore";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COLORS = [
  "#10b981",
  "#ef4444",
  "#f59e0b",
  "#3b82f6",
  "#8b5cf6",
  "#f97316",
];

export default function RevenueView() {
  const settings = getSettings();
  const currency = settings.currency || "₹";
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [groupBy, setGroupBy] = useState<"weekday" | "month">("weekday");

  const bookings = getBookings().filter((b) => b.status !== "cancelled");

  const filtered = useMemo(() => {
    const fromT = from ? new Date(from).setHours(0, 0, 0, 0) : null;
    const toT = to ? new Date(to).setHours(23, 59, 59, 999) : null;
    // Include bookings that overlap the selected range (not just those with checkIn inside)
    return bookings.filter((b) => {
      if (!b.checkIn) return false;
      const ci = new Date(b.checkIn).getTime();
      const co = b.checkOut ? new Date(b.checkOut).getTime() : ci;
      if (fromT && toT) {
        // overlap if booking end >= from && booking start <= to
        return co >= fromT && ci <= toT;
      }
      if (fromT) {
        return co >= fromT;
      }
      if (toT) {
        return ci <= toT;
      }
      return true;
    });
  }, [bookings, from, to]);

  const totalRevenue = filtered.reduce((s, b) => s + (b.amount || 0), 0);
  const totalAdvance = filtered.reduce((s, b) => s + (b.advance || 0), 0);
  const totalDue = filtered.reduce(
    (s, b) => s + Math.max(0, (b.amount || 0) - (b.advance || 0)),
    0,
  );

  // Pie: Paid vs Due
  const piePaidDue = [
    { name: "Paid", value: totalAdvance },
    { name: "Due", value: totalDue },
  ];

  // Bar: revenue by weekday or month
  const barData = useMemo(() => {
    if (groupBy === "weekday") {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const map = new Array(7).fill(0);
      filtered.forEach((b) => {
        const d = new Date(b.checkIn).getDay();
        map[d] += b.amount || 0;
      });
      return days.map((d, i) => ({ name: d, revenue: map[i] }));
    } else {
      const map = new Map<string, number>();
      filtered.forEach((b) => {
        const dt = new Date(b.checkIn);
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
        map.set(key, (map.get(key) || 0) + (b.amount || 0));
      });
      return Array.from(map.entries()).map(([k, v]) => ({
        name: k,
        revenue: v,
      }));
    }
  }, [filtered, groupBy]);

  // Timeline pie: revenue by room within timeline
  const timelinePie = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((b) => {
      map.set(b.room, (map.get(b.room) || 0) + (b.amount || 0));
    });
    return Array.from(map.entries()).map(([k, v]) => ({ name: k, value: v }));
  }, [filtered]);

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>From</Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <Label>To</Label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div>
          <Label>Group By</Label>
          <Select onValueChange={(v) => setGroupBy(v as any)}>
            <SelectTrigger className="w-full h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekday">Day of week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <h4 className="font-semibold">Paid vs Due</h4>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={piePaidDue}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                />
                {piePaidDue.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
                <Tooltip
                  formatter={(v: number) => `${currency}${v.toFixed(2)}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-sm">
            <div>
              Total Revenue: {currency}
              {totalRevenue.toFixed(2)}
            </div>
            <div>
              Paid (advances): {currency}
              {totalAdvance.toFixed(2)}
            </div>
            <div>
              Due (balance): {currency}
              {totalDue.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h4 className="font-semibold">
            Revenue by {groupBy === "weekday" ? "Day" : "Month"}
          </h4>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(v: number) => `${currency}${v.toFixed(2)}`}
                />
                <Bar dataKey="revenue" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h4 className="font-semibold">Timeline revenue (by room)</h4>
        <div className="grid grid-cols-2 gap-4">
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={timelinePie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                />
                {timelinePie.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
                <Tooltip
                  formatter={(v: number) => `${currency}${v.toFixed(2)}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-sm">
            <div>
              Total: {currency}
              {totalRevenue.toFixed(2)}
            </div>
            <div>
              Period: {from || "—"} to {to || "—"}
            </div>
            <div className="mt-2">Rooms included: {timelinePie.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
