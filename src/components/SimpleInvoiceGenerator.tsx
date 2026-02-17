import { useState } from "react";
import { getSettings } from "@/lib/settingsStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Printer, X, Plus } from "lucide-react";

interface SimpleInvoiceGeneratorProps {
  onClose: () => void;
}

export default function SimpleInvoiceGenerator({ onClose }: SimpleInvoiceGeneratorProps) {
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
  const [items, setItems] = useState<{ desc: string; amount: string }[]>([{ desc: "", amount: "" }]);
  const [taxAmount, setTaxAmount] = useState("");
  const [footer, setFooter] = useState(s.invoiceFooter);

  const addItem = () => setItems([...items, { desc: "", amount: "" }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: "desc" | "amount", value: string) => {
    const n = [...items];
    n[idx] = { ...n[idx], [field]: value };
    setItems(n);
  };

  const subtotal = items.reduce((sum, i) => sum + parseFloat(i.amount || "0"), 0);
  const tax = parseFloat(taxAmount || "0");
  const total = subtotal + tax;
  const invoiceId = "INV-" + Date.now().toString(36).toUpperCase();

  function escapeHtml(text: string): string {
    const el = document.createElement("div");
    el.textContent = text;
    return el.innerHTML;
  }

  const handlePrint = () => {
    const itemRows = items
      .filter((i) => i.desc || i.amount)
      .map((i) => `<tr><td class="inv-desc">${escapeHtml(i.desc || "—")}</td><td class="inv-amt">${s.currency}${parseFloat(i.amount || "0").toFixed(2)}</td></tr>`)
      .join("");
    const printBody = `
      <div class="inv-page">
        <div class="inv-letterhead">
          <div class="inv-letterhead-inner">
            <h1 class="inv-brand">${escapeHtml(businessName)}</h1>
            <p class="inv-doctitle">${escapeHtml(invoiceTitle)}</p>
            <div class="inv-business-details">
              <p class="inv-gst">GSTIN: ${escapeHtml(businessGst || "—")}</p>
              <p class="inv-address">Location: ${escapeHtml(businessAddress || "—")}</p>
              <p class="inv-phone">Ph: ${escapeHtml(businessPhone || "—")}</p>
            </div>
          </div>
        </div>
        <div class="inv-meta">
          <div class="inv-billto">
            <p class="inv-label">Bill To / Customer</p>
            <p class="inv-guest">${escapeHtml(customerName || "—")}</p>
            <p class="inv-muted">Ph: ${escapeHtml(phone || "—")}</p>
            <p class="inv-company">Company: ${escapeHtml(companyName || "—")}</p>
            <p class="inv-muted">GST: ${escapeHtml(gstNumber || "—")}</p>
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
            <tr><th class="inv-th-left">Description</th><th class="inv-th-right">Amount</th></tr>
          </thead>
          <tbody>
            ${itemRows}
            <tr class="inv-row-sub"><td class="inv-desc">Subtotal</td><td class="inv-amt">${s.currency}${subtotal.toFixed(2)}</td></tr>
            <tr class="inv-row-sub"><td class="inv-desc">Tax</td><td class="inv-amt">${s.currency}${tax.toFixed(2)}</td></tr>
            <tr class="inv-row-total"><td class="inv-desc">Total</td><td class="inv-amt">${s.currency}${total.toFixed(2)}</td></tr>
          </tbody>
        </table>
        <div class="inv-footer"><p>${escapeHtml(footer)}</p></div>
      </div>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html><head>
        <meta charset="utf-8">
        <title>Invoice - ${escapeHtml(customerName || "Invoice")}</title>
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
      </head><body>${printBody}</body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  return (
    <div className="space-y-4 max-h-[85vh] overflow-y-auto">
      <div className="flex justify-between items-center sticky top-0 bg-background py-2 border-b">
        <h3 className="text-lg font-bold">Simple Invoice Generator</h3>
        <div className="flex gap-2">
          <Button size="sm" onClick={handlePrint}><Printer className="h-4 w-4 mr-1" /> Print</Button>
          <Button size="sm" variant="outline" onClick={onClose}><X className="h-4 w-4" /></Button>
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
          <Label>Line items</Label>
          <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </div>
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <Input value={item.desc} onChange={(e) => updateItem(idx, "desc", e.target.value)} placeholder="Description" className="flex-1" />
              <Input type="number" value={item.amount} onChange={(e) => updateItem(idx, "amount", e.target.value)} placeholder="Amount" className="w-28" />
              <Button type="button" size="icon" variant="ghost" onClick={() => removeItem(idx)}><X className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 items-center mt-2">
          <Label className="w-20">Tax</Label>
          <Input type="number" value={taxAmount} onChange={(e) => setTaxAmount(e.target.value)} placeholder="0" className="w-28" />
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        <Label>Footer text</Label>
        <Textarea value={footer} onChange={(e) => setFooter(e.target.value)} rows={2} className="mt-1" />
      </div>

      {/* Preview (content used for print) - real bill format */}
      <div id="simple-invoice-print" className="bg-muted/30 border rounded-lg p-6 text-sm">
        <div className="text-center mb-4 pb-3 border-b border-border">
          <h1 className="text-2xl font-bold">{businessName}</h1>
          <p className="text-muted-foreground text-sm">{invoiceTitle}</p>
          <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
            <p className="font-medium text-foreground/90">GSTIN: {businessGst || "—"}</p>
            <p>Location: {businessAddress || "—"}</p>
            <p>Ph: {businessPhone || "—"}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-muted-foreground text-xs uppercase">Bill To / Customer</p>
            <p className="font-semibold">{customerName || "—"}</p>
            <p className="text-muted-foreground">Ph: {phone || "—"}</p>
            <p>Company: {companyName || "—"}</p>
            <p className="text-muted-foreground">GST: {gstNumber || "—"}</p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground">Invoice #</p>
            <p className="font-semibold">{invoiceId}</p>
            <p className="text-muted-foreground">{new Date().toLocaleDateString("en-IN")}</p>
          </div>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Description</th>
              <th className="text-right py-2">Amount ({s.currency})</th>
            </tr>
          </thead>
          <tbody>
            {items.filter((i) => i.desc || i.amount).map((item, idx) => (
              <tr key={idx} className="border-b">
                <td className="py-2">{item.desc || "—"}</td>
                <td className="py-2 text-right">{s.currency}{parseFloat(item.amount || "0").toFixed(2)}</td>
              </tr>
            ))}
            <tr className="border-b">
              <td className="py-2">Subtotal</td>
              <td className="py-2 text-right">{s.currency}{subtotal.toFixed(2)}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2">Tax</td>
              <td className="py-2 text-right">{s.currency}{tax.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="py-2 font-bold">Total</td>
              <td className="py-2 text-right font-bold">{s.currency}{total.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        <p className="text-center text-muted-foreground text-xs mt-4">{footer}</p>
      </div>

      <p className="text-xs text-muted-foreground">Fill the form above and click Print. The invoice will open in a new window for printing.</p>
    </div>
  );
}
