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
  const [businessAddress, setBusinessAddress] = useState(s.businessAddress ?? "");
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

  const addItem = () => setItems([...items, { desc: "", amount: "" }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: "desc" | "amount", value: string) => {
    const n = [...items];
    n[idx] = { ...n[idx], [field]: value };
    setItems(n);
  };

  // --- CALCULATION LOGIC (TAX EXCLUSIVE) ---
  const round = (n: number) => Math.round(n * 100) / 100;

  // Process items: Input is now treated as Pre-Tax (Base) price
  const processedItems = items.map(item => {
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
  
  const invoiceId = "INV-" + Date.now().toString(36).toUpperCase();

  function escapeHtml(text: string): string {
    const el = document.createElement("div");
    el.textContent = text;
    return el.innerHTML;
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
      extraItems: processedItems.map((i) => ({ desc: i.desc, amount: i.preTax })),
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
          body { margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, sans-serif; font-size: 14px; color: #1f2937; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @media print { body { padding: 0; } .inv-page { box-shadow: none !important; border: 1px solid #e5e7eb !important; } }
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
          .inv-footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 0.8rem; color: #9ca3af; }
      </style>
      <div class="inv-page">
        <div class="inv-letterhead">
         <div class="inv-letterhead-inner">
           <h1 class="inv-brand">${escapeHtml(sanitize(businessName))}</h1>
           <p class="inv-doctitle">${escapeHtml(sanitize(invoiceTitle))}</p>
           <div class="inv-business-details">
             <p class="inv-gst">GSTIN: ${escapeHtml(sanitize(businessGst || "—"))}</p>
             <p class="inv-address">Location: ${escapeHtml(sanitize(businessAddress || "—"))}</p>
             <p class="inv-phone">Ph: ${escapeHtml(sanitize(businessPhone || "—"))}</p>
           </div>
         </div>
        </div>
        <div class="inv-meta">
         <div class="inv-billto">
           <p class="inv-label">Bill To / Customer</p>
           <p class="inv-guest">${escapeHtml(sanitize(customerName || "—"))}</p>
           <p class="inv-muted">Ph: ${escapeHtml(sanitize(phone || "—"))}</p>
           <p class="inv-company">Company: ${escapeHtml(sanitize(companyName || "—"))}</p>
           <p class="inv-muted">GST: ${escapeHtml(sanitize(gstNumber || "—"))}</p>
         </div>
         <div class="inv-invoice-meta">
           <table class="inv-meta-table">
             <tr><td class="inv-label">Invoice No.</td><td class="inv-value">${invoiceId}</td></tr>
             <tr><td class="inv-label">Date</td><td class="inv-value">${new Date().toLocaleDateString("en-IN")}</td></tr>
           </table>
         </div>
        </div>
        <table class="inv-table">
         <thead>
           <tr><th class="inv-th-left">Description</th><th class="inv-th-right">Amount (Base Price)</th></tr>
         </thead>
         <tbody>
           ${itemRows}
           <tr class="inv-row-sub"><td class="inv-desc">Subtotal</td><td class="inv-amt">${s.currency}${subtotal.toFixed(2)}</td></tr>
           <tr class="inv-row-sub"><td class="inv-desc">${cgstLabel} (${cgstPercent}%)</td><td class="inv-amt">${s.currency}${cgstAmount.toFixed(2)}</td></tr>
           <tr class="inv-row-sub"><td class="inv-desc">${sgstLabel} (${sgstPercent}%)</td><td class="inv-amt">${s.currency}${sgstAmount.toFixed(2)}</td></tr>
           <tr class="inv-row-total"><td class="inv-desc">Total (Incl. Tax)</td><td class="inv-amt">${s.currency}${total.toFixed(2)}</td></tr>
         </tbody>
        </table>
        <div class="inv-footer"><p>${escapeHtml(sanitize(footer))}</p></div>
      </div>`;
  };

  const createSimplePDFBlob = async (): Promise<Blob> => {
    const html = buildPrintHtmlSimple();
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-10000px";
    container.style.top = "-10000px";
    container.style.opacity = "0";
    container.innerHTML = html;
    document.body.appendChild(container);
    const doc = new jsPDF({ unit: "pt" });
    await doc.html(container, { callback: () => {}, x: 0, y: 0, html2canvas: { scale: 1 } });
    const blob = doc.output("blob");
    document.body.removeChild(container);
    return blob;
  };

  const handleDownload = async () => {
    try {
      saveInvoice(gatherInvoiceData());
    } catch {}
    try {
      const blob = await createSimplePDFBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate PDF");
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
          <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Invoice title</Label>
          <Input value={invoiceTitle} onChange={(e) => setInvoiceTitle(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Restaurant GST number</Label>
          <Input value={businessGst} onChange={(e) => setBusinessGst(e.target.value)} placeholder="GSTIN" />
        </div>
        <div className="space-y-2">
          <Label>Restaurant phone</Label>
          <Input value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} placeholder="Phone" />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Restaurant location / address</Label>
          <Input value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} placeholder="Address" />
        </div>
      </div>

      <div className="border-t pt-4">
        <Label className="text-muted-foreground">Bill To</Label>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" />
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
          <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company name" />
          <Input value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} placeholder="GST number" />
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
              <Button type="button" size="icon" variant="ghost" onClick={() => removeItem(idx)}>
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
        <Textarea value={footer} onChange={(e) => setFooter(e.target.value)} rows={2} className="mt-1" />
      </div>

      {/* Preview */}
      <div id="simple-invoice-print" className="bg-muted/30 border rounded-lg p-6 text-sm">
        <div className="text-center mb-4 pb-3 border-b border-border">
          <h1 className="text-2xl font-bold">{businessName}</h1>
          <p className="text-muted-foreground text-sm uppercase tracking-widest">{invoiceTitle}</p>
          <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
            <p className="font-medium text-foreground/90">GSTIN: {businessGst || "—"}</p>
            <p>Location: {businessAddress || "—"}</p>
            <p>Ph: {businessPhone || "—"}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Bill To</p>
            <p className="font-semibold">{customerName || "—"}</p>
            <p className="text-muted-foreground text-xs">{phone || "—"}</p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-[10px] uppercase font-bold">Invoice #</p>
            <p className="font-semibold">{invoiceId}</p>
            <p className="text-muted-foreground text-xs">{new Date().toLocaleDateString("en-IN")}</p>
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
                    {s.currency}{item.preTax.toFixed(2)}
                  </td>
                </tr>
              ))}
            <tr className="bg-muted/10">
              <td className="py-2 px-2 font-medium">Subtotal</td>
              <td className="py-2 px-2 text-right">
                {s.currency}{subtotal.toFixed(2)}
              </td>
            </tr>
            <tr>
              <td className="py-2 px-2 text-muted-foreground">
                {cgstLabel} ({cgstPercent}%)
              </td>
              <td className="py-2 px-2 text-right text-muted-foreground">
                {s.currency}{cgstAmount.toFixed(2)}
              </td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2 text-muted-foreground">
                {sgstLabel} ({sgstPercent}%)
              </td>
              <td className="py-2 px-2 text-right text-muted-foreground">
                {s.currency}{sgstAmount.toFixed(2)}
              </td>
            </tr>
            <tr className="bg-amber-50">
              <td className="py-2 px-2 font-bold">Grand Total</td>
              <td className="py-2 px-2 text-right font-bold">
                {s.currency}{total.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
        <p className="text-center text-muted-foreground text-[10px] mt-6 italic">
          {footer}
        </p>
      </div>

      <p className="text-[10px] text-muted-foreground bg-green-50 p-2 rounded border border-green-100 italic">
        * Note: Enter the Base Price (Tax Exclusive) in the "Line items". GST will be calculated and added to the Grand Total.
      </p>
    </div>
  );
}