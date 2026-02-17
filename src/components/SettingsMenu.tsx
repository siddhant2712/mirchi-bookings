import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { getSettings, saveSettings, resetSettings, type AppSettings } from "@/lib/settingsStore";
import { getBookings } from "@/lib/bookingStore";
import { ROOMS } from "@/lib/types";
import { toast } from "sonner";

export default function SettingsMenu() {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [revenueFrom, setRevenueFrom] = useState<string>("");
  const [revenueTo, setRevenueTo] = useState<string>("");

  useEffect(() => {
    setSettings(getSettings());
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
    saveSettings(settings);
    toast.success("Settings saved!");
  };

  const handleReset = () => {
    if (confirm("Reset all settings to defaults?")) {
      resetSettings();
      setSettings(getSettings());
      toast.success("Settings reset to defaults.");
    }
  };

  // Revenue calculator: sum booking amounts in date range (only completed/active)
  const bookings = getBookings().filter(
    (b) => b.status !== "cancelled"
  );
  const fromDate = revenueFrom ? new Date(revenueFrom).getTime() : null;
  const toDate = revenueTo ? new Date(revenueTo).getTime() : null;
  const filtered = fromDate && toDate
    ? bookings.filter((b) => {
        const checkIn = new Date(b.checkIn).getTime();
        return checkIn >= fromDate && checkIn <= toDate;
      })
    : bookings;
  const totalRevenue = filtered.reduce((sum, b) => sum + b.amount, 0);
  const taxRate = settings.taxRatePercent / 100;
  const revenueExTax = settings.showTaxInRevenue ? totalRevenue / (1 + taxRate) : totalRevenue;
  const taxAmount = totalRevenue - revenueExTax;

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

      {/* Room rates per day */}
      <Card className="rounded-xl border border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bed className="h-4 w-4" /> Room Rate (per day)
          </CardTitle>
          <CardDescription>
            Set amount per day for each room. Total booking amount is calculated as rate × nights when creating a booking.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ROOMS.map((room) => (
              <div key={room.id} className="space-y-1">
                <Label className="text-xs">{room.label}</Label>
                <Input
                  type="number"
                  min={0}
                  step={50}
                  value={settings.roomRates?.[room.id] ?? ""}
                  onChange={(e) => updateRoomRate(room.id, parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="h-9"
                />
              </div>
            ))}
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
            Default time of day for check-out (e.g. 11:00). Used as reference when creating bookings.
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

      {/* Revenue calculator */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4" /> Revenue Calculator
          </CardTitle>
          <CardDescription>
            Total revenue from bookings. Optionally filter by check-in date range and see tax breakdown.
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
          <div className="flex items-center gap-2">
            <Switch
              id="show-tax"
              checked={settings.showTaxInRevenue}
              onCheckedChange={(v) => update({ showTaxInRevenue: v })}
            />
            <Label htmlFor="show-tax">Show tax breakdown</Label>
          </div>
          <Separator />
          <div className="space-y-1 text-sm">
            {settings.showTaxInRevenue && (
              <>
                <div className="flex justify-between text-muted-foreground">
                  <span>Revenue (ex tax)</span>
                  <span>{settings.currency}{revenueExTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax ({settings.taxRatePercent}%)</span>
                  <span>{settings.currency}{taxAmount.toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between font-semibold text-base pt-1">
              <span className="flex items-center gap-1"><TrendingUp className="h-4 w-4" /> Total</span>
              <span>{settings.currency}{totalRevenue.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              {filtered.length} booking{filtered.length !== 1 ? "s" : ""}
              {(revenueFrom || revenueTo) && " in selected range"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tax rate (for revenue calc) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" /> Tax & Currency
          </CardTitle>
          <CardDescription>Used in revenue calculator and invoices.</CardDescription>
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
            <div className="space-y-2">
              <Label>Tax rate (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={settings.taxRatePercent}
                onChange={(e) => update({ taxRatePercent: parseFloat(e.target.value) || 0 })}
                className="w-24"
              />
            </div>
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
            Default text and format for generated invoices. You can still edit per-invoice when printing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CardDescription className="mb-2">
            These appear on every invoice. Fill Restaurant/Business details and they will show on the printed bill.
          </CardDescription>
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
