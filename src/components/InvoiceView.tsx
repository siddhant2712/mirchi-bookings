import { useState } from "react";
import { Booking, ROOMS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Printer, X, Pencil } from "lucide-react";

interface InvoiceViewProps {
  booking: Booking;
  onClose: () => void;
}

export default function InvoiceView({ booking, onClose }: InvoiceViewProps) {
  const roomLabel = ROOMS.find((r) => r.id === booking.room)?.label ?? booking.room;
  const nights = Math.max(1, Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / 86400000));

  const [editing, setEditing] = useState(false);
  const [hotelName, setHotelName] = useState("🌶️ Mirchi Hotel");
  const [invoiceTitle, setInvoiceTitle] = useState("Tax Invoice");
  const [guestName, setGuestName] = useState(booking.guestName);
  const [phone, setPhone] = useState(booking.phone);
  const [description, setDescription] = useState(`${roomLabel} — ${nights} night${nights > 1 ? "s" : ""}`);
  const [dateRange, setDateRange] = useState(`${booking.checkIn} to ${booking.checkOut}`);
  const [totalAmount, setTotalAmount] = useState(booking.amount.toString());
  const [advancePaid, setAdvancePaid] = useState(booking.advance.toString());
  const [extraNotes, setExtraNotes] = useState(booking.notes ?? "");
  const [extraItems, setExtraItems] = useState<{ desc: string; amount: string }[]>([]);

  const total = parseFloat(totalAmount || "0") + extraItems.reduce((s, i) => s + parseFloat(i.amount || "0"), 0);
  const balance = total - parseFloat(advancePaid || "0");

  const addExtraItem = () => setExtraItems([...extraItems, { desc: "", amount: "" }]);
  const removeExtraItem = (idx: number) => setExtraItems(extraItems.filter((_, i) => i !== idx));

  const handlePrint = () => {
    const printContent = document.getElementById("invoice-print-area");
    if (!printContent) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Invoice - ${guestName}</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 40px; max-width: 700px; margin: auto; }
        h1 { color: #d97706; margin-bottom: 4px; }
        .subtitle { color: #888; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #eee; }
        th { background: #fef3c7; font-weight: 600; }
        .total-row td { font-weight: bold; font-size: 1.1em; border-top: 2px solid #d97706; }
        .footer { margin-top: 40px; text-align: center; color: #999; font-size: 0.9em; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .text-green { color: #16a34a; }
        .text-red { color: #dc2626; }
        .font-bold { font-weight: bold; }
        .text-sm { font-size: 0.875rem; }
        .text-xs { font-size: 0.75rem; color: #888; }
        .text-lg { font-size: 1.125rem; }
        .mb-1 { margin-bottom: 4px; }
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
          <Button size="sm" variant={editing ? "default" : "outline"} onClick={() => setEditing(!editing)}>
            <Pencil className="h-4 w-4 mr-1" /> {editing ? "Done Editing" : "Edit"}
          </Button>
          <Button size="sm" onClick={handlePrint}><Printer className="h-4 w-4 mr-1" /> Print</Button>
          <Button size="sm" variant="outline" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Editable Invoice */}
      <div id="invoice-print-area" className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="text-center">
          {editing ? (
            <div className="space-y-1">
              <Input className="text-center text-2xl font-bold" value={hotelName} onChange={(e) => setHotelName(e.target.value)} />
              <Input className="text-center text-sm" value={invoiceTitle} onChange={(e) => setInvoiceTitle(e.target.value)} />
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-primary">{hotelName}</h1>
              <p className="text-muted-foreground text-sm">{invoiceTitle}</p>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Guest</p>
            {editing ? (
              <div className="space-y-1">
                <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} />
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
              </div>
            ) : (
              <>
                <p className="font-semibold">{guestName}</p>
                {phone && <p className="text-muted-foreground">{phone}</p>}
              </>
            )}
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
                {editing ? (
                  <div className="space-y-1">
                    <Input value={description} onChange={(e) => setDescription(e.target.value)} />
                    <Input value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="text-xs" />
                  </div>
                ) : (
                  <>
                    {description}
                    <span className="block text-muted-foreground text-xs">{dateRange}</span>
                  </>
                )}
              </td>
              <td className="py-2 text-right">
                {editing ? (
                  <Input type="number" className="w-28 ml-auto text-right" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} />
                ) : (
                  `₹${totalAmount}`
                )}
              </td>
            </tr>

            {/* Extra line items */}
            {extraItems.map((item, idx) => (
              <tr key={idx} className="border-b border-border">
                <td className="py-2">
                  {editing ? (
                    <div className="flex gap-2 items-center">
                      <Input value={item.desc} onChange={(e) => { const n = [...extraItems]; n[idx].desc = e.target.value; setExtraItems(n); }} placeholder="Item description" />
                      <Button type="button" size="icon" variant="ghost" onClick={() => removeExtraItem(idx)} className="shrink-0"><X className="h-3 w-3" /></Button>
                    </div>
                  ) : item.desc}
                </td>
                <td className="py-2 text-right">
                  {editing ? (
                    <Input type="number" className="w-28 ml-auto text-right" value={item.amount} onChange={(e) => { const n = [...extraItems]; n[idx].amount = e.target.value; setExtraItems(n); }} />
                  ) : `₹${item.amount}`}
                </td>
              </tr>
            ))}

            {editing && (
              <tr>
                <td colSpan={2} className="py-2">
                  <Button type="button" variant="outline" size="sm" onClick={addExtraItem}>+ Add Line Item</Button>
                </td>
              </tr>
            )}

            <tr className="border-b border-border">
              <td className="py-2">Advance Paid</td>
              <td className="py-2 text-right text-success">
                {editing ? (
                  <Input type="number" className="w-28 ml-auto text-right" value={advancePaid} onChange={(e) => setAdvancePaid(e.target.value)} />
                ) : `- ₹${advancePaid}`}
              </td>
            </tr>
            <tr>
              <td className="py-2 font-bold">Balance Due</td>
              <td className={`py-2 text-right font-bold text-lg ${balance > 0 ? "text-destructive" : "text-success"}`}>
                ₹{balance}
              </td>
            </tr>
          </tbody>
        </table>

        {(extraNotes || editing) && (
          <div className="text-sm">
            <p className="text-muted-foreground">Notes:</p>
            {editing ? (
              <Textarea value={extraNotes} onChange={(e) => setExtraNotes(e.target.value)} rows={2} />
            ) : extraNotes ? <p>{extraNotes}</p> : null}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground pt-4">Thank you for staying with us! 🌶️</p>
      </div>
    </div>
  );
}
