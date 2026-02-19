import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  Receipt,
  Calculator,
  Save,
  RotateCcw,
  TrendingUp,
  Bed,
  Plus,
  Trash2,
} from "lucide-react";
import {
  getSettings,
  saveSettings,
  resetSettings,
  getRooms,
  DEFAULT_ROOMS,
  type AppSettings,
  type RoomConfig,
} from "@/lib/settingsStore";
import { getBookings } from "@/lib/bookingStore";
import { toast } from "sonner";

export default function SettingsMenu() {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [rooms, setRooms] = useState<RoomConfig[]>(() => getRooms());
  const [revenueFrom, setRevenueFrom] = useState<string>("");
  const [revenueTo, setRevenueTo] = useState<string>("");

  useEffect(() => {
    const s = getSettings();
    setSettings(s);
    setRooms(getRooms());
  }, []);

  const update = (partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const updateRoomRate = (roomId: string, value: number) => {
    setSettings((prev) => ({
      ...prev,
      roomRates: { ...(prev.roomRates || {}), [roomId]: value },
    }));
  };

  const handleSave = () => {
    saveSettings({ ...settings, rooms });
    toast.success("Settings saved!");
    // Dispatch event so RoomGrid refreshes
    window.dispatchEvent(new Event("bookings-updated"));
  };

  const handleReset = () => {
    if (confirm("Reset all settings to defaults?")) {
      resetSettings();
      const s = getSettings();
      setSettings(s);
      setRooms(getRooms());
      toast.success("Settings reset to defaults.");
    }
  };

  // Room management
  const addRoom = () => {
    const newId = `R${Date.now().toString(36).toUpperCase().slice(-4)}`;
    setRooms((prev) => [
      ...prev,
      { id: newId, label: `Room ${prev.length + 1}`, type: "Room" },
    ]);
  };

  const updateRoom = (idx: number, field: keyof RoomConfig, value: string) => {
    setRooms((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const removeRoom = (idx: number) => {
    setRooms((prev) => prev.filter((_, i) => i !== idx));
  };

  const resetRoomsToDefault = () => {
    setRooms(DEFAULT_ROOMS);
  };

  // Revenue calculator
  const bookings = getBookings().filter((b) => b.status !== "cancelled");
  const fromDate = revenueFrom ? new Date(revenueFrom).getTime() : null;
  const toDate = revenueTo ? new Date(revenueTo).getTime() : null;
  const filtered =
    fromDate && toDate
      ? bookings.filter((b) => {
          const checkIn = new Date(b.checkIn).getTime();
          return checkIn >= fromDate && checkIn <= toDate;
        })
      : bookings;
  const totalRevenue = filtered.reduce((sum, b) => sum + b.amount, 0);
  const totalTaxRate =
    ((settings.cgstPercent || 0) + (settings.sgstPercent || 0)) / 100;
  const revenueExTax = settings.showTaxInRevenue
    ? totalRevenue / (1 + totalTaxRate)
    : totalRevenue;
  const taxAmount = totalRevenue - revenueExTax;
  const cgstAmount = revenueExTax * (settings.cgstPercent / 100);
  const sgstAmount = revenueExTax * (settings.sgstPercent / 100);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Settings</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" /> Reset
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" /> Save
          </Button>
        </div>
      </div>

      {/* Room Configuration */}
      <Card className="rounded-xl border border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bed className="h-4 w-4" /> Room Configuration
          </CardTitle>
          <CardDescription>
            Customize room names, types, and rates per day. Changes take effect
            after saving.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {rooms.map((room, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={room.label}
                  onChange={(e) => updateRoom(idx, "label", e.target.value)}
                  placeholder="Room name"
                  className="flex-1 h-9"
                />
                <Input
                  value={room.type}
                  onChange={(e) => updateRoom(idx, "type", e.target.value)}
                  placeholder="Type"
                  className="w-28 h-9"
                />
                <Input
                  type="number"
                  min={0}
                  step={50}
                  value={settings.roomRates?.[room.id] ?? ""}
                  onChange={(e) =>
                    updateRoomRate(room.id, parseFloat(e.target.value) || 0)
                  }
                  placeholder="Rate/day"
                  className="w-28 h-9"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 shrink-0 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => removeRoom(idx)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="text-xs text-muted-foreground">
            Name · Type · Rate per day (₹)
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={addRoom}>
              <Plus className="h-4 w-4 mr-1" /> Add Room
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetRoomsToDefault}
            >
              Reset to defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Check-out time */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" /> Default Check-out Time
          </CardTitle>
          <CardDescription>
            Default time of day for check-out (e.g. 11:00).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>Check-out time</Label>
          <Input
            type="time"
            value={settings.defaultCheckOutTime}
            onChange={(e) => update({ defaultCheckOutTime: e.target.value })}
            className="w-40"
          />
        </CardContent>
      </Card>

      {/* Check-in time */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" /> Default Check-in Time
          </CardTitle>
          <CardDescription>
            Default time of day for check-in (e.g. 14:00).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>Check-in time</Label>
          <Input
            type="time"
            value={settings.defaultCheckInTime}
            onChange={(e) => update({ defaultCheckInTime: e.target.value })}
            className="w-40"
          />
        </CardContent>
      </Card>

      {/* Tax & Currency */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" /> Tax & Currency
          </CardTitle>
          <CardDescription>
            Used in revenue calculator and invoices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Currency symbol</Label>
              <Input
                value={settings.currency}
                onChange={(e) => update({ currency: e.target.value })}
                placeholder="₹"
                maxLength={4}
                className="w-24"
              />
            </div>
            <div />
            <div className="space-y-2">
              <Label>CGST name / label</Label>
              <Input
                value={settings.cgstLabel}
                onChange={(e) => update({ cgstLabel: e.target.value })}
                placeholder="CGST"
                className="w-40"
              />
            </div>
            <div className="space-y-2">
              <Label>CGST (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={settings.cgstPercent}
                onChange={(e) =>
                  update({ cgstPercent: parseFloat(e.target.value) || 0 })
                }
                className="w-24"
              />
            </div>
            <div className="space-y-2">
              <Label>SGST name / label</Label>
              <Input
                value={settings.sgstLabel}
                onChange={(e) => update({ sgstLabel: e.target.value })}
                placeholder="SGST"
                className="w-40"
              />
            </div>
            <div className="space-y-2">
              <Label>SGST (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={settings.sgstPercent}
                onChange={(e) =>
                  update({ sgstPercent: parseFloat(e.target.value) || 0 })
                }
                className="w-24"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label className="text-muted-foreground">Total Tax</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  readOnly
                  value={
                    (settings.cgstPercent || 0) + (settings.sgstPercent || 0)
                  }
                  className="w-24 bg-muted/50"
                />
                <span className="text-sm text-muted-foreground">
                  % (auto-calculated)
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue calculator */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4" /> Revenue Calculator
          </CardTitle>
          <CardDescription>
            Total revenue from bookings. Filter by check-in date and see
            CGST/SGST breakdown.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>From date</Label>
              <Input
                type="date"
                value={revenueFrom}
                onChange={(e) => setRevenueFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>To date</Label>
              <Input
                type="date"
                value={revenueTo}
                onChange={(e) => setRevenueTo(e.target.value)}
              />
            </div>
          </div>
          <Separator />
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Revenue (ex tax)</span>
              <span>
                {settings.currency}
                {revenueExTax.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>
                {settings.cgstLabel} ({settings.cgstPercent}%)
              </span>
              <span>
                {settings.currency}
                {cgstAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>
                {settings.sgstLabel} ({settings.sgstPercent}%)
              </span>
              <span>
                {settings.currency}
                {sgstAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground border-t pt-1">
              <span>
                Total Tax (
                {(settings.cgstPercent || 0) + (settings.sgstPercent || 0)}
                %)
              </span>
              <span>
                {settings.currency}
                {taxAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between font-semibold text-base pt-1">
              <span className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" /> Total
              </span>
              <span>
                {settings.currency}
                {totalRevenue.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              {filtered.length} booking{filtered.length !== 1 ? "s" : ""}
              {(revenueFrom || revenueTo) && " in selected range"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Invoice format */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" /> Invoice Format (Defaults)
          </CardTitle>
          <CardDescription>
            Default text and format for generated invoices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Restaurant / Business name</Label>
            <Input
              value={settings.businessName}
              onChange={(e) => update({ businessName: e.target.value })}
              placeholder="e.g. Mirchi Restaurant"
            />
          </div>
          <div className="space-y-2">
            <Label>Restaurant GST number (on invoice)</Label>
            <Input
              value={settings.businessGstNumber ?? ""}
              onChange={(e) => update({ businessGstNumber: e.target.value })}
              placeholder="GSTIN (e.g. 29XXXXX1234X1ZX)"
            />
          </div>
          <div className="space-y-2">
            <Label>Restaurant location / address (on invoice)</Label>
            <Input
              value={settings.businessAddress ?? ""}
              onChange={(e) => update({ businessAddress: e.target.value })}
              placeholder="Full address"
            />
          </div>
          <div className="space-y-2">
            <Label>Restaurant phone number (on invoice)</Label>
            <Input
              value={settings.businessContact ?? ""}
              onChange={(e) => update({ businessContact: e.target.value })}
              placeholder="Phone number"
            />
          </div>
          <div className="space-y-2">
            <Label>Invoice title</Label>
            <Input
              value={settings.invoiceTitle}
              onChange={(e) => update({ invoiceTitle: e.target.value })}
              placeholder="Tax Invoice"
            />
          </div>
          <div className="space-y-2">
            <Label>Invoice footer text</Label>
            <Textarea
              value={settings.invoiceFooter}
              onChange={(e) => update({ invoiceFooter: e.target.value })}
              placeholder="Thank you for staying with us!"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
