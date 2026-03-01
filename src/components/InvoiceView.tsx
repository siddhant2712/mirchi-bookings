import { useState, useEffect } from "react";
import { Booking } from "@/lib/types";
import { getRooms } from "@/lib/settingsStore";
import { getSettings } from "@/lib/settingsStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Printer, X, Pencil, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface InvoiceViewProps {
  booking: Booking;
  onClose: () => void;
}

export default function InvoiceView({ booking, onClose }: InvoiceViewProps) {
  const rooms = getRooms();
  const roomLabel =
    rooms.find((r) => r.id === booking.room)?.label ?? booking.room;
  const nights = Math.max(
    1,
    Math.ceil(
      (new Date(booking.checkOut).getTime() -
        new Date(booking.checkIn).getTime()) /
        86400000,
    ),
  );

  const s = getSettings();
  const [editing, setEditing] = useState(false);
  const [hotelName, setHotelName] = useState(s.businessName);
  const [hotelGstNumber, setHotelGstNumber] = useState(
    s.businessGstNumber ?? "",
  );
  const [hotelAddress, setHotelAddress] = useState(s.businessAddress ?? "");
  const [hotelPhone, setHotelPhone] = useState(s.businessContact ?? "");
  const [invoiceTitle, setInvoiceTitle] = useState(s.invoiceTitle);
  const [invoiceFooter, setInvoiceFooter] = useState(s.invoiceFooter);
  const [currency, setCurrency] = useState(s.currency);
  const [cgstLabel, setCgstLabel] = useState(s.cgstLabel);
  const [sgstLabel, setSgstLabel] = useState(s.sgstLabel);
  const [cgstPercent, setCgstPercent] = useState(s.cgstPercent);
  const [sgstPercent, setSgstPercent] = useState(s.sgstPercent);
  const [guestName, setGuestName] = useState(booking.guestName);
  const [phone, setPhone] = useState(booking.phone);
  const [companyName, setCompanyName] = useState(
    booking.guestCompanyName ?? "",
  );
  const [gstNumber, setGstNumber] = useState(booking.guestGstNumber ?? "");
  const [description, setDescription] = useState(
    `${roomLabel} — ${nights} night${nights > 1 ? "s" : ""}`,
  );
  const [dateRange, setDateRange] = useState(
    `${booking.checkIn} to ${booking.checkOut}`,
  );

  // These now represent the BASE price (Excluding tax)
  const [roomBaseAmount, setRoomBaseAmount] = useState(
    booking.amount.toString(),
  );
  const [advancePaid, setAdvancePaid] = useState(booking.advance.toString());
  const [extraNotes, setExtraNotes] = useState(booking.notes ?? "");
  const [extraItems, setExtraItems] = useState<
    { desc: string; amount: string }[]
  >([]);

  useEffect(() => {
    const s = getSettings();
    setHotelName(s.businessName);
    setHotelGstNumber(s.businessGstNumber ?? "");
    setHotelAddress(s.businessAddress ?? "");
    setHotelPhone(s.businessContact ?? "");
    setInvoiceTitle(s.invoiceTitle);
    setInvoiceFooter(s.invoiceFooter);
    setCurrency(s.currency);
    setCgstLabel(s.cgstLabel);
    setSgstLabel(s.sgstLabel);
    setCgstPercent(s.cgstPercent);
    setSgstPercent(s.sgstPercent);
    setCompanyName(booking.guestCompanyName ?? "");
    setGstNumber(booking.guestGstNumber ?? "");
  }, [booking.id]);

  const round = (n: number) => Math.round(n * 100) / 100;

  // Exclusive Tax Logic:
  // Subtotal is simply the sum of all entered amounts
  const roomSubtotal = parseFloat(roomBaseAmount || "0");
  const extrasSubtotal = extraItems.reduce(
    (sum, i) => sum + parseFloat(i.amount || "0"),
    0,
  );

  const subtotal = round(roomSubtotal + extrasSubtotal);

  // Calculate taxes ON TOP of subtotal
  const cgstAmount = round(subtotal * (cgstPercent / 100));
  const sgstAmount = round(subtotal * (sgstPercent / 100));
  const totalTax = cgstAmount + sgstAmount;

  // Total = Subtotal + Tax
  const total = round(subtotal + totalTax);

  const rawBalance = total - parseFloat(advancePaid || "0");
  const balance = Math.abs(rawBalance) < 1 ? 0 : round(rawBalance);

  const addExtraItem = () =>
    setExtraItems([...extraItems, { desc: "", amount: "" }]);
  const removeExtraItem = (idx: number) =>
    setExtraItems(extraItems.filter((_, i) => i !== idx));

  function escapeHtml(text: string): string {
    const el = document.createElement("div");
    el.textContent = text;
    return el.innerHTML;
  }

  const handlePrint = () => {
    const lineRows = [
      `<tr>
        <td class="inv-desc">
          ${escapeHtml(description)}<br>
        </td>
        <td class="inv-amt">
          ${currency}${roomSubtotal.toFixed(2)}
        </td>
      </tr>`,

      ...extraItems
        .filter((i) => i.desc || i.amount)
        .map(
          (i) => `
        <tr>
          <td class="inv-desc">${escapeHtml(i.desc)}</td>
          <td class="inv-amt">
            ${currency}${parseFloat(i.amount || "0").toFixed(2)}
          </td>
        </tr>`,
        ),
    ].join("");

    const printBody = `
      <div class="inv-page">
        <div class="inv-letterhead">
          <div class="inv-letterhead-inner">
            <h1 class="inv-brand">${escapeHtml(hotelName)}</h1>
            <p class="inv-doctitle">${escapeHtml(invoiceTitle)}</p>
            <div class="inv-business-details">
              <p class="inv-gst">GSTIN: ${escapeHtml(hotelGstNumber || "—")}</p>
              <p class="inv-address">📍 ${escapeHtml(hotelAddress || "—")}</p>
              <p class="inv-phone">📞 ${escapeHtml(hotelPhone || "—")}</p>
            </div>
          </div>
        </div>

        <div class="inv-meta">
          <div class="inv-billto">
            <p class="inv-label">Bill To / Customer</p>
            <p class="inv-guest">${escapeHtml(guestName)}</p>
            <p class="inv-muted">📞 ${escapeHtml(phone || "—")}</p>
            ${companyName ? `<p class="inv-company">${escapeHtml(companyName)}</p>` : ""}
            ${gstNumber ? `<p class="inv-muted">GST: ${escapeHtml(gstNumber)}</p>` : ""}
          </div>
          <div class="inv-invoice-meta">
            <table class="inv-meta-table">
  <tr>
    <td class="inv-label">Invoice No.</td>
    <td class="inv-value">${booking.id.slice(0, 5).toUpperCase()}</td>
  </tr>

  <tr>
    <td class="inv-label">Check-In</td>
    <td class="inv-value">
      ${new Date(booking.checkIn).toLocaleDateString("en-IN")} 
      ${new Date(booking.checkIn).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })}
    </td>
  </tr>

  <tr>
    <td class="inv-label">Check-Out</td>
    <td class="inv-value">
      ${new Date(booking.checkOut).toLocaleDateString("en-IN")} 
      ${new Date(booking.checkOut).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })}
    </td>
  </tr>

  <tr>
    <td class="inv-label">Date</td>
    <td class="inv-value">${new Date().toLocaleDateString("en-IN")}</td>
  </tr>
</table>
          </div>
        </div>

        <table class="inv-table">
          <thead>
            <tr><th class="inv-th-left">Description</th><th class="inv-th-right">Amount</th></tr>
          </thead>
          <tbody>
            ${lineRows}
            <tr class="inv-row-sub"><td class="inv-desc inv-subtotal-label">Subtotal</td><td class="inv-amt">${currency}${subtotal.toFixed(2)}</td></tr>
            <tr class="inv-row-tax"><td class="inv-desc">${escapeHtml(cgstLabel)} (${cgstPercent}%)</td><td class="inv-amt">${currency}${cgstAmount.toFixed(2)}</td></tr>
            <tr class="inv-row-tax"><td class="inv-desc">${escapeHtml(sgstLabel)} (${sgstPercent}%)</td><td class="inv-amt">${currency}${sgstAmount.toFixed(2)}</td></tr>
            <tr class="inv-row-total"><td class="inv-desc">Total</td><td class="inv-amt">${currency}${total.toFixed(2)}</td></tr>
            <tr class="inv-row-advance"><td class="inv-desc">Advance Paid</td><td class="inv-amt inv-paid">− ${currency}${parseFloat(advancePaid).toFixed(2)}</td></tr>
            <tr class="inv-row-balance"><td class="inv-desc">Balance Due</td><td class="inv-amt ${balance > 0 ? "inv-balance-due" : "inv-balance-ok"}">${currency}${balance.toFixed(2)}</td></tr>
          </tbody>
        </table>

        ${extraNotes ? `<div class="inv-notes"><p class="inv-label">Notes</p><p class="inv-muted">${escapeHtml(extraNotes)}</p></div>` : ""}

        <div class="inv-footer">
          <p>${escapeHtml(invoiceFooter)}</p>
        </div>
      </div>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head>
        <title>Invoice - ${escapeHtml(guestName)}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 20px; font-family: sans-serif; font-size: 13px; color: #1f2937; background: #f9fafb; }
          .inv-page { max-width: 210mm; margin: 0 auto; padding: 14mm; background: #fff; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
          .inv-letterhead { text-align: center; border-bottom: 3px solid #d97706; margin-bottom: 20px; padding-bottom: 10px; }
          .inv-brand { font-size: 1.6rem; color: #92400e; margin: 0; }
          .inv-meta { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .inv-label { font-size: 0.7rem; color: #9ca3af; text-transform: uppercase; font-weight: bold; }
          .inv-table { width: 100%; border-collapse: collapse; }
          .inv-th-left, .inv-th-right { background: #fef3c7; padding: 10px; text-align: left; border-bottom: 2px solid #fcd34d; }
          .inv-th-right { text-align: right; }
          .inv-desc, .inv-amt { padding: 10px; border-bottom: 1px solid #f3f4f6; }
          .inv-amt { text-align: right; }
          .inv-row-total { background: #fef3c7; font-weight: bold; }
          .inv-row-balance { font-size: 1.1rem; font-weight: 800; border-top: 2px solid #eee; }
          .inv-balance-due { color: #dc2626; }
          .inv-footer { margin-top: 30px; text-align: center; color: #9ca3af; font-size: 0.8rem; }
        </style>
      </head><body>${printBody}</body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(hotelName, 14, 18);
    doc.setFontSize(10);
    doc.text(invoiceTitle, 14, 25);

    const rows: any[] = [];
    rows.push([description, currency + roomSubtotal.toFixed(2)]);
    extraItems
      .filter((i) => i.desc || i.amount)
      .forEach((it) =>
        rows.push([
          it.desc,
          currency + parseFloat(it.amount || "0").toFixed(2),
        ]),
      );

    autoTable(doc, {
      startY: 35,
      head: [["Description", "Amount"]],
      body: rows,
      headStyles: { fillColor: [217, 119, 6] },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text(`Subtotal: ${currency}${subtotal.toFixed(2)}`, 14, finalY);
    doc.text(
      `${cgstLabel}: ${currency}${cgstAmount.toFixed(2)}`,
      14,
      finalY + 6,
    );
    doc.text(
      `${sgstLabel}: ${currency}${sgstAmount.toFixed(2)}`,
      14,
      finalY + 12,
    );
    doc.setFontSize(12);
    doc.text(`Total: ${currency}${total.toFixed(2)}`, 14, finalY + 22);
    doc.text(`Balance Due: ${currency}${balance.toFixed(2)}`, 14, finalY + 30);

    doc.save(`invoice-${booking.id.slice(0, 8)}.pdf`);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">Invoice Preview (Tax Exclusive)</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={editing ? "default" : "outline"}
            onClick={() => setEditing(!editing)}
          >
            <Pencil className="h-4 w-4 mr-1" />
            {editing ? "Done Editing" : "Edit"}
          </Button>
          <Button size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
          <Button size="sm" variant="outline" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 space-y-5 text-sm">
        <div className="text-center border-b border-border pb-4">
          {editing ? (
            <Input
              className="text-center font-bold text-xl"
              value={hotelName}
              onChange={(e) => setHotelName(e.target.value)}
            />
          ) : (
            <h1 className="text-2xl font-extrabold text-primary">
              {hotelName}
            </h1>
          )}
          <p className="text-muted-foreground text-xs uppercase mt-1">
            {invoiceTitle}
          </p>
        </div>

        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-amber-50">
              <th className="text-left py-2 px-3 border-b-2 border-amber-200">
                Description
              </th>
              <th className="text-right py-2 px-3 border-b-2 border-amber-200">
                Amount (Excl. Tax)
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="py-2.5 px-3">
                {editing ? (
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                ) : (
                  <span>{description}</span>
                )}
              </td>
              <td className="py-2.5 px-3 text-right">
                {editing ? (
                  <Input
                    type="number"
                    className="w-28 ml-auto text-right"
                    value={roomBaseAmount}
                    onChange={(e) => setRoomBaseAmount(e.target.value)}
                  />
                ) : (
                  <span className="font-medium">
                    {currency}
                    {roomSubtotal.toFixed(2)}
                  </span>
                )}
              </td>
            </tr>

            {extraItems.map((item, idx) => (
              <tr key={idx} className="border-b border-border">
                <td className="py-2 px-3">
                  {editing ? (
                    <Input
                      value={item.desc}
                      onChange={(e) => {
                        const n = [...extraItems];
                        n[idx].desc = e.target.value;
                        setExtraItems(n);
                      }}
                    />
                  ) : (
                    item.desc
                  )}
                </td>
                <td className="py-2 px-3 text-right">
                  {editing ? (
                    <Input
                      type="number"
                      value={item.amount}
                      onChange={(e) => {
                        const n = [...extraItems];
                        n[idx].amount = e.target.value;
                        setExtraItems(n);
                      }}
                    />
                  ) : (
                    `${currency}${parseFloat(item.amount || "0").toFixed(2)}`
                  )}
                </td>
              </tr>
            ))}

            {editing && (
              <tr>
                <td colSpan={2} className="py-2 px-3">
                  <Button variant="outline" size="sm" onClick={addExtraItem}>
                    + Add Line Item
                  </Button>
                </td>
              </tr>
            )}

            <tr className="bg-muted/30">
              <td className="py-2 px-3 font-semibold">Subtotal</td>
              <td className="py-2 px-3 text-right">
                {currency}
                {subtotal.toFixed(2)}
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3">
                {cgstLabel} ({cgstPercent}%)
              </td>
              <td className="py-2 px-3 text-right">
                {currency}
                {cgstAmount.toFixed(2)}
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3">
                {sgstLabel} ({sgstPercent}%)
              </td>
              <td className="py-2 px-3 text-right">
                {currency}
                {sgstAmount.toFixed(2)}
              </td>
            </tr>
            <tr className="bg-amber-50 font-bold border-b-2 border-amber-200">
              <td className="py-3 px-3">Total (Incl. Tax)</td>
              <td className="py-3 px-3 text-right">
                {currency}
                {total.toFixed(2)}
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3">Advance Paid</td>
              <td className="py-2 px-3 text-right">
                {currency}
                {parseFloat(advancePaid).toFixed(2)}
              </td>
            </tr>
            <tr>
              <td className="py-3 px-3 font-extrabold text-base">
                Balance Due
              </td>
              <td
                className={`py-3 px-3 text-right font-extrabold text-base ${balance > 0 ? "text-destructive" : "text-emerald-600"}`}
              >
                {currency}
                {balance.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
        <div className="text-center text-xs text-muted-foreground border-t pt-3">
          {invoiceFooter}
        </div>
      </div>
    </div>
  );
}
