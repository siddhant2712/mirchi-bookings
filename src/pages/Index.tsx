import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Download, Plus, Hotel, CalendarIcon, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import RoomGrid from "@/components/RoomGrid";
import BookingForm from "@/components/BookingForm";
import BookingsList from "@/components/BookingsList";
import InvoiceView from "@/components/InvoiceView";
import { Booking } from "@/lib/types";
import { exportBookingsJSON, exportBookingsCSV, downloadFile, clearAllBookings } from "@/lib/bookingStore";
import { toast } from "sonner";

const Index = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string | undefined>();
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [invoiceBooking, setInvoiceBooking] = useState<Booking | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

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

  const handleExportCSV = () => {
    downloadFile(exportBookingsCSV(), "mirchi-bookings.csv", "text/csv");
    toast.success("CSV downloaded!");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary rounded-lg p-2">
              <Hotel className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">🌶️ Mirchi Hotel</h1>
              <p className="text-xs text-muted-foreground">Booking Management</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" onClick={() => {
              if (confirm("Clear all bookings? This cannot be undone. Export first if needed.")) {
                clearAllBookings();
                refresh();
                toast.success("All bookings cleared!");
              }
            }}>
              <Trash2 className="h-4 w-4 mr-1" /> Clear All
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportJSON}>
              <Download className="h-4 w-4 mr-1" /> JSON
            </Button>
            <Button size="sm" onClick={() => { setEditBooking(null); setSelectedRoom(undefined); setShowForm(true); }}>
              <Plus className="h-4 w-4 mr-1" /> New Booking
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Room Grid with Date Picker */}
        <Card key={`grid-${refreshKey}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-lg">Rooms & Availability</CardTitle>
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

        {/* Invoice View */}
        {invoiceBooking && (
          <Card>
            <CardContent className="pt-6">
              <InvoiceView booking={invoiceBooking} onClose={() => setInvoiceBooking(null)} />
            </CardContent>
          </Card>
        )}

        {/* Bookings Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">All Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <BookingsList
              onEdit={handleEdit}
              onInvoice={setInvoiceBooking}
              refreshKey={refreshKey}
            />
          </CardContent>
        </Card>
      </main>

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
