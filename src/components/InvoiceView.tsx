import { useState, useEffect } from "react";
import { Booking, ROOMS } from "@/lib/types";
import { getSettings } from "@/lib/settingsStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Printer, X, Pencil } from "lucide-react";

interface InvoiceViewProps {
  booking: Booking;
  onClose: () => void;
}

export default function InvoiceView({ booking, onClose }: InvoiceViewProps) {
  const roomLabel = ROOMS.find((r) => r.id === booking.room)?.label ?? booking.room;
  const nights = Math.max(1, Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / 86400000));

  const s = getSettings();
  const [editing, setEditing] = useState(false);
  const [hotelName, setHotelName] = useState(s.businessName);
  const [hotelGstNumber, setHotelGstNumber] = useState(s.businessGstNumber ?? "");
  const [hotelAddress, setHotelAddress] = useState(s.businessAddress ?? "");
  const [hotelPhone, setHotelPhone] = useState(s.businessContact ?? "");
  const [invoiceTitle, setInvoiceTitle] = useState(s.invoiceTitle);
  const [invoiceFooter, setInvoiceFooter] = useState(s.invoiceFooter);
  const [currency, setCurrency] = useState(s.currency);
  const [guestName, setGuestName] = useState(booking.guestName);
  const [phone, setPhone] = useState(booking.phone);
  const [companyName, setCompanyName] = useState(booking.guestCompanyName ?? "");
  const [gstNumber, setGstNumber] = useState(booking.guestGstNumber ?? "");
  const [taxAmount, setTaxAmount] = useState("");
  const [description, setDescription] = useState(`${roomLabel} — ${nights} night${nights > 1 ? "s" : ""}`);
  const [dateRange, setDateRange] = useState(`${booking.checkIn} to ${booking.checkOut}`);
  const [totalAmount, setTotalAmount] = useState(booking.amount.toString());
  const [advancePaid, setAdvancePaid] = useState(booking.advance.toString());
  const [extraNotes, setExtraNotes] = useState(booking.notes ?? "");
  const [extraItems, setExtraItems] = useState<{ desc: string; amount: string }[]>([]);

  useEffect(() => {
    const s = getSettings();
    setHotelName(s.businessName);
    setHotelGstNumber(s.businessGstNumber ?? "");
    setHotelAddress(s.businessAddress ?? "");
    setHotelPhone(s.businessContact ?? "");
    setInvoiceTitle(s.invoiceTitle);
    setInvoiceFooter(s.invoiceFooter);
    setCurrency(s.currency);
    setCompanyName(booking.guestCompanyName ?? "");
    setGstNumber(booking.guestGstNumber ?? "");
  }, [booking.id]);

  const subtotal = parseFloat(totalAmount || "0") + extraItems.reduce((sum, i) => sum + parseFloat(i.amount || "0"), 0);
  const tax = parseFloat(taxAmount || "0");
  const total = subtotal + tax;
  const balance = total - parseFloat(advancePaid || "0");

  const addExtraItem = () => setExtraItems([...extraItems, { desc: "", amount: "" }]);
  const removeExtraItem = (idx: number) => setExtraItems(extraItems.filter((_, i) => i !== idx));

  const handlePrint = () => {
    const lineRows = [
      `<tr><td class="inv-desc">${escapeHtml(description)}<br><span class="inv-muted">${escapeHtml(dateRange)}</span></td><td class="inv-amt">${currency}${totalAmount}</td></tr>`,
      ...extraItems.filter((i) => i.desc || i.amount).map((i) => `<tr><td class="inv-desc">${escapeHtml(i.desc)}</td><td class="inv-amt">${currency}${i.amount}</td></tr>`),
    ].join("");
    const printBody = `
      <div class="inv-page">
        <div class="inv-letterhead">
          <div class="inv-letterhead-inner">
            <h1 class="inv-brand">${escapeHtml(hotelName)}</h1>
            <p class="inv-doctitle">${escapeHtml(invoiceTitle)}</p>
            <div class="inv-business-details">
              <p class="inv-gst">GSTIN: ${escapeHtml(hotelGstNumber || "—")}</p>
              <p class="inv-address">Location: ${escapeHtml(hotelAddress || "—")}</p>
              <p class="inv-phone">Ph: ${escapeHtml(hotelPhone || "—")}</p>
            </div>
          </div>
        </div>

        <div class="inv-meta">
          <div class="inv-billto">
            <p class="inv-label">Bill To / Customer</p>
            <p class="inv-guest">${escapeHtml(guestName)}</p>
            <p class="inv-muted">Ph: ${escapeHtml(phone || "—")}</p>
            <p class="inv-company">Company: ${escapeHtml(companyName || "—")}</p>
            <p class="inv-muted">GST: ${escapeHtml(gstNumber || "—")}</p>
          </div>
          <div class="inv-invoice-meta">
            <table class="inv-meta-table">
              <tr><td class="inv-label">Invoice No.</td><td class="inv-value">${booking.id.slice(0, 8).toUpperCase()}</td></tr>
              <tr><td class="inv-label">Date</td><td class="inv-value">${new Date().toLocaleDateString("en-IN")}</td></tr>
            </table>
          </div>
        </div>

        <table class="inv-table">
          <thead>
            <tr><th class="inv-th-left">Description</th><th class="inv-th-right">Amount</th></tr>
          </thead>
          <tbody>
            ${lineRows}
            <tr class="inv-row-sub"><td class="inv-desc">Subtotal</td><td class="inv-amt">${currency}${subtotal.toFixed(2)}</td></tr>
            <tr class="inv-row-sub"><td class="inv-desc">Tax</td><td class="inv-amt">${currency}${tax.toFixed(2)}</td></tr>
            <tr class="inv-row-total"><td class="inv-desc">Total</td><td class="inv-amt">${currency}${total.toFixed(2)}</td></tr>
            <tr class="inv-row-sub"><td class="inv-desc">Advance Paid</td><td class="inv-amt inv-paid">− ${currency}${advancePaid}</td></tr>
            <tr class="inv-row-balance"><td class="inv-desc">Balance Due</td><td class="inv-amt inv-balance ${balance > 0 ? "inv-balance-due" : "inv-balance-ok"}">${currency}${balance.toFixed(2)}</td></tr>
          </tbody>
        </table>

        ${extraNotes ? `<div class="inv-notes"><p class="inv-label">Notes</p><p class="inv-muted">${escapeHtml(extraNotes)}</p></div>` : ""}

        <div class="inv-footer">
          <p>${escapeHtml(invoiceFooter)}</p>
        </div>
      </div>`;
    const win = window.open("", "_blank");
    if (!win) {
      alert("Please allow popups to print the invoice.");
      return;
    }
    win.document.write(`
      <!DOCTYPE html>
      <html><head>
        <meta charset="utf-8">
        <title>Invoice - ${escapeHtml(guestName)}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; font-size: 14px; color: #1f2937; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @media print {
            body { padding: 0; }
            .inv-page { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
          }
          .inv-page { max-width: 210mm; margin: 0 auto; padding: 12mm 14mm; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
          .inv-letterhead { text-align: center; padding-bottom: 20px; border-bottom: 2px solid #d97706; margin-bottom: 20px; }
          .inv-letterhead-inner { max-width: 480px; margin: 0 auto; }
          .inv-brand { font-size: 1.5rem; font-weight: 700; color: #b45309; margin: 0; letter-spacing: 0.02em; }
          .inv-doctitle { font-size: 0.85rem; color: #6b7280; margin: 6px 0 0; text-transform: uppercase; letter-spacing: 0.06em; }
          .inv-business-details { margin-top: 10px; font-size: 0.8rem; color: #4b5563; line-height: 1.5; }
          .inv-gst { font-weight: 600; color: #374151; margin: 0 0 2px; }
          .inv-address { margin: 0 0 2px; }
          .inv-phone { margin: 0; }
          .inv-meta { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px; font-size: 0.9rem; }
          .inv-billto { flex: 1; }
          .inv-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin: 0 0 4px; }
          .inv-guest { font-weight: 600; margin: 0 0 2px; }
          .inv-company { margin: 0 0 2px; font-weight: 500; }
          .inv-muted { margin: 0; color: #6b7280; font-size: 0.85rem; }
          .inv-invoice-meta { text-align: right; }
          .inv-meta-table { margin-left: auto; border-collapse: collapse; }
          .inv-meta-table td { padding: 2px 0 2px 12px; vertical-align: top; }
          .inv-value { font-weight: 600; color: #1f2937; }
          .inv-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
          .inv-th-left, .inv-th-right { text-align: left; padding: 10px 12px; background: #f8fafc; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #475569; border-bottom: 1px solid #e2e8f0; }
          .inv-th-right { text-align: right; }
          .inv-desc, .inv-amt { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
          .inv-amt { text-align: right; }
          .inv-row-sub .inv-desc { color: #64748b; }
          .inv-row-total { background: #fef3c7; }
          .inv-row-total .inv-desc, .inv-row-total .inv-amt { font-weight: 600; border-bottom-color: #fcd34d; padding: 10px 12px; }
          .inv-paid { color: #059669; }
          .inv-row-balance { background: #f0fdf4; }
          .inv-row-balance .inv-desc, .inv-row-balance .inv-amt { font-weight: 700; font-size: 1rem; border-bottom: none; padding: 12px; }
          .inv-balance-due { color: #dc2626; }
          .inv-balance-ok { color: #059669; }
          .inv-notes { margin-top: 20px; padding: 12px; background: #f8fafc; border-radius: 4px; font-size: 0.85rem; }
          .inv-footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 0.8rem; color: #9ca3af; }
        </style>
      </head><body>${printBody}</body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  function escapeHtml(text: string): string {
    const el = document.createElement("div");
    el.textContent = text;
    return el.innerHTML;
  }

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

      {/* Editable Invoice - real bill format */}
      <div id="invoice-print-area" className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="text-center border-b border-border pb-4">
          {editing ? (
            <div className="space-y-2">
              <Input className="text-center text-2xl font-bold" value={hotelName} onChange={(e) => setHotelName(e.target.value)} placeholder="Hotel / Business name" />
              <Input className="text-center text-sm" value={invoiceTitle} onChange={(e) => setInvoiceTitle(e.target.value)} placeholder="Tax Invoice" />
              <Input className="text-center text-xs" value={hotelGstNumber} onChange={(e) => setHotelGstNumber(e.target.value)} placeholder="GSTIN" />
              <Input className="text-center text-xs" value={hotelAddress} onChange={(e) => setHotelAddress(e.target.value)} placeholder="Address" />
              <Input className="text-center text-xs" value={hotelPhone} onChange={(e) => setHotelPhone(e.target.value)} placeholder="Phone" />
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-primary">{hotelName}</h1>
              <p className="text-muted-foreground text-sm mt-0.5">{invoiceTitle}</p>
              <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                <p className="font-medium text-foreground/90">GSTIN: {hotelGstNumber || "—"}</p>
                <p>Location: {hotelAddress || "—"}</p>
                <p>Ph: {hotelPhone || "—"}</p>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <p className="text-muted-foreground">Bill To / Customer</p>
            {editing ? (
              <div className="space-y-1">
                <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Customer name" />
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Customer phone" />
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Customer company name" />
                <Input value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} placeholder="Customer GST number" />
              </div>
            ) : (
              <>
                <p className="font-semibold">{guestName}</p>
                <p className="text-muted-foreground">Ph: {phone || "—"}</p>
                <p className="font-medium">Company: {companyName || "—"}</p>
                <p className="text-muted-foreground text-xs">GST: {gstNumber || "—"}</p>
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
                  `${currency}${totalAmount}`
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
                  ) : `${currency}${item.amount}`}
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
              <td className="py-2">Subtotal</td>
              <td className="py-2 text-right">{currency}{subtotal.toFixed(2)}</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2">Tax</td>
              <td className="py-2 text-right">
                {editing ? (
                  <Input type="number" className="w-28 ml-auto text-right" value={taxAmount} onChange={(e) => setTaxAmount(e.target.value)} placeholder="0" />
                ) : (
                  `${currency}${tax.toFixed(2)}`
                )}
              </td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2 font-medium">Total</td>
              <td className="py-2 text-right font-medium">{currency}{total.toFixed(2)}</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2">Advance Paid</td>
              <td className="py-2 text-right text-success">
                {editing ? (
                  <Input type="number" className="w-28 ml-auto text-right" value={advancePaid} onChange={(e) => setAdvancePaid(e.target.value)} />
                ) : `- ${currency}${advancePaid}`}
              </td>
            </tr>
            <tr>
              <td className="py-2 font-bold">Balance Due</td>
              <td className={`py-2 text-right font-bold text-lg ${balance > 0 ? "text-destructive" : "text-success"}`}>
                {currency}{balance}
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

        <div className="text-center text-xs text-muted-foreground pt-4">
          {editing ? (
            <Input className="text-center" value={invoiceFooter} onChange={(e) => setInvoiceFooter(e.target.value)} placeholder="Footer text" />
          ) : (
            invoiceFooter
          )}
        </div>
      </div>
    </div>
  );
}
