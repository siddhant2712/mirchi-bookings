import { useState } from "react";

import { getSettings } from "@/lib/settingsStore";

import { saveInvoice, StoredInvoice } from "@/lib/invoiceStore";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Textarea } from "@/components/ui/textarea";

import { Printer, X, Plus, Download } from "lucide-react";

import { toast } from "sonner";

import jsPDF from "jspdf";

interface SimpleInvoiceGeneratorProps {
  onClose: () => void;
}

export default function SimpleInvoiceGenerator({
  onClose,
}: SimpleInvoiceGeneratorProps) {
  const s = getSettings();

  const [businessName, setBusinessName] = useState(s.businessName);

  const [invoiceTitle, setInvoiceTitle] = useState(s.invoiceTitle);

  const [businessGst, setBusinessGst] = useState(s.businessGstNumber ?? "");

  const [businessAddress, setBusinessAddress] = useState(
    s.businessAddress ?? "",
  );

  const [businessPhone, setBusinessPhone] = useState(s.businessContact ?? "");

  const [customerName, setCustomerName] = useState("");

  const [companyName, setCompanyName] = useState("");

  const [gstNumber, setGstNumber] = useState("");

  const [phone, setPhone] = useState("");

  const [items, setItems] = useState<{ desc: string; amount: string }[]>([
    { desc: "", amount: "" },
  ]);

  const [cgstLabel, setCgstLabel] = useState(s.cgstLabel);

  const [sgstLabel, setSgstLabel] = useState(s.sgstLabel);

  const [cgstPercent, setCgstPercent] = useState(s.cgstPercent);

  const [sgstPercent, setSgstPercent] = useState(s.sgstPercent);

  const [footer, setFooter] = useState(s.invoiceFooter);

  const [checkIn, setCheckIn] = useState("");

  const [checkOut, setCheckOut] = useState("");

  const [invoiceNumber, setInvoiceNumber] = useState(
    "INV-" + Date.now().toString(36).toUpperCase(),
  );

  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

  const [gstError, setGstError] = useState("");

  const addItem = () => setItems([...items, { desc: "", amount: "" }]);

  const removeItem = (idx: number) =>
    setItems(items.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: "desc" | "amount", value: string) => {
    const n = [...items];

    n[idx] = { ...n[idx], [field]: value };

    setItems(n);
  };

  // --- CALCULATION LOGIC (TAX EXCLUSIVE) ---

  const round = (n: number) => Math.round(n * 100) / 100;

  // Process items: Input is now treated as Pre-Tax (Base) price

  const processedItems = items.map((item) => {
    const baseVal = parseFloat(item.amount || "0");

    const cgstForThisItem = round(baseVal * (cgstPercent / 100));

    const sgstForThisItem = round(baseVal * (sgstPercent / 100));

    const grossVal = baseVal + cgstForThisItem + sgstForThisItem;

    return { ...item, preTax: baseVal, gross: grossVal };
  });

  const subtotal = round(processedItems.reduce((sum, i) => sum + i.preTax, 0));

  const cgstAmount = round(subtotal * (cgstPercent / 100));

  const sgstAmount = round(subtotal * (sgstPercent / 100));

  const total = round(subtotal + cgstAmount + sgstAmount);

  const invoiceId = invoiceNumber;

  function escapeHtml(text: string): string {
    const el = document.createElement("div");

    el.textContent = text;

    return el.innerHTML;
  }

  function sanitize(text: string): string {
    return String(text || "")
      .replace(/&/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  const gatherInvoiceData = (): StoredInvoice => {
    const now = new Date().toISOString();

    const subtotalVal = subtotal;

    const cgstAmt = cgstAmount;

    const sgstAmt = sgstAmount;

    const totalVal = total;

    const balanceVal = totalVal; // no advance concept here

    return {
      id: `simple-${now}`,

      bookingId: `simple-${now}`,

      createdAt: now,

      guestName: customerName || "",

      phone,

      description: "",

      dateRange: new Date().toLocaleDateString("en-IN"),

      roomBaseAmount: subtotalVal,

      extraItems: processedItems.map((i) => ({
        desc: i.desc,
        amount: i.preTax,
      })),

      advancePaid: 0,

      extraNotes: "",

      subtotal: subtotalVal,

      cgstLabel,

      sgstLabel,

      cgstPercent,

      sgstPercent,

      cgstAmount: cgstAmt,

      sgstAmount: sgstAmt,

      totalTax: cgstAmt + sgstAmt,

      total: totalVal,

      balance: balanceVal,

      currency: s.currency || "",

      hotelName: businessName,

      hotelGstNumber: businessGst,

      hotelAddress: businessAddress,

      hotelPhone: businessPhone,

      invoiceTitle,

      invoiceFooter: footer,
    };
  };

  // reuse both in print and pdf download

  const buildPrintHtmlSimple = () => {
    const itemRows = processedItems
      .filter((i) => i.desc || i.amount)
      .map(
        (i) =>
          `<tr>
            <td class="inv-desc">${escapeHtml(sanitize(i.desc || "—"))}</td>
            <td class="inv-amt">${s.currency}${i.preTax.toFixed(2)}</td>
          </tr>`,
      )
      .join("");

    return `
      <style>
          * { box-sizing: border-box; }
          
          @page {
            size: A4;
            margin: 0;
          }

          body { 
            margin: 0; padding: 0; 
            font-family: 'Segoe UI', system-ui, sans-serif; 
            font-size: 14px; color: #1f2937; 
            background-color: #f3f4f6;
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
          }

          @media print { 
            body { background: none; } 
            .inv-page { box-shadow: none !important; border: 1px solid #d1d5db !important; } 
          }

          /* Fixed A4 Container with Page Border */
          .inv-page { 
            width: 210mm; 
            height: 297mm; 
            margin: 0 auto; 
            padding: 15mm; 
            background: #fff; 
            border: 2px solid #e5e7eb; /* Subtle page border */
            display: flex;
            flex-direction: column;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
          }

          .inv-letterhead { text-align: center; padding-bottom: 20px; border-bottom: 2px solid #d97706; margin-bottom: 20px; }
          .inv-letterhead-inner { max-width: 480px; margin: 0 auto; }
          .inv-brand { font-size: 1.5rem; font-weight: 700; color: #b45309; margin: 0; letter-spacing: 0.02em; }
          .inv-doctitle { font-size: 0.85rem; color: #6b7280; margin: 6px 0 0; text-transform: uppercase; letter-spacing: 0.06em; }
          .inv-business-details { margin-top: 10px; font-size: 0.8rem; color: #4b5563; line-height: 1.5; }
          .inv-gst { font-weight: 600; color: #374151; margin: 0 0 2px; }

          .inv-meta { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px; font-size: 0.9rem; }
          .inv-billto { flex: 1; }
          .inv-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin: 0 0 4px; }
          .inv-guest { font-weight: 600; margin: 0 0 2px; }
          .inv-muted { margin: 0; color: #6b7280; font-size: 0.85rem; }

          .inv-meta-table { margin-left: auto; border-collapse: collapse; }
          .meta-label { font-size: 0.75rem; font-weight: 600; color: #6b7280; padding: 4px 16px 4px 0; text-align: left; min-width: 95px; }
          .meta-value { font-size: 0.85rem; font-weight: 600; color: #111827; padding: 4px 0; text-align: right; }

          .inv-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; flex-grow: 1; }
          .inv-th-left, .inv-th-right { text-align: left; padding: 10px 12px; background: #f8fafc; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0; }
          .inv-th-right { text-align: right; }
          .inv-desc, .inv-amt { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
          .inv-amt { text-align: right; }

          .inv-row-sub .inv-desc { color: #64748b; text-align: right; padding-right: 20px; }
          .inv-row-total { background: #fef3c7; }
          .inv-row-total .inv-desc, .inv-row-total .inv-amt { font-weight: 700; border-bottom: 2px solid #fcd34d; color: #b45309; }

          /* Signature Boxed Area */
          .inv-signature-container {
            margin-top: 30px;
            padding: 20px;
            border: 1px solid #e5e7eb; /* Border around signature area */
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            background-color: #fdfdfd;
          }

          .sig-block { text-align: center; width: 180px; }
          .sig-line { border-top: 1px solid #374151; margin-bottom: 8px; margin-top: 40px; }
          .sig-text { font-size: 11px; font-weight: 600; color: #4b5563; text-transform: uppercase; }

          .inv-footer { margin-top: 20px; text-align: center; font-size: 0.75rem; color: #9ca3af; }
      </style>

      <div class="inv-page">
        <div class="inv-letterhead">
          <div class="inv-letterhead-inner">
            <h1 class="inv-brand">${escapeHtml(sanitize(businessName))}</h1>
            <p class="inv-doctitle">${escapeHtml(sanitize(invoiceTitle))}</p>
            <div class="inv-business-details">
              <p class="inv-gst">GSTIN: ${escapeHtml(sanitize(businessGst || "—"))}</p>
              <p class="inv-address">${escapeHtml(sanitize(businessAddress || "—"))}</p>
              <p class="inv-phone">Ph: ${escapeHtml(sanitize(businessPhone || "—"))}</p>
            </div>
          </div>
        </div>

        <div class="inv-meta">
          <div class="inv-billto">
            <p class="inv-label">Bill To</p>
            <p class="inv-guest">${escapeHtml(sanitize(customerName || "—"))}</p>
            <p class="inv-muted">Ph: ${escapeHtml(sanitize(phone || "—"))}</p>
            <p class="inv-muted">GST: ${escapeHtml(sanitize(gstNumber || "—"))}</p>
          </div>
          <div class="inv-invoice-meta">
            <table class="inv-meta-table">
              <tr><td class="meta-label">Invoice No.</td><td class="meta-value">#${invoiceId}</td></tr>
              <tr><td class="meta-label">Check-In</td><td class="meta-value">${checkIn ? new Date(checkIn).toLocaleDateString("en-IN") : "—"}</td></tr>
              <tr><td class="meta-label">Check-Out</td><td class="meta-value">${checkOut ? new Date(checkOut).toLocaleDateString("en-IN") : "—"}</td></tr>
              <tr>
  <td class="meta-label">Date</td>
  <td class="meta-value">
    ${new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })}
  </td>
</tr></table>
          </div>
        </div>

        <table class="inv-table">
          <thead>
            <tr><th class="inv-th-left">Description</th><th class="inv-th-right">Amount</th></tr>
          </thead>
          <tbody>
            ${itemRows}
            <tr class="inv-row-sub"><td class="inv-desc">Subtotal</td><td class="inv-amt">${s.currency}${subtotal.toFixed(2)}</td></tr>
            <tr class="inv-row-sub"><td class="inv-desc">${cgstLabel} (${cgstPercent}%)</td><td class="inv-amt">${s.currency}${cgstAmount.toFixed(2)}</td></tr>
            <tr class="inv-row-sub"><td class="inv-desc">${sgstLabel} (${sgstPercent}%)</td><td class="inv-amt">${s.currency}${sgstAmount.toFixed(2)}</td></tr>
            <tr class="inv-row-total"><td class="inv-desc">Total Amount</td><td class="inv-amt">${s.currency}${total.toFixed(2)}</td></tr>
          </tbody>
        </table>

        <div class="inv-signature-container">
          <div class="sig-block">
            <div class="sig-line"></div>
            <span class="sig-text">Guest Signature</span>
          </div>
          <div class="sig-block">
            <div class="sig-line"></div>
            <span class="sig-text">Authorized Signatory</span>
          </div>
        </div>

        <div class="inv-footer">
          ${escapeHtml(sanitize(footer))}
        </div>
      </div>`;
  };
  const createSimplePDFBlob = async (): Promise<Blob> => {
    const html = buildPrintHtmlSimple();

    const container = document.createElement("div");

    container.style.position = "fixed";

    container.style.left = "50%";

    container.style.top = "50%";

    container.style.transform = "translate(-50%, -50%)";

    container.style.zIndex = String(2147483647);

    // Compute container width in pixels from jsPDF points (1pt = 1/72in, 96dpi => 1pt = 1.3333px)

    const tmpDoc = new jsPDF({ unit: "pt", format: "a4" });

    const pagePtWidth = tmpDoc.internal.pageSize.getWidth();

    const pxPerPt = 96 / 72; // convert points to CSS pixels at 96dpi

    container.style.width = `${Math.round(pagePtWidth * pxPerPt)}px`;

    // free tmpDoc

    try {
      tmpDoc.delete?.();
    } catch { }

    container.style.background = "#fff";

    container.innerHTML = html;

    document.body.appendChild(container);

    // Prefer using html2canvas -> image -> addImage for exact control and paging.

    // Try to dynamically import html2canvas (we added it to package.json). If not available, fallback to doc.html.

    const doc = new jsPDF({ unit: "pt", format: "a4" });

    const pageWidth = doc.internal.pageSize.getWidth();

    const pageHeight = doc.internal.pageSize.getHeight();

    const pxToPt = 72 / 96;

    const scale = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);

    try {
      const html2canvasMod = await import("html2canvas");

      const html2canvas = (html2canvasMod &&
        (html2canvasMod.default || html2canvasMod)) as any;

      // append container (visible) so html2canvas can render it

      container.innerHTML = html;

      document.body.appendChild(container);

      // render full element to canvas

      const canvas: HTMLCanvasElement = await html2canvas(container, {
        scale,

        useCORS: true,

        backgroundColor: "#ffffff",

        width: container.clientWidth,
      });

      // slice canvas into page-sized chunks (in px) and add each as an image

      const pagePxHeight = Math.floor(pageHeight * pxPerPt);

      const totalPages = Math.ceil(canvas.height / pagePxHeight);

      for (let i = 0; i < totalPages; i++) {
        const sliceCanvas = document.createElement("canvas");

        sliceCanvas.width = canvas.width;

        const sliceHeight =
          i === totalPages - 1
            ? canvas.height - i * pagePxHeight
            : pagePxHeight;

        sliceCanvas.height = sliceHeight;

        const ctx = sliceCanvas.getContext("2d");

        if (!ctx) throw new Error("Canvas context unavailable");

        ctx.fillStyle = "#ffffff";

        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);

        ctx.drawImage(
          canvas,
          0,
          i * pagePxHeight,
          canvas.width,
          sliceHeight,
          0,
          0,
          canvas.width,
          sliceHeight,
        );

        const imgData = sliceCanvas.toDataURL("image/png");

        const imgWidthPt = pageWidth;

        const imgHeightPt = sliceCanvas.height * pxToPt;

        if (i > 0) doc.addPage();

        doc.addImage(imgData, "PNG", 0, 0, imgWidthPt, imgHeightPt);
      }

      // cleanup

      document.body.removeChild(container);

      const blob = doc.output("blob");

      return blob;
    } catch (e) {
      // fallback to jsPDF.html path if html2canvas import or rendering fails

      try {
        container.innerHTML = html;

        document.body.appendChild(container);

        const cssWidth =
          container.clientWidth || Math.round(pageWidth * (96 / 72));

        await new Promise<void>((resolve, reject) => {
          try {
            doc.html(container, {
              callback: () => resolve(),

              x: 0,

              y: 0,

              html2canvas: { scale, width: cssWidth },

              width: pageWidth,
            });
          } catch (err) {
            reject(err);
          }
        });

        const blob = doc.output("blob");

        document.body.removeChild(container);

        return blob;
      } catch (err) {
        try {
          document.body.removeChild(container);
        } catch { }

        throw err;
      }
    }

    const blob = doc.output("blob");

    document.body.removeChild(container);

    return blob;
  };

  const handleDownload = async () => {
    // do not persist the invoice when downloading; storage happens only on print

    try {
      const blob = await createSimplePDFBlob();

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");

      a.style.display = "none";

      a.href = url;

      a.download = `invoice-${invoiceId}.pdf`;

      document.body.appendChild(a);

      a.click();

      // cleanup after a short delay to ensure the download has started

      setTimeout(() => {
        try {
          document.body.removeChild(a);
        } catch { }

        try {
          URL.revokeObjectURL(url);
        } catch { }
      }, 1000);
    } catch (e) {
      console.error(e);

      toast.error("Failed to generate PDF");
    }
  };

  const handlePrint = () => {
    if (gstNumber) {
      if (gstNumber.length !== 15 || !gstRegex.test(gstNumber)) {
        alert("Invalid GST Number.\n\nFormat should be like:\n22AAAAA0000A1Z5");
      }
    }

    try {
      saveInvoice(gatherInvoiceData());
    } catch { }

    try {
      const html = buildPrintHtmlSimple();

      const w = window.open("", "_blank", "width=800,height=600");

      if (!w) {
        toast.error("Unable to open print window");

        return;
      }

      w.document.write(html);

      w.document.close();

      w.focus();

      setTimeout(() => {
        try {
          w.print();
        } catch (e) {
          console.error(e);
        }
      }, 250);
    } catch (e) {
      console.error(e);

      toast.error("Failed to open print preview");
    }
  };

  return (
    <div className="space-y-4 max-h-[85vh] overflow-y-auto">
      <div className="flex justify-between items-center sticky top-0 bg-background py-2 border-b">
        <h3 className="text-lg font-bold">Simple Invoice Generator</h3>

        <div className="flex gap-2">
          <Button size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>

          <Button size="sm" variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1" /> Download
          </Button>

          <Button size="sm" variant="outline" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          <Label>Your business name</Label>

          <Input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Invoice title</Label>

          <Input
            value={invoiceTitle}
            onChange={(e) => setInvoiceTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Restaurant GST number</Label>

          <Input
            value={businessGst}
            onChange={(e) => setBusinessGst(e.target.value)}
            placeholder="GSTIN"
          />
        </div>

        <div className="space-y-2">
          <Label>Restaurant phone</Label>

          <Input
            value={businessPhone}
            onChange={(e) => setBusinessPhone(e.target.value)}
            placeholder="Phone"
          />
        </div>

        <div className="space-y-2 col-span-2">
          <Label>Restaurant location / address</Label>

          <Input
            value={businessAddress}
            onChange={(e) => setBusinessAddress(e.target.value)}
            placeholder="Address"
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <Label className="text-muted-foreground">Bill To</Label>

        <div className="grid grid-cols-2 gap-3 mt-2">
          <Input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Customer name"
          />

          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone"
          />

          <Input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Company name"
          />

          <Input
            value={gstNumber}
            onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
            placeholder="22AAAAA0000A1Z5"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <Label>Check-In</Label>

          <Input
            type="datetime-local"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
          />
        </div>

        <div>
          <Label>Check-Out</Label>

          <Input
            type="datetime-local"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <Label>Line items (Input Base Price - Tax will be added)</Label>

          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>

        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <Input
                value={item.desc}
                onChange={(e) => updateItem(idx, "desc", e.target.value)}
                placeholder="Room/Description"
                className="flex-1"
              />

              <Input
                type="number"
                value={item.amount}
                onChange={(e) => updateItem(idx, "amount", e.target.value)}
                placeholder="Base Price"
                className="w-36"
              />

              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => removeItem(idx)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="flex gap-2 items-center">
            <Label className="w-20">{cgstLabel} (%)</Label>

            <Input
              type="number"
              value={cgstPercent}
              onChange={(e) => setCgstPercent(parseFloat(e.target.value) || 0)}
              className="w-20"
            />
          </div>

          <div className="flex gap-2 items-center">
            <Label className="w-20">{sgstLabel} (%)</Label>

            <Input
              type="number"
              value={sgstPercent}
              onChange={(e) => setSgstPercent(parseFloat(e.target.value) || 0)}
              className="w-20"
            />
          </div>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        <Label>Footer text</Label>

        <Textarea
          value={footer}
          onChange={(e) => setFooter(e.target.value)}
          rows={2}
          className="mt-1"
        />
      </div>

      {/* Preview */}

      <div
        id="simple-invoice-print"
        className="bg-muted/30 border rounded-lg p-6 text-sm"
      >
        <div className="text-center mb-4 pb-3 border-b border-border">
          <h1 className="text-2xl font-bold">{businessName}</h1>

          <p className="text-muted-foreground text-sm uppercase tracking-widest">
            {invoiceTitle}
          </p>

          <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
            <p className="font-medium text-foreground/90">
              GSTIN: {businessGst || "—"}
            </p>

            <p>Location: {businessAddress || "—"}</p>

            <p>Ph: {businessPhone || "—"}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
              Bill To
            </p>

            <p className="font-semibold">{customerName || "—"}</p>

            <p className="text-muted-foreground text-xs">{phone || "—"}</p>
          </div>

          <div className="text-right">
            <p className="text-muted-foreground text-[10px] uppercase font-bold">
              Invoice #
            </p>

            <p className="font-semibold">{invoiceId}</p>

            <p className="text-muted-foreground text-xs">
              {new Date().toLocaleDateString("en-IN")}
            </p>

            <div>
              <Label>Invoice Number</Label>

              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>

            <p className="text-xs mt-1">
              <span className="font-medium">Check-In:</span>{" "}
              {checkIn
                ? new Date(checkIn).toLocaleDateString("en-IN") +
                " " +
                new Date(checkIn).toLocaleTimeString("en-IN", {
                  hour: "2-digit",

                  minute: "2-digit",

                  hour12: true,
                })
                : "—"}
            </p>

            <p className="text-xs">
              <span className="font-medium">Check-Out:</span>{" "}
              {checkOut
                ? new Date(checkOut).toLocaleDateString("en-IN") +
                " " +
                new Date(checkOut).toLocaleTimeString("en-IN", {
                  hour: "2-digit",

                  minute: "2-digit",

                  hour12: true,
                })
                : "—"}
            </p>
          </div>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b bg-amber-50/50">
              <th className="text-left py-2 px-2 font-bold">Description</th>

              <th className="text-right py-2 px-2 font-bold">Base Price</th>
            </tr>
          </thead>

          <tbody>
            {processedItems

              .filter((i) => i.desc || i.amount)

              .map((item, idx) => (
                <tr key={idx} className="border-b">
                  <td className="py-2 px-2">{item.desc || "—"}</td>

                  <td className="py-2 px-2 text-right">
                    {s.currency}
                    {item.preTax.toFixed(2)}
                  </td>
                </tr>
              ))}

            <tr className="bg-muted/10">
              <td className="py-2 px-2 font-medium">Subtotal</td>

              <td className="py-2 px-2 text-right">
                {s.currency}
                {subtotal.toFixed(2)}
              </td>
            </tr>

            <tr>
              <td className="py-2 px-2 text-muted-foreground">
                {cgstLabel} ({cgstPercent}%)
              </td>

              <td className="py-2 px-2 text-right text-muted-foreground">
                {s.currency}
                {cgstAmount.toFixed(2)}
              </td>
            </tr>

            <tr className="border-b">
              <td className="py-2 px-2 text-muted-foreground">
                {sgstLabel} ({sgstPercent}%)
              </td>

              <td className="py-2 px-2 text-right text-muted-foreground">
                {s.currency}
                {sgstAmount.toFixed(2)}
              </td>
            </tr>

            <tr className="bg-amber-50">
              <td className="py-2 px-2 font-bold">Grand Total</td>

              <td className="py-2 px-2 text-right font-bold">
                {s.currency}
                {total.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-between mt-12 pt-8">
          <div className="text-center">
            <div className="border-t w-40 mx-auto mb-2"></div>

            <p className="text-xs">Guest Signature</p>
          </div>

          <div className="text-center">
            <div className="border-t w-40 mx-auto mb-2"></div>

            <p className="text-xs">Receptionist Signature</p>
          </div>
        </div>

        <p className="text-center text-muted-foreground text-[10px] mt-6 italic">
          {footer}
        </p>
      </div>

      <p className="text-[10px] text-muted-foreground bg-green-50 p-2 rounded border border-green-100 italic">
        * Note: Enter the Base Price (Tax Exclusive) in the "Line items". GST
        will be calculated and added to the Grand Total.
      </p>
    </div>
  );
}

/*blue format
const buildPrintHtmlSimple = () => {
    const itemRows = processedItems
      .filter((i) => i.desc || i.amount)
      .map(
        (i) =>
          `<tr>
            <td class="inv-desc">${escapeHtml(sanitize(i.desc || "—"))}</td>
            <td class="inv-amt">${s.currency}${i.preTax.toFixed(2)}</td>
          </tr>`,
      )
      .join("");

    return `
      <style>
          * { box-sizing: border-box; }
          body { 
            margin: 0; padding: 0; 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            font-size: 13px; color: #334155; 
            -webkit-print-color-adjust: exact; print-color-adjust: exact; 
          }
          @media print { 
            body { padding: 0; background: none; } 
            .inv-page { box-shadow: none !important; border: none !important; margin: 0; width: 100%; } 
          }
          .inv-page { 
            max-width: 210mm; min-height: 297mm; margin: 20px auto; 
            padding: 20mm; background: #fff; border: 1px solid #e2e8f0;
          }
          
          
          .inv-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 30px; border-bottom: 2px solid #f1f5f9; margin-bottom: 30px; }
          .inv-brand-box { flex: 1; }
          .inv-brand { font-size: 24px; font-weight: 800; color: #1e293b; margin: 0; text-transform: uppercase; letter-spacing: -0.02em; }
          .inv-doctitle { font-size: 14px; color: #6366f1; font-weight: 700; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.1em; }
          
          .inv-business-details { margin-top: 12px; font-size: 11px; color: #64748b; line-height: 1.6; }
          .inv-gst-tag { display: inline-block; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 600; color: #475569; margin-top: 4px; }

          
          .inv-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
          .inv-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #94a3b8; margin-bottom: 8px; letter-spacing: 0.05em; }
          .inv-guest-name { font-size: 16px; font-weight: 700; color: #1e293b; margin: 0 0 4px; }
          .inv-muted { font-size: 12px; color: #64748b; margin: 2px 0; }

          
          .inv-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .inv-table th { 
            background: #f8fafc; text-align: left; padding: 12px; 
            font-size: 11px; font-weight: 700; text-transform: uppercase; 
            color: #475569; border-bottom: 2px solid #e2e8f0; 
          }
          .inv-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
          .inv-amt { text-align: right; font-variant-numeric: tabular-nums; }
          
          
          .inv-summary-container { display: flex; justify-content: flex-end; }
          .inv-summary-table { width: 250px; }
          .inv-summary-table td { padding: 8px 12px; font-size: 13px; }
          .inv-row-total { background: #1e293b; color: #fff; }
          .inv-row-total td { font-weight: 700; padding: 12px !important; border-radius: 4px; }

         
          .inv-signatures { margin-top: 60px; display: flex; justify-content: space-between; }
          .sig-box { text-align: center; width: 180px; }
          .sig-line { border-top: 1px solid #cbd5e1; margin-bottom: 8px; }
          .sig-text { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; }

          .inv-footer { margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; }
      </style>

      <div class="inv-page">
        <div class="inv-header">
          <div class="inv-brand-box">
            <h1 class="inv-brand">${escapeHtml(sanitize(businessName))}</h1>
            <p class="inv-doctitle">${escapeHtml(sanitize(invoiceTitle))}</p>
            <div class="inv-business-details">
              <div>${escapeHtml(sanitize(businessAddress || ""))}</div>
              <div>Ph: ${escapeHtml(sanitize(businessPhone || ""))}</div>
              <div class="inv-gst-tag">GSTIN: ${escapeHtml(sanitize(businessGst || "N/A"))}</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div class="inv-label">Invoice Number</div>
            <div style="font-size: 18px; font-weight: 700; color: #1e293b;">#${invoiceId}</div>
            <div class="inv-label" style="margin-top: 15px;">Date of Issue</div>
            <div style="font-weight: 600;">${new Date().toLocaleDateString("en-IN")}</div>
          </div>
        </div>

        <div class="inv-meta">
          <div class="inv-billto">
            <p class="inv-label">Billed To</p>
            <p class="inv-guest-name">${escapeHtml(sanitize(customerName || "Valued Customer"))}</p>
            <p class="inv-muted"><strong>GST:</strong> ${escapeHtml(sanitize(gstNumber || "—"))}</p>
            <p class="inv-muted"><strong>Company:</strong> ${escapeHtml(sanitize(companyName || "—"))}</p>
            <p class="inv-muted"><strong>Contact:</strong> ${escapeHtml(sanitize(phone || "—"))}</p>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
             <div>
                <p class="inv-label">Check-In</p>
                <p class="inv-muted" style="color: #1e293b; font-weight: 500;">
                    ${checkIn ? new Date(checkIn).toLocaleString("en-IN", { dateStyle: 'medium', timeStyle: 'short' }) : "—"}
                </p>
             </div>
             <div>
                <p class="inv-label">Check-Out</p>
                <p class="inv-muted" style="color: #1e293b; font-weight: 500;">
                    ${checkOut ? new Date(checkOut).toLocaleString("en-IN", { dateStyle: 'medium', timeStyle: 'short' }) : "—"}
                </p>
             </div>
          </div>
        </div>

        <table class="inv-table">
          <thead>
            <tr>
              <th>Service Description</th>
              <th style="text-align: right;">Amount (Base)</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <div class="inv-summary-container">
          <table class="inv-summary-table">
            <tr>
              <td style="color: #64748b;">Subtotal</td>
              <td class="inv-amt">${s.currency}${subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">${cgstLabel} (${cgstPercent}%)</td>
              <td class="inv-amt">${s.currency}${cgstAmount.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">${sgstLabel} (${sgstPercent}%)</td>
              <td class="inv-amt">${s.currency}${sgstAmount.toFixed(2)}</td>
            </tr>
            <tr class="inv-row-total">
              <td>Grand Total</td>
              <td class="inv-amt">${s.currency}${total.toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <div class="inv-signatures">
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-text">Guest Signature</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-text">Authorized Signatory</div>
          </div>
        </div>

        <div class="inv-footer">
          ${escapeHtml(sanitize(footer))}
        </div>
      </div>`;
  };/*/

/*Racing red      const buildPrintHtmlSimple = () => {
  const itemRows = processedItems
    .filter((i) => i.desc || i.amount)
    .map(
      (i) =>
        `<div class="spec-row">
          <div class="spec-label">${escapeHtml(sanitize(i.desc || "Performance Service"))}</div>
          <div class="spec-value">${s.currency}${i.preTax.toFixed(2)}</div>
        </div>`,
    )
    .join("");

  return `
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=JetBrains+Mono:wght@400;700&display=swap');
        
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        
        body { 
          margin: 0; padding: 0; 
          font-family: 'JetBrains Mono', monospace; 
          background-color: #0a0a0a;
          color: #ffffff;
        }

        @page { size: A4; margin: 0; }

        @media print { 
          body { background: #0a0a0a; color-adjust: exact; }
          .aero-page { border: none !important; }
        }

        .aero-page { 
          width: 210mm; height: 297mm; 
          margin: 0 auto; background: #0a0a0a;
          display: flex; flex-direction: column;
          overflow: hidden; border: 1px solid #333;
          position: relative;
        }

        .aero-page::before {
          content: ""; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background-image: linear-gradient(45deg, #111 25%, transparent 25%), 
                            linear-gradient(-45deg, #111 25%, transparent 25%), 
                            linear-gradient(45deg, transparent 75%, #111 75%), 
                            linear-gradient(-45deg, transparent 75%, #111 75%);
          background-size: 4px 4px; opacity: 0.3; pointer-events: none;
        }

        
        .aero-header {
          padding: 50px; background: #000;
          border-bottom: 4px solid #e11d48; 
          display: flex; justify-content: space-between; align-items: flex-end;
          position: relative; z-index: 1;
        }

        .brand-logo { font-family: 'Orbitron', sans-serif; }
        .brand-logo h1 { font-size: 32px; font-weight: 900; margin: 0; letter-spacing: 2px; text-transform: uppercase; color: #fff; }
        .brand-logo p { font-size: 10px; color: #e11d48; font-weight: 700; margin-top: 5px; letter-spacing: 4px; }

        .invoice-id-badge {
          background: #e11d48; color: white; padding: 10px 20px;
          clip-path: polygon(10% 0, 100% 0, 90% 100%, 0 100%);
          font-family: 'Orbitron', sans-serif; font-weight: 700; font-size: 18px;
        }

        
        .dashboard-main { padding: 40px 50px; z-index: 1; flex-grow: 1; }

        .dashboard-grid { 
          display: grid; grid-template-columns: 1fr 1fr; gap: 30px; 
          margin-bottom: 40px; 
        }

        .dash-card { 
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);
          padding: 20px; border-radius: 0 15px 0 15px;
        }

        .dash-label { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px; display: block; }
        .dash-val { font-size: 14px; font-weight: 700; color: #fff; }

       
        .spec-sheet { margin-bottom: 40px; }
        .spec-header { 
          font-family: 'Orbitron', sans-serif; font-size: 12px; 
          color: #e11d48; margin-bottom: 20px; border-bottom: 1px solid #333; padding-bottom: 10px;
        }

        .spec-row { 
          display: flex; justify-content: space-between; padding: 15px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05); align-items: center;
        }
        .spec-label { font-size: 14px; font-weight: 400; color: #aaa; }
        .spec-value { font-size: 16px; font-weight: 700; color: #fff; }

  
        .finish-line { 
          background: rgba(255,255,255,0.02); padding: 30px; 
          border-radius: 15px; margin-top: auto;
          display: flex; justify-content: space-between; align-items: center;
        }

        .total-cluster { text-align: right; }
        .grand-total-label { font-family: 'Orbitron', sans-serif; font-size: 10px; color: #666; text-transform: uppercase; }
        .grand-total-value { font-family: 'Orbitron', sans-serif; font-size: 36px; font-weight: 900; color: #fff; line-height: 1; }

    
        .sig-container { display: flex; gap: 40px; }
        .sig-box { width: 140px; }
        .sig-line { border-bottom: 1px solid #e11d48; height: 30px; margin-bottom: 5px; }
        .sig-tag { font-size: 8px; color: #666; text-transform: uppercase; letter-spacing: 1px; }

       
        .aero-footer { 
          padding: 30px 50px; background: #000; font-size: 9px; 
          color: #444; text-align: center; border-top: 1px solid #222;
        }
    </style>

    <div class="aero-page">
      <header class="aero-header">
        <div class="brand-logo">
          <h1>${escapeHtml(sanitize(businessName))}</h1>
          <p>${escapeHtml(sanitize(invoiceTitle))}</p>
        </div>
        <div class="invoice-id-badge">#${invoiceId}</div>
      </header>

      <main class="dashboard-main">
        <div class="dashboard-grid">
          <div class="dash-card">
            <span class="dash-label">Owner / Client</span>
            <div class="dash-val">${escapeHtml(sanitize(customerName || "REGISTRY UNKNOWN"))}</div>
            <div style="font-size: 10px; color: #666; margin-top: 5px;">
              GST: ${escapeHtml(sanitize(gstNumber || "—"))}
            </div>
          </div>
          <div class="dash-card">
            <span class="dash-label">Performance Data</span>
            <div style="display: flex; justify-content: space-between;">
              <div>
                <span class="dash-label" style="font-size: 7px;">IN</span>
                <div class="dash-val" style="font-size: 11px;">${checkIn ? new Date(checkIn).toLocaleDateString() : "—"}</div>
              </div>
              <div>
                <span class="dash-label" style="font-size: 7px;">OUT</span>
                <div class="dash-val" style="font-size: 11px;">${checkOut ? new Date(checkOut).toLocaleDateString() : "—"}</div>
              </div>
              <div>
                <span class="dash-label" style="font-size: 7px;">LOG DATE</span>
                <div class="dash-val" style="font-size: 11px;">${new Date().toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="spec-sheet">
          <div class="spec-header">Service Specifications</div>
          ${itemRows}
        </div>

        <div class="finish-line">
          <div class="sig-container">
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-tag">Guest Signature</div>
            </div>
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-tag">Chief Controller</div>
            </div>
          </div>

          <div class="total-cluster">
            <div class="grand-total-label">Total Performance Fee</div>
            <div class="grand-total-value">${s.currency}${total.toFixed(2)}</div>
            <div style="font-size: 9px; color: #444; margin-top: 5px;">
              TAX INCL: ${s.currency}${(cgstAmount + sgstAmount).toFixed(2)}
            </div>
          </div>
        </div>
      </main>

      <footer class="aero-footer">
        POWERED BY ${escapeHtml(sanitize(businessName))} | 
        LOCATION: ${escapeHtml(sanitize(businessAddress || "GLOBAL"))} | 
        ${escapeHtml(sanitize(footer))}
      </footer>
    </div>`;
};/*/
