import { Booking, ROOMS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

interface InvoiceViewProps {
  booking: Booking;
  onClose: () => void;
}

export default function InvoiceView({ booking, onClose }: InvoiceViewProps) {
  const roomLabel = ROOMS.find((r) => r.id === booking.room)?.label ?? booking.room;
  const nights = Math.max(1, Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / 86400000));
  const balance = booking.amount - booking.advance;

  const handlePrint = () => {
    const printContent = document.getElementById("invoice-print-area");
    if (!printContent) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Invoice - ${booking.guestName}</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 40px; max-width: 700px; margin: auto; }
        h1 { color: #d97706; margin-bottom: 4px; }
        .subtitle { color: #888; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #eee; }
        th { background: #fef3c7; font-weight: 600; }
        .total-row td { font-weight: bold; font-size: 1.1em; border-top: 2px solid #d97706; }
        .footer { margin-top: 40px; text-align: center; color: #999; font-size: 0.9em; }
      </style></head><body>
        ${printContent.innerHTML}
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-foreground">Invoice Preview</h3>
        <div className="flex gap-2">
          <Button size="sm" onClick={handlePrint}><Printer className="h-4 w-4 mr-1" /> Print</Button>
          <Button size="sm" variant="outline" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
      </div>

      <div id="invoice-print-area" className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">🌶️ Mirchi Hotel</h1>
          <p className="text-muted-foreground text-sm">Tax Invoice</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Guest</p>
            <p className="font-semibold">{booking.guestName}</p>
            {booking.phone && <p className="text-muted-foreground">{booking.phone}</p>}
          </div>
          <div className="text-right">
            <p className="text-muted-foreground">Invoice #</p>
            <p className="font-semibold">{booking.id.slice(0, 8).toUpperCase()}</p>
            <p className="text-muted-foreground">{new Date().toLocaleDateString("en-IN")}</p>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 text-muted-foreground">Description</th>
              <th className="text-right py-2 text-muted-foreground">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="py-2">
                {roomLabel} — {nights} night{nights > 1 ? "s" : ""}
                <span className="block text-muted-foreground text-xs">{booking.checkIn} to {booking.checkOut}</span>
              </td>
              <td className="py-2 text-right">₹{booking.amount}</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2">Advance Paid</td>
              <td className="py-2 text-right text-success">- ₹{booking.advance}</td>
            </tr>
            <tr>
              <td className="py-2 font-bold">Balance Due</td>
              <td className={`py-2 text-right font-bold text-lg ${balance > 0 ? "text-destructive" : "text-success"}`}>
                ₹{balance}
              </td>
            </tr>
          </tbody>
        </table>

        {booking.notes && (
          <div className="text-sm">
            <p className="text-muted-foreground">Notes:</p>
            <p>{booking.notes}</p>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground pt-4">Thank you for staying with us! 🌶️</p>
      </div>
    </div>
  );
}
