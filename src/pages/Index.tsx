import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Download,
  Plus,
  Hotel,
  CalendarIcon,
  LayoutDashboard,
  Settings,
  FileText,
  CalendarDays,
  ListChecks,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import RoomGrid from "@/components/RoomGrid";
import BookingForm from "@/components/BookingForm";
import BookingsList from "@/components/BookingsList";
import InvoiceView from "@/components/InvoiceView";
import RevenueView from "@/components/RevenueView";
import SettingsMenu from "@/components/SettingsMenu";
import SimpleInvoiceGenerator from "@/components/SimpleInvoiceGenerator";
import CalendarView from "@/components/CalendarView";
import { Booking } from "@/lib/types";
import {
  exportBookingsJSON,
  downloadFile,
  getBookings,
  getDeletedBookings,
  clearAllBookings,
} from "@/lib/bookingStore";
import { getSettings } from "@/lib/settingsStore";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const Index = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string | undefined>();
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [invoiceBooking, setInvoiceBooking] = useState<Booking | null>(null);
  const [showSimpleInvoice, setShowSimpleInvoice] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState("dashboard");
  const [timelineOption, setTimelineOption] = useState<
    "today" | "yesterday" | "custom"
  >("today");
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [showTimelineDialog, setShowTimelineDialog] = useState(false);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const switchToBookings = useCallback(() => setActiveTab("bookings"), []);

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoom(roomId);
    setEditBooking(null);
    setShowForm(true);
  };

  const handleEdit = (booking: Booking) => {
    setEditBooking(booking);
    setSelectedRoom(undefined);
    setShowForm(true);
  };

  const handleFormDone = () => {
    setShowForm(false);
    setEditBooking(null);
    setSelectedRoom(undefined);
    refresh();
  };

  useEffect(() => {
    window.addEventListener("bookings-updated", refresh);
    return () => window.removeEventListener("bookings-updated", refresh);
  }, [refresh]);

  const handleExportPDF = () => {
    const activeBookings = getBookings();
    const deletedBookings = getDeletedBookings();
    if (!activeBookings.length && !deletedBookings.length) {
      toast.error("No bookings to export");
      return;
    }

    let startDate: Date;
    let endDate: Date;

    if (timelineOption === "today") {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    } else if (timelineOption === "yesterday") {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setDate(endDate.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // custom
      if (!customStart || !customEnd) {
        setShowTimelineDialog(true);
        toast.info("Choose custom start/end dates");
        return;
      }
      startDate = new Date(customStart);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999);
    }

    const filteredActive = activeBookings.filter((b) => {
      const ci = new Date(b.checkIn);
      const co = new Date(b.checkOut);
      return (
        co.getTime() >= startDate.getTime() && ci.getTime() <= endDate.getTime()
      );
    });

    const includeDeleted = confirm(
      "Include deleted bookings in the PDF export? Click OK to include, Cancel to exclude.",
    );
    let combined = [...filteredActive];
    if (includeDeleted) {
      const deleted = getDeletedBookings();
      const filteredDeleted = deleted.filter((b) => {
        const ci = new Date(b.checkIn);
        const co = new Date(b.checkOut);
        return (
          co.getTime() >= startDate.getTime() &&
          ci.getTime() <= endDate.getTime()
        );
      });
      // mark deleted entries so status column shows it's deleted
      filteredDeleted.forEach((d) => {
        if (!String(d.status).toLowerCase().includes("deleted")) {
          (d as any).status = `${d.status} (deleted)`;
        }
      });
      combined = [...combined, ...filteredDeleted];
    }

    if (!combined.length) {
      toast.error("No bookings in selected timeline");
      return;
    }

    const s = getSettings();
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(s.businessName.replace(/[^\\x00-\\x7F]/g, ""), 14, 18);
    doc.setFontSize(11);
    doc.setTextColor(100);
    const startLabel = startDate.toLocaleDateString("en-IN");
    const endLabel = endDate.toLocaleDateString("en-IN");
    doc.text(`Bookings Report — ${startLabel} — ${endLabel}`, 14, 26);
    const displayCurrency = /^[\x00-\x7F]+$/.test(s.currency || "")
      ? s.currency
      : "Rs";

    autoTable(doc, {
      startY: 32,
      columns: [
        { header: "Guest", dataKey: "guest" },
        { header: "Phone", dataKey: "phone" },
        { header: "Room", dataKey: "room" },
        { header: "Check-in", dataKey: "checkIn" },
        { header: "Check-out", dataKey: "checkOut" },
        { header: "Nights", dataKey: "nights" },
        { header: "Amount", dataKey: "amount" },
        { header: "Advance", dataKey: "advance" },
        { header: "Due", dataKey: "due" },
        { header: "Status", dataKey: "status" },
      ],
      body: combined.map((b) => {
        const nights = Math.max(
          1,
          Math.ceil(
            (new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) /
              86400000,
          ),
        );
        return {
          guest: b.guestName,
          phone: b.phone || "—",
          room: b.room,
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          nights,
          amount: `${displayCurrency}${b.amount}`,
          advance: `${displayCurrency}${b.advance}`,
          due: `${displayCurrency}${b.amount - b.advance}`,
          status: b.status,
          _deleted: Boolean((b as any).deletedAt || (b as any).purgedAt),
        };
      }),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [217, 119, 6] },
      alternateRowStyles: { fillColor: [254, 252, 232] },
      didParseCell: (data) => {
        try {
          const row = data.row && (data.row.raw as any);
          if (row && row._deleted) {
            // light red background
            data.cell.styles.fillColor = [255, 230, 230];
            data.cell.styles.textColor = [156, 18, 18];
          }
        } catch (e) {
          // ignore styling errors
        }
      },
    });
    // compute totals excluding deleted entries
    const totalsSource = filteredActive; // exclude deleted for totals
    const totalAmountVal = totalsSource.reduce(
      (s2, b) => s2 + (Number(b.amount) || 0),
      0,
    );
    const totalAdvanceVal = totalsSource.reduce(
      (s2, b) => s2 + (Number(b.advance) || 0),
      0,
    );
    const totalDueVal = totalAmountVal - totalAdvanceVal;

    const finalY = (doc as any).lastAutoTable?.finalY || 40;
    doc.setFontSize(10);
    doc.text(
      `Total (excluding deleted): ${displayCurrency}${totalAmountVal.toFixed(2)}`,
      14,
      finalY + 10,
    );
    doc.text(
      `Paid (advance): ${displayCurrency}${totalAdvanceVal.toFixed(2)}`,
      14,
      finalY + 16,
    );
    doc.text(
      `Total Due: ${displayCurrency}${totalDueVal.toFixed(2)}`,
      14,
      finalY + 22,
    );

    doc.save(
      `mirchi-bookings-${startLabel.replace(/\//g, "-")}_to_${endLabel.replace(/\//g, "-")}${includeDeleted ? "_with-deleted" : ""}.pdf`,
    );
    toast.success("PDF downloaded!");
  };

  const handleExportJSON = () => {
    const includeDeleted = confirm(
      "Include deleted bookings in the export? Click OK to include, Cancel to exclude.",
    );
    downloadFile(
      exportBookingsJSON(includeDeleted),
      includeDeleted
        ? "mirchi-bookings-with-deleted.json"
        : "mirchi-bookings.json",
      "application/json",
    );
    toast.success("JSON downloaded!");
  };

  const handleClearAll = () => {
    if (confirm("Delete ALL bookings? This cannot be undone.")) {
      clearAllBookings();
      refresh();
      toast.success("All bookings cleared.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <header className="header-gradient sticky top-0 z-10 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary rounded-xl p-2.5 shadow-md shadow-primary/20">
              <Hotel className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Mirchi Hotel
              </h1>
              <p className="text-xs text-muted-foreground">
                Booking Management
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-1" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportJSON}>
              <Download className="h-4 w-4 mr-1" /> JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
            >
              <Trash2 className="h-4 w-4 mr-1" /> Clear All
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowSimpleInvoice(true)}
            >
              <FileText className="h-4 w-4 mr-1" /> Invoice
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setEditBooking(null);
                setSelectedRoom(undefined);
                setShowForm(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> New Booking
            </Button>
          </div>
        </div>
      </header>

      {/* Timeline selector box (appears at top of page) */}
      <div className="container mx-auto px-4 py-3">
        <div className="bg-muted/10 border rounded-lg p-3 flex items-center gap-4">
          <div className="text-sm font-medium">Export timeline:</div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={timelineOption === "today" ? undefined : "outline"}
              onClick={() => setTimelineOption("today")}
            >
              Today
            </Button>
            <Button
              size="sm"
              variant={timelineOption === "yesterday" ? undefined : "outline"}
              onClick={() => setTimelineOption("yesterday")}
            >
              Yesterday
            </Button>
            <Button
              size="sm"
              variant={timelineOption === "custom" ? undefined : "outline"}
              onClick={() => {
                setTimelineOption("custom");
                setShowTimelineDialog(true);
              }}
            >
              Custom
            </Button>
          </div>
          <div className="ml-auto text-sm text-muted-foreground">
            {timelineOption === "today" && format(new Date(), "PPP")}
            {timelineOption === "yesterday" &&
              format(new Date(Date.now() - 86400000), "PPP")}
            {timelineOption === "custom" &&
              (customStart && customEnd
                ? `${format(customStart, "PPP")} — ${format(customEnd, "PPP")}`
                : "No custom range")}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 pb-20">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full max-w-xl grid-cols-5 h-12 rounded-xl bg-muted/50 p-1.5 shadow-inner">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" /> Bookings
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Calendar
            </TabsTrigger>
            <TabsTrigger value="revenue" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Revenue
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" /> Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6 mt-0">
            {/* Room Grid with Date Picker */}
            <Card key={`grid-${refreshKey}`} className="card-elevated">
              <CardHeader className="pb-3 border-b border-border/60 bg-muted/10">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="text-lg font-semibold">
                    Rooms & Availability
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Viewing:
                    </span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn("justify-start text-left font-normal")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(selectedDate, "PPP")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(d) => d && setSelectedDate(d)}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    {selectedDate.toDateString() !==
                      new Date().toDateString() && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedDate(new Date())}
                      >
                        Today
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <RoomGrid
                  onSelectRoom={handleRoomSelect}
                  selectedDate={selectedDate}
                />
              </CardContent>
            </Card>

            {/* Quick link to Bookings tab */}
            <Card
              className="card-elevated border-dashed cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
              onClick={() => setActiveTab("bookings")}
            >
              <CardContent className="py-4 flex items-center justify-between">
                <span className="text-sm font-medium">
                  Check-in, Check-out & manage bookings
                </span>
                <span className="text-xs text-muted-foreground">
                  Click to open →
                </span>
              </CardContent>
            </Card>

            {/* Invoice View */}
            {invoiceBooking && (
              <Card className="card-elevated">
                <CardContent className="pt-6">
                  <InvoiceView
                    booking={invoiceBooking}
                    onClose={() => setInvoiceBooking(null)}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="bookings" className="mt-0">
            <Card className="card-elevated overflow-hidden">
              <CardHeader className="pb-3 bg-muted/20 border-b border-border/60">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
                      <CalendarDays className="h-4 w-4" />
                    </span>
                    All Bookings
                  </CardTitle>
                  <span className="text-sm text-muted-foreground font-medium">
                    {refreshKey >= 0 && getBookings().length} total
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <BookingsList
                  onEdit={handleEdit}
                  onInvoice={(b) => {
                    setInvoiceBooking(b);
                    setActiveTab("dashboard");
                  }}
                  onCheckInOut={switchToBookings}
                  refreshKey={refreshKey}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar" className="mt-0">
            <CalendarView refreshKey={refreshKey} />
          </TabsContent>

          <TabsContent value="revenue" className="mt-0">
            <div className="mt-2">
              {/* lazy-load component */}
              <RevenueView />
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <SettingsMenu />
          </TabsContent>
        </Tabs>
      </main>

      {/* Simple Invoice Generator Dialog */}
      <Dialog open={showSimpleInvoice} onOpenChange={setShowSimpleInvoice}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Simple Invoice Generator</DialogTitle>
          </DialogHeader>
          <SimpleInvoiceGenerator onClose={() => setShowSimpleInvoice(false)} />
        </DialogContent>
      </Dialog>

      {/* Custom timeline dialog for PDF export */}
      <Dialog open={showTimelineDialog} onOpenChange={setShowTimelineDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose timeline</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 p-2">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Start date</p>
              <Calendar
                mode="single"
                selected={customStart ?? undefined}
                onSelect={(d) => d && setCustomStart(d)}
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">End date</p>
              <Calendar
                mode="single"
                selected={customEnd ?? undefined}
                onSelect={(d) => d && setCustomEnd(d)}
              />
            </div>
          </div>
          <div className="p-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowTimelineDialog(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!customStart || !customEnd) {
                  toast.error("Please pick start and end dates");
                  return;
                }
                setShowTimelineDialog(false);
                setTimelineOption("custom");
              }}
            >
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Form Dialog */}
      <Dialog
  open={showForm}
  onOpenChange={(open) => {
    if (!open) handleFormDone();
  }}
>
  <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>
        {editBooking ? "Edit Booking" : "New Booking"}
      </DialogTitle>
    </DialogHeader>
    <BookingForm
      initialRoom={selectedRoom}
      editBooking={editBooking}
      onDone={handleFormDone}
    />
  </DialogContent>
</Dialog>

{/* ✅ Footer should be OUTSIDE */}
<footer className=" w-full bg-background/95 border-t border-border z-50 shadow-sm">
  <div className="container mx-auto px-4 py-3 text-center text-sm text-foreground">
    <span className="font-medium">Made with ❤️ by Siddhant</span>
  </div>
</footer>

    </div>
  );
};

export default Index;
