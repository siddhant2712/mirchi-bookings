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
  const [totalAmount, setTotalAmount] = useState(booking.amount.toString());
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

  const enteredRoomTotal = parseFloat(totalAmount || "0");
  const extrasGross = extraItems.reduce(
    (sum, i) => sum + parseFloat(i.amount || "0"),
    0,
  );

  const gross = enteredRoomTotal + extrasGross;
  const totalTaxRate = (cgstPercent + sgstPercent) / 100;

  const subtotal = totalTaxRate > 0 ? round(gross / (1 + totalTaxRate)) : gross;
  const preTaxRoom = subtotal;

  const cgstAmount = round(subtotal * (cgstPercent / 100));
  const sgstAmount = round(subtotal * (sgstPercent / 100));
  const totalTax = cgstAmount + sgstAmount;
  const total = round(subtotal + totalTax);

  // 🔹 Fix: Force balance to 0 if it's less than 1 Rupee (absolute value)
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
      (() => {
        const roomPreTax = subtotal;
        return `
      <tr>
        <td class="inv-desc">
          ${escapeHtml(description)}<br>
          <span class="inv-muted">${escapeHtml(dateRange)}</span>
        </td>
        <td class="inv-amt">
          ${currency}${round(roomPreTax).toFixed(2)}
        </td>
      </tr>`;
      })(),

      ...extraItems
        .filter((i) => i.desc || i.amount)
        .map((i) => {
          const extraGross = parseFloat(i.amount || "0");
          const extraPreTax =
            totalTaxRate > 0 ? extraGross / (1 + totalTaxRate) : extraGross;

          return `
        <tr>
          <td class="inv-desc">${escapeHtml(i.desc)}</td>
          <td class="inv-amt">
            ${currency}${round(extraPreTax).toFixed(2)}
          </td>
        </tr>`;
        }),
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
              <tr><td class="inv-label">Invoice No.</td><td class="inv-value">${booking.id.slice(0, 8).toUpperCase()}</td></tr>
              <tr><td class="inv-label">Date</td><td class="inv-value">${new Date().toLocaleDateString("en-IN")}</td></tr>
              <tr><td class="inv-label">Status</td><td class="inv-value">${booking.status.replace("-", " ").toUpperCase()}</td></tr>
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
    if (!win) {
      alert("Please allow popups to print.");
      return;
    }
    win.document.write(`
      <!DOCTYPE html>
      <html><head>
        <meta charset="utf-8">
        <title>Invoice - ${escapeHtml(guestName)}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 20px; font-family: 'Segoe UI', system-ui, sans-serif; font-size: 13px; color: #1f2937; -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #f9fafb; }
          @media print { body { padding: 0; background: #fff; } .inv-page { box-shadow: none !important; } }
          .inv-page { max-width: 210mm; margin: 0 auto; padding: 14mm 16mm; background: #fff; box-shadow: 0 4px 20px rgba(0,0,0,.12); border-radius: 8px; }
          .inv-letterhead { text-align: center; padding-bottom: 20px; border-bottom: 3px solid #d97706; margin-bottom: 24px; }
          .inv-brand { font-size: 1.6rem; font-weight: 800; color: #92400e; margin: 0; letter-spacing: 0.02em; }
          .inv-doctitle { font-size: 0.8rem; color: #6b7280; margin: 6px 0 0; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; }
          .inv-business-details { margin-top: 10px; font-size: 0.78rem; color: #4b5563; line-height: 1.7; }
          .inv-gst { font-weight: 700; color: #374151; margin: 0; }
          .inv-address, .inv-phone { margin: 0; }
          .inv-meta { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
          .inv-billto { flex: 1; }
          .inv-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; margin: 0 0 6px; font-weight: 600; }
          .inv-guest { font-weight: 700; font-size: 1rem; margin: 0 0 2px; color: #111827; }
          .inv-company { margin: 0 0 2px; font-weight: 600; color: #374151; }
          .inv-muted { margin: 0 0 2px; color: #6b7280; font-size: 0.82rem; }
          .inv-invoice-meta { text-align: right; }
          .inv-meta-table { margin-left: auto; border-collapse: collapse; }
          .inv-meta-table td { padding: 3px 0 3px 16px; vertical-align: top; font-size: 0.85rem; }
          .inv-value { font-weight: 700; color: #111827; }
          .inv-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; margin-top: 8px; }
          .inv-th-left, .inv-th-right { padding: 10px 14px; background: #fef3c7; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #92400e; border-bottom: 2px solid #fcd34d; }
          .inv-th-right { text-align: right; }
          .inv-desc, .inv-amt { padding: 10px 14px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
          .inv-amt { text-align: right; white-space: nowrap; }
          .inv-row-sub .inv-desc, .inv-row-sub .inv-amt { color: #6b7280; font-size: 0.85rem; background: #fafafa; }
          .inv-row-tax .inv-desc, .inv-row-tax .inv-amt { color: #6b7280; font-size: 0.82rem; background: #fafafa; }
          .inv-subtotal-label { font-weight: 600; color: #374151 !important; }
          .inv-row-total { background: #fef3c7; }
          .inv-row-total .inv-desc, .inv-row-total .inv-amt { font-weight: 700; font-size: 1rem; border-bottom: 2px solid #fcd34d; color: #92400e; }
          .inv-row-advance .inv-desc, .inv-row-advance .inv-amt { background: #f0fdf4; color: #374151; }
          .inv-row-balance { background: #fff; }
          .inv-row-balance .inv-desc, .inv-row-balance .inv-amt { font-weight: 800; font-size: 1.05rem; border-bottom: none; border-top: 2px solid #e5e7eb; padding: 14px; }
          .inv-paid { color: #059669; font-weight: 600; }
          .inv-balance-due { color: #dc2626; }
          .inv-balance-ok { color: #059669; }
          .inv-notes { margin-top: 20px; padding: 12px 14px; background: #f8fafc; border-radius: 6px; border-left: 3px solid #d97706; font-size: 0.83rem; }
          .inv-footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 0.78rem; color: #9ca3af; }
        </style>
      </head><body>${printBody}</body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  const handleDownloadPDF = () => {
    const s = getSettings();
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(s.businessName.replace(/[^\x00-\x7F]/g, ""), 14, 18);
    doc.setFontSize(11);
    doc.setTextColor(90);
    doc.text(invoiceTitle || "Invoice", 14, 26);

    const rows: any[] = [];
    rows.push([description, currency + preTaxRoom.toFixed(2)]);
    extraItems
      .filter((i) => i.desc || i.amount)
      .forEach((it) => {
        const extraPreTax =
          totalTaxRate > 0
            ? round(parseFloat(it.amount || "0") / (1 + totalTaxRate))
            : parseFloat(it.amount || "0");

        rows.push([it.desc, currency + extraPreTax.toFixed(2)]);
      });

    let startY = 34;
    autoTable(doc, {
      startY,
      head: [["Description", "Amount"]],
      body: rows,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [217, 119, 6] },
    });

    const finalY =
      (doc as any).lastAutoTable?.finalY || startY + rows.length * 8 + 10;
    doc.setFontSize(10);
    doc.text(`Subtotal: ${currency}${subtotal.toFixed(2)}`, 14, finalY + 10);
    doc.text(
      `${cgstLabel} (${cgstPercent}%): ${currency}${cgstAmount.toFixed(2)}`,
      14,
      finalY + 16,
    );
    doc.text(
      `${sgstLabel} (${sgstPercent}%): ${currency}${sgstAmount.toFixed(2)}`,
      14,
      finalY + 22,
    );
    doc.setFontSize(12);
    doc.text(`Total: ${currency}${total.toFixed(2)}`, 14, finalY + 30);
    
    // PDF Balance logic
    doc.text(`Advance Paid: ${currency}${parseFloat(advancePaid).toFixed(2)}`, 14, finalY + 38);
    doc.setFont("helvetica", "bold");
    doc.text(`Balance Due: ${currency}${balance.toFixed(2)}`, 14, finalY + 46);

    const filename = `invoice-${booking.id.slice(0, 8)}.pdf`;
    doc.save(filename);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">Invoice Preview</h3>
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
            <div className="space-y-2">
              <Input
                className="text-center font-bold text-xl"
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
              />
              <Input
                className="text-center text-xs"
                value={invoiceTitle}
                onChange={(e) => setInvoiceTitle(e.target.value)}
              />
              <Input
                className="text-center text-xs"
                value={hotelGstNumber}
                onChange={(e) => setHotelGstNumber(e.target.value)}
                placeholder="GSTIN"
              />
              <Input
                className="text-center text-xs"
                value={hotelAddress}
                onChange={(e) => setHotelAddress(e.target.value)}
                placeholder="Address"
              />
              <Input
                className="text-center text-xs"
                value={hotelPhone}
                onChange={(e) => setHotelPhone(e.target.value)}
                placeholder="Phone"
              />
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold text-primary">
                {hotelName}
              </h1>
              <p className="text-muted-foreground text-xs uppercase tracking-widest mt-1">
                {invoiceTitle}
              </p>
              <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                <p className="font-semibold text-foreground/80">
                  GSTIN: {hotelGstNumber || "—"}
                </p>
                <p>📍 {hotelAddress || "—"}</p>
                <p>📞 {hotelPhone || "—"}</p>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Bill To
            </p>
            {editing ? (
              <div className="space-y-1.5">
                <Input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Guest name"
                  className="h-8"
                />
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone"
                  className="h-8"
                />
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Company"
                  className="h-8"
                />
                <Input
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  placeholder="GST number"
                  className="h-8"
                />
              </div>
            ) : (
              <>
                <p className="font-bold text-base">{guestName}</p>
                <p className="text-muted-foreground text-xs">
                  📞 {phone || "—"}
                </p>
                {companyName && <p className="font-medium">{companyName}</p>}
                {gstNumber && (
                  <p className="text-muted-foreground text-xs">
                    GST: {gstNumber}
                  </p>
                )}
              </>
            )}
          </div>
          <div className="text-right space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Invoice
            </p>
            <p className="font-bold">#{booking.id.slice(0, 8).toUpperCase()}</p>
            <p className="text-muted-foreground text-xs">
              {new Date().toLocaleDateString("en-IN")}
            </p>
            <p className="text-xs capitalize text-muted-foreground">
              {booking.status.replace("-", " ")}
            </p>
          </div>
        </div>

        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-amber-50 dark:bg-amber-950/30">
              <th className="text-left py-2.5 px-3 text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300 font-bold border-b-2 border-amber-200">
                Description
              </th>
              <th className="text-right py-2.5 px-3 text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300 font-bold border-b-2 border-amber-200">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="py-2.5 px-3">
                {editing ? (
                  <div className="space-y-1">
                    <Input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="h-8"
                    />
                    <Input
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                ) : (
                  <>
                    <span className="font-medium">{description}</span>
                    <span className="block text-muted-foreground text-xs mt-0.5">
                      {dateRange}
                    </span>
                  </>
                )}
              </td>
              <td className="py-2.5 px-3 text-right">
                {editing ? (
                  <Input
                    type="number"
                    className="w-28 ml-auto text-right h-8"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                  />
                ) : (
                  <span className="font-medium">
                    {currency}
                    {preTaxRoom.toFixed(2)}
                  </span>
                )}
              </td>
            </tr>

            {extraItems.map((item, idx) => (
              <tr key={idx} className="border-b border-border">
                <td className="py-2 px-3">
                  {editing ? (
                    <div className="flex gap-2 items-center">
                      <Input
                        value={item.desc}
                        onChange={(e) => {
                          const n = [...extraItems];
                          n[idx].desc = e.target.value;
                          setExtraItems(n);
                        }}
                        placeholder="Item description"
                        className="h-8"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeExtraItem(idx)}
                        className="shrink-0 h-8 w-8"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    item.desc
                  )}
                </td>
                <td className="py-2 px-3 text-right">
                  {editing ? (
                    <Input
                      type="number"
                      className="w-28 ml-auto text-right h-8"
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addExtraItem}
                  >
                    + Add Line Item
                  </Button>
                </td>
              </tr>
            )}

            <tr className="border-b border-border bg-muted/30">
              <td className="py-2 px-3 text-muted-foreground font-semibold">
                Subtotal
              </td>
              <td className="py-2 px-3 text-right text-muted-foreground">
                {currency}
                {subtotal.toFixed(2)}
              </td>
            </tr>

            <tr className="border-b border-border bg-muted/20">
              <td className="py-2 px-3 text-muted-foreground">
                {editing ? (
                  <div className="flex gap-2 items-center">
                    <Input
                      value={cgstLabel}
                      onChange={(e) => setCgstLabel(e.target.value)}
                      className="w-24 h-7 text-xs"
                    />
                    <Input
                      type="number"
                      value={cgstPercent}
                      onChange={(e) =>
                        setCgstPercent(parseFloat(e.target.value) || 0)
                      }
                      className="w-16 h-7 text-xs"
                    />
                    <span className="text-xs">%</span>
                  </div>
                ) : (
                  <span>
                    {cgstLabel} ({cgstPercent}%)
                  </span>
                )}
              </td>
              <td className="py-2 px-3 text-right text-muted-foreground">
                {currency}
                {cgstAmount.toFixed(2)}
              </td>
            </tr>

            <tr className="border-b border-border bg-muted/20">
              <td className="py-2 px-3 text-muted-foreground">
                {editing ? (
                  <div className="flex gap-2 items-center">
                    <Input
                      value={sgstLabel}
                      onChange={(e) => setSgstLabel(e.target.value)}
                      className="w-24 h-7 text-xs"
                    />
                    <Input
                      type="number"
                      value={sgstPercent}
                      onChange={(e) =>
                        setSgstPercent(parseFloat(e.target.value) || 0)
                      }
                      className="w-16 h-7 text-xs"
                    />
                    <span className="text-xs">%</span>
                  </div>
                ) : (
                  <span>
                    {sgstLabel} ({sgstPercent}%)
                  </span>
                )}
              </td>
              <td className="py-2 px-3 text-right text-muted-foreground">
                {currency}
                {sgstAmount.toFixed(2)}
              </td>
            </tr>

            <tr className="bg-amber-50 dark:bg-amber-950/30 border-b-2 border-amber-200">
              <td className="py-3 px-3 font-bold text-amber-900 dark:text-amber-200 text-base">
                Total
              </td>
              <td className="py-3 px-3 text-right font-bold text-amber-900 dark:text-amber-200 text-base">
                {currency}
                {total.toFixed(2)}
              </td>
            </tr>

            <tr className="border-b border-border bg-emerald-50/50 dark:bg-emerald-950/20">
              <td className="py-2 px-3 text-emerald-700 dark:text-emerald-400">
                Advance Paid
              </td>
              <td className="py-2 px-3 text-right text-emerald-700 dark:text-emerald-400">
                {editing ? (
                  <Input
                    type="number"
                    className="w-28 ml-auto text-right h-8"
                    value={advancePaid}
                    onChange={(e) => setAdvancePaid(e.target.value)}
                  />
                ) : (
                  `− ${currency}${parseFloat(advancePaid).toFixed(2)}`
                )}
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
                {(balance === 0 ? 0 : balance).toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>

        {(extraNotes || editing) && (
          <div className="text-sm bg-muted/30 rounded-lg p-3 border-l-4 border-amber-400">
            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">
              Notes
            </p>
            {editing ? (
              <Textarea
                value={extraNotes}
                onChange={(e) => setExtraNotes(e.target.value)}
                rows={2}
              />
            ) : (
              <p>{extraNotes}</p>
            )}
          </div>
        )}

        <div className="text-center text-xs text-muted-foreground border-t border-border pt-3">
          {invoiceFooter}
        </div>
      </div>
    </div>
  );
}