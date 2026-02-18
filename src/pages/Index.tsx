import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Download, Plus, Hotel, CalendarIcon, LayoutDashboard, Settings, FileText, CalendarDays, ListChecks, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import RoomGrid from "@/components/RoomGrid";
import BookingForm from "@/components/BookingForm";
import BookingsList from "@/components/BookingsList";
import InvoiceView from "@/components/InvoiceView";
import SettingsMenu from "@/components/SettingsMenu";
import SimpleInvoiceGenerator from "@/components/SimpleInvoiceGenerator";
import CalendarView from "@/components/CalendarView";
import { Booking } from "@/lib/types";
import { exportBookingsJSON, downloadFile, getBookings, clearAllBookings } from "@/lib/bookingStore";
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

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const switchToBookings = useCallback(() => setActiveTab("bookings"), []);

  useEffect(() => {
    window.addEventListener("bookings-updated", refresh);
    return () => window.removeEventListener("bookings-updated", refresh);
  }, [refresh]);

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

  const handleExportJSON = () => {
    downloadFile(exportBookingsJSON(), "mirchi-bookings.json", "application/json");
    toast.success("JSON downloaded!");
  };

  const handleExportPDF = () => {
    const bookings = getBookings();
    if (!bookings.length) { toast.error("No bookings to export"); return; }
    const s = getSettings();
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(s.businessName.replace(/[^\x00-\x7F]/g, ""), 14, 18);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Bookings Report — ${new Date().toLocaleDateString("en-IN")}`, 14, 26);
    autoTable(doc, {
      startY: 32,
      head: [["Guest", "Phone", "Room", "Check-in", "Check-out", "Nights", "Amount", "Advance", "Due", "Status"]],
      body: bookings.map((b) => {
        const nights = Math.max(1, Math.ceil((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86400000));
        return [
          b.guestName,
          b.phone || "—",
          b.room,
          b.checkIn,
          b.checkOut,
          nights,
          `${s.currency}${b.amount}`,
          `${s.currency}${b.advance}`,
          `${s.currency}${b.amount - b.advance}`,
          b.status,
        ];
      }),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [217, 119, 6] },
      alternateRowStyles: { fillColor: [254, 252, 232] },
    });
    doc.save("mirchi-bookings.pdf");
    toast.success("PDF downloaded!");
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
              <h1 className="text-xl font-bold tracking-tight text-foreground">🌶️ Mirchi Hotel</h1>
              <p className="text-xs text-muted-foreground">Booking Management</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-1" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportJSON}>
              <Download className="h-4 w-4 mr-1" /> JSON
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearAll} className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30">
              <Trash2 className="h-4 w-4 mr-1" /> Clear All
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowSimpleInvoice(true)}>
              <FileText className="h-4 w-4 mr-1" /> Invoice
            </Button>
            <Button type="button" size="sm" onClick={() => { setEditBooking(null); setSelectedRoom(undefined); setShowForm(true); }}>
              <Plus className="h-4 w-4 mr-1" /> New Booking
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-xl grid-cols-4 h-12 rounded-xl bg-muted/50 p-1.5 shadow-inner">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" /> Bookings
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Calendar
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
              <CardTitle className="text-lg font-semibold">Rooms & Availability</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Viewing:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal")}>
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
                {selectedDate.toDateString() !== new Date().toDateString() && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date())}>Today</Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <RoomGrid onSelectRoom={handleRoomSelect} selectedDate={selectedDate} />
          </CardContent>
        </Card>

        {/* Quick link to Bookings tab */}
        <Card
          className="card-elevated border-dashed cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
          onClick={() => setActiveTab("bookings")}
        >
          <CardContent className="py-4 flex items-center justify-between">
            <span className="text-sm font-medium">Check-in, Check-out & manage bookings</span>
            <span className="text-xs text-muted-foreground">Click to open →</span>
          </CardContent>
        </Card>

        {/* Invoice View */}
        {invoiceBooking && (
          <Card className="card-elevated">
            <CardContent className="pt-6">
              <InvoiceView booking={invoiceBooking} onClose={() => setInvoiceBooking(null)} />
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
                  onInvoice={setInvoiceBooking}
                  onCheckInOut={switchToBookings}
                  refreshKey={refreshKey}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar" className="mt-0">
            <CalendarView refreshKey={refreshKey} />
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

      {/* Booking Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) handleFormDone(); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editBooking ? "Edit Booking" : "New Booking"}</DialogTitle>
          </DialogHeader>
          <BookingForm
            initialRoom={selectedRoom}
            editBooking={editBooking}
            onDone={handleFormDone}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
