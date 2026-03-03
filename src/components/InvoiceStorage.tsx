import { useState, useEffect } from "react";
import {
  StoredInvoice,
  getInvoices,
  deleteInvoice,
  clearInvoices,
  downloadInvoicesJSON,
} from "@/lib/invoiceStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Download, Eye, X, Printer } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import jszip from "jszip";
import { time } from "console";

export default function InvoiceStorage() {
  const [invoices, setInvoices] = useState<StoredInvoice[]>([]);
  const [viewing, setViewing] = useState<StoredInvoice | null>(null);

  const load = () => {
    const arr = getInvoices().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    setInvoices(arr);
  };

  useEffect(() => {
    load();
    window.addEventListener("invoices-updated", load);
    return () => window.removeEventListener("invoices-updated", load);
  }, []);

  const handleDelete = (id: string) => {
    if (confirm("Delete this stored invoice?")) {
      deleteInvoice(id);
      load();
    }
  };

  const renderDetails = (inv: StoredInvoice) => {
    return (
      <div className="space-y-2 text-sm">
        <div>
          <strong>Guest:</strong> {inv.guestName}
        </div>
        <div>
          <strong>Phone:</strong> {inv.phone || "—"}
        </div>
        <div>
          <strong>Description:</strong> {inv.description}
        </div>
        <div>
          <strong>Date range:</strong> {inv.dateRange}
        </div>
        <div>
          <strong>Room base:</strong> {inv.currency}{inv.roomBaseAmount.toFixed(2)}
        </div>
        {inv.extraItems.length > 0 && (
          <div>
            <strong>Extras:</strong>
            <ul className="ml-4 list-disc">
              {inv.extraItems.map((i, idx) => (
                <li key={idx}>
                  {i.desc}: {inv.currency}{i.amount.toFixed(2)}
                </li>
              ))}
            </ul>
          </div>
        )}
        {inv.extraNotes && (
          <div>
            <strong>Notes:</strong> {inv.extraNotes}
          </div>
        )}
        <div>
          <strong>Subtotal:</strong> {inv.currency}{inv.subtotal.toFixed(2)}
        </div>
        <div>
          <strong>{inv.cgstLabel} ({inv.cgstPercent}%):</strong> {inv.currency}{inv.cgstAmount.toFixed(2)}
        </div>
        <div>
          <strong>{inv.sgstLabel} ({inv.sgstPercent}%):</strong> {inv.currency}{inv.sgstAmount.toFixed(2)}
        </div>
        <div>
          <strong>Total tax:</strong> {inv.currency}{inv.totalTax.toFixed(2)}
        </div>
        <div>
          <strong>Total:</strong> {inv.currency}{inv.total.toFixed(2)}
        </div>
        <div>
          <strong>Advance:</strong> {inv.currency}{inv.advancePaid.toFixed(2)}
        </div>
        <div>
          <strong>Balance:</strong> {inv.currency}{inv.balance.toFixed(2)}
        </div>
      </div>
    );
  };

  // helpers to print/download a stored invoice
  function escapeHtml(text: string): string {
    const el = document.createElement("div");
    el.textContent = text;
    return el.innerHTML;
  }

  function normalizeCurrency(curr: string): string {
    let c = curr || "";
    // strip ampersands which may appear from encoding
    c = c.replace(/&/g, "");
    return /^[\x00-\x7F]+$/.test(c) && c.trim() !== "" ? c : "Rs";
  }

  function sanitizeText(s: string): string {
    // remove ampersands and collapse odd spacing
    return s.replace(/&/g, "").trim();
  }

 const printInvoice = (inv: StoredInvoice) => {
  const curr = normalizeCurrency(inv.currency);

  const lineRows = [
    `<tr>
      <td class="inv-desc">
        ${escapeHtml(sanitizeText(inv.description))}<br>
        <span class="inv-muted">${escapeHtml(sanitizeText(inv.dateRange))}</span>
      </td>
      <td class="inv-amt">
        ${curr}${inv.roomBaseAmount.toFixed(2)}
      </td>
    </tr>`,

    ...inv.extraItems
      .filter((i) => i.desc || i.amount)
      .map(
        (i) => `
        <tr>
          <td class="inv-desc">${escapeHtml(i.desc)}</td>
          <td class="inv-amt">
            ${curr}${Number(i.amount || 0).toFixed(2)}
          </td>
        </tr>`
      ),
  ].join("");

  const invoiceNumber = inv.invoiceNumber || "—";

  const printBody = `
    <div class="inv-page">

      <div class="inv-letterhead">
        <h1 class="inv-brand">${escapeHtml(inv.hotelName || "")}</h1>
        <p class="inv-doctitle">${escapeHtml(inv.invoiceTitle || "")}</p>
        <div class="inv-business-details">
          <p>GSTIN: ${escapeHtml(inv.hotelGstNumber || "—")}</p>
          <p>📍 ${escapeHtml(inv.hotelAddress || "—")}</p>
          <p>📞 ${escapeHtml(inv.hotelPhone || "—")}</p>
        </div>
      </div>

      <div class="inv-meta">
        <div>
          <p class="inv-label">Bill To</p>
          <p class="inv-guest">${escapeHtml(inv.guestName)}</p>
          <p class="inv-muted">📞 ${escapeHtml(inv.phone || "—")}</p>
        </div>

        <div>
          <table class="inv-meta-table">
            <tr>
              <td class="meta-label">Invoice No.</td>
              <td class="meta-value">${escapeHtml(invoiceNumber)}</td>
            </tr>
            <tr>
              <td class="meta-label">Invoice Date</td>
              <td class="meta-value">
                ${new Date(inv.createdAt).toLocaleDateString("en-IN")}
              </td>
            </tr>
          </table>
        </div>
      </div>

      <table class="inv-table">
        <thead>
          <tr>
            <th class="inv-th-left">Description</th>
            <th class="inv-th-right">Amount</th>
          </tr>
        </thead>
        <tbody>

          ${lineRows}

          <tr class="inv-row-sub">
            <td class="inv-desc">Subtotal</td>
            <td class="inv-amt">${curr}${inv.subtotal.toFixed(2)}</td>
          </tr>

          <tr class="inv-row-tax">
            <td class="inv-desc">${inv.cgstLabel} (${inv.cgstPercent}%)</td>
            <td class="inv-amt">${curr}${inv.cgstAmount.toFixed(2)}</td>
          </tr>

          <tr class="inv-row-tax">
            <td class="inv-desc">${inv.sgstLabel} (${inv.sgstPercent}%)</td>
            <td class="inv-amt">${curr}${inv.sgstAmount.toFixed(2)}</td>
          </tr>

          <tr class="inv-row-total">
            <td class="inv-desc">Total</td>
            <td class="inv-amt">${curr}${inv.total.toFixed(2)}</td>
          </tr>

          <!-- Hidden In Print -->
          <tr class="inv-row-advance hide-print">
            <td class="inv-desc">Advance Paid</td>
            <td class="inv-amt">− ${curr}${inv.advancePaid.toFixed(2)}</td>
          </tr>

          <tr class="inv-row-balance hide-print">
            <td class="inv-desc">Balance Due</td>
            <td class="inv-amt ${inv.balance > 0 ? "inv-balance-due" : ""}">
              ${curr}${inv.balance.toFixed(2)}
            </td>
          </tr>

        </tbody>
      </table>

      ${
        inv.extraNotes
          ? `<div class="inv-notes">
              <p class="inv-label">Notes</p>
              <p class="inv-muted">${escapeHtml(inv.extraNotes)}</p>
            </div>`
          : ""
      }

      <div class="inv-footer">
        <p>${escapeHtml(inv.invoiceFooter || "")}</p>
      </div>

      <!-- SIGNATURE SECTION -->
      <div class="inv-signatures">
        <div class="inv-sign-box">
          <div class="inv-sign-line"></div>
          <p>Customer Signature</p>
        </div>

        <div class="inv-sign-box">
          <div class="inv-sign-line"></div>
          <p>Authorized Signature</p>
        </div>
      </div>

    </div>
  `;

  const html = `
  <html>
    <head>
      <title>Invoice - ${escapeHtml(inv.guestName)}</title>
      <style>
        * { box-sizing: border-box; }

        body {
          margin: 0;
          font-family: sans-serif;
          font-size: 13px;
          color: #1f2937;
          background: #fff;
        }

        .inv-page {
          width: 210mm;
          min-height: 297mm;
          padding: 15mm;
          margin: 0 auto;
          background: #fff;
        }

        .inv-letterhead {
          text-align: center;
          border-bottom: 3px solid #d97706;
          margin-bottom: 20px;
          padding-bottom: 10px;
        }

        .inv-brand {
          font-size: 1.6rem;
          color: #92400e;
          margin: 0;
        }

        .inv-meta {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .inv-label {
          font-size: 0.7rem;
          color: #9ca3af;
          text-transform: uppercase;
          font-weight: bold;
        }

        .inv-table {
          width: 100%;
          border-collapse: collapse;
        }

        .inv-th-left,
        .inv-th-right {
          background: #fef3c7;
          padding: 10px;
          border-bottom: 2px solid #fcd34d;
        }

        .inv-th-right { text-align: right; }

        .inv-desc,
        .inv-amt {
          padding: 10px;
          border-bottom: 1px solid #f3f4f6;
        }

        .inv-amt { text-align: right; }

        .inv-row-total {
          background: #fef3c7;
          font-weight: bold;
        }

        .inv-balance-due { color: #dc2626; }

        .inv-footer {
          margin-top: 30px;
          text-align: center;
          font-size: 0.8rem;
          color: #9ca3af;
        }

        /* SIGNATURES */
        .inv-signatures {
          margin-top: 60px;
          display: flex;
          justify-content: space-between;
        }

        .inv-sign-box {
          width: 40%;
          text-align: center;
        }

        .inv-sign-line {
          margin: 40px 0 6px 0;
          border-top: 1px solid #000;
        }

        /* PERFECT A4 PRINT */
        @page {
          size: A4;
          margin: 0;
        }

        @media print {
          .hide-print {
            display: none !important;
          }

          html, body {
            width: 210mm;
            height: 297mm;
          }

          .inv-page {
            margin: 0;
          }
        }

      </style>
    </head>
    <body>${printBody}</body>
  </html>
  `;

  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;

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
};

  const downloadInvoicePDF = async (inv: StoredInvoice) => {
    try {
      const blob = await createInvoicePDFBlob(inv);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `invoice-${inv.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try { document.body.removeChild(a); } catch {}
        try { URL.revokeObjectURL(url); } catch {}
      }, 1000);
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate PDF");
    }
  };

  // export all stored invoices individually as PDFs
  // create a PDF blob from invoice data
  // generate a PDF blob by rendering the same HTML used for printing
  const createInvoicePDFBlob = async (inv: StoredInvoice): Promise<Blob> => {
    const htmlString = buildPrintHtml(inv);
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "50%";
    container.style.top = "50%";
    container.style.transform = "translate(-50%, -50%)";
    container.style.zIndex = String(2147483647);
    const tmpDoc = new jsPDF({ unit: "pt", format: "a4" });
    const pagePtWidth = tmpDoc.internal.pageSize.getWidth();
    const pxPerPt = 96 / 72;
    container.style.width = `${Math.round(pagePtWidth * pxPerPt)}px`;
    try { tmpDoc.delete?.(); } catch {}
    container.innerHTML = htmlString;

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pxToPt = 72 / 96;
    const scale = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);

    try {
      const html2canvasMod = await import("html2canvas");
      const html2canvas = (html2canvasMod && (html2canvasMod.default || html2canvasMod)) as any;
      document.body.appendChild(container);
      const canvas: HTMLCanvasElement = await html2canvas(container, {
        scale,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: container.clientWidth,
      });

      const pagePxHeight = Math.floor(pageHeight * pxPerPt);
      const totalPages = Math.ceil(canvas.height / pagePxHeight);

      for (let i = 0; i < totalPages; i++) {
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        const sliceHeight = i === totalPages - 1 ? canvas.height - i * pagePxHeight : pagePxHeight;
        sliceCanvas.height = sliceHeight;
        const ctx = sliceCanvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context unavailable");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(canvas, 0, i * pagePxHeight, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

        const imgData = sliceCanvas.toDataURL("image/png");
        const imgWidthPt = pageWidth;
        const imgHeightPt = sliceCanvas.height * pxToPt;

        if (i > 0) doc.addPage();
        doc.addImage(imgData, "PNG", 0, 0, imgWidthPt, imgHeightPt);
      }

      document.body.removeChild(container);
      const blob = doc.output("blob");
      return blob;
    } catch (e) {
      // fallback to jsPDF.html
      try {
        document.body.appendChild(container);
        await doc.html(container, {
          callback: () => {},
          x: 0,
          y: 0,
          html2canvas: { scale },
          width: pageWidth,
        });
        const blob = doc.output("blob");
        document.body.removeChild(container);
        return blob;
      } catch (err) {
        try { document.body.removeChild(container); } catch {}
        throw err;
      }
    }
  };

  // helper to generate the HTML used by printInvoice (includes styling so PDF rendering works)
  const buildPrintHtml = (inv: StoredInvoice) => {
    const curr = normalizeCurrency(inv.currency);
    const lineRows = [
      `<tr>
        <td class="inv-desc">
          ${escapeHtml(sanitizeText(inv.description))}<br>
          <span class="inv-muted">${escapeHtml(sanitizeText(inv.dateRange))}</span>
        </td>
        <td class="inv-amt">${curr}${inv.roomBaseAmount.toFixed(2)}</td>
      </tr>`,
      ...inv.extraItems
        .filter((i) => i.desc || i.amount)
        .map((i) => `
        <tr>
          <td class="inv-desc">${escapeHtml(sanitizeText(i.desc))}</td>
          <td class="inv-amt">${curr}${i.amount.toFixed(2)}</td>
        </tr>`),
    ].join("");

    // reuse earlier printBody template from printInvoice, but include style definitions
    return `
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
      <div class="inv-page">
        <div class="inv-letterhead">
          <div class="inv-letterhead-inner">
            <h1 class="inv-brand">${escapeHtml(sanitizeText(inv.hotelName || ""))}</h1>
            <p class="inv-doctitle">${escapeHtml(sanitizeText(inv.invoiceTitle || ""))}</p>
            <div class="inv-business-details">
              <p class="inv-gst">GSTIN: ${escapeHtml(sanitizeText(inv.hotelGstNumber || "—"))}</p>
              <p class="inv-address">📍 ${escapeHtml(sanitizeText(inv.hotelAddress || "—"))}</p>
              <p class="inv-phone">📞 ${escapeHtml(sanitizeText(inv.hotelPhone || "—"))}</p>
            </div>
          </div>
        </div>

        <div class="inv-meta">
          <div class="inv-billto">
            <p class="inv-label">Bill To / Customer</p>
            <p class="inv-guest">${escapeHtml(sanitizeText(inv.guestName))}</p>
            <p class="inv-muted">📞 ${escapeHtml(sanitizeText(inv.phone || "—"))}</p>
          </div>
          <div class="inv-invoice-meta">
            <table class="inv-meta-table">
              <tr><td class="inv-label">Invoice No.</td><td class="inv-value">${sanitizeText(inv.bookingId.slice(0,8).toUpperCase())}</td></tr>
              <tr><td class="inv-label">Date</td><td class="inv-value">${sanitizeText(new Date(inv.createdAt).toLocaleDateString("en-IN"))}</td></tr>
            </table>
          </div>
        </div>

        <table class="inv-table">
          <thead>
            <tr><th class="inv-th-left">Description</th><th class="inv-th-right">Amount</th></tr>
          </thead>
          <tbody>
            ${lineRows}
            <tr class="inv-row-sub"><td class="inv-desc inv-subtotal-label">Subtotal</td><td class="inv-amt">${curr}${inv.subtotal.toFixed(2)}</td></tr>
            <tr class="inv-row-tax"><td class="inv-desc">${escapeHtml(inv.cgstLabel)} (${inv.cgstPercent}%)</td><td class="inv-amt">${curr}${inv.cgstAmount.toFixed(2)}</td></tr>
            <tr class="inv-row-tax"><td class="inv-desc">${escapeHtml(inv.sgstLabel)} (${inv.sgstPercent}%)</td><td class="inv-amt">${curr}${inv.sgstAmount.toFixed(2)}</td></tr>
            <tr class="inv-row-total"><td class="inv-desc">Total</td><td class="inv-amt">${curr}${inv.total.toFixed(2)}</td></tr>
            <tr class="inv-row-advance"><td class="inv-desc">Advance Paid</td><td class="inv-amt inv-paid">− ${curr}${inv.advancePaid.toFixed(2)}</td></tr>
            <tr class="inv-row-balance"><td class="inv-desc">Balance Due</td><td class="inv-amt">${curr}${inv.balance.toFixed(2)}</td></tr>
          </tbody>
        </table>

        ${inv.extraNotes ? `<div class="inv-notes"><p class="inv-label">Notes</p><p class="inv-muted">${escapeHtml(inv.extraNotes)}</p></div>` : ""}

        <div class="inv-footer"><p>${escapeHtml(inv.invoiceFooter || "")}</p></div>
      </div>`;
  };

  const exportAllPDFs = async () => {
    try {
      const invs = getInvoices();
      if (!invs.length) {
        toast.error("No invoices to export");
        return;
      }
      const zip = new JSZip();
      for (const inv of invs) {
        const blob = await createInvoicePDFBlob(inv);
        const dateLabel = new Date(inv.createdAt).toISOString().slice(0,10);
        const nameLabel = inv.guestName || "invoice";
        const safeName = `${nameLabel}-${dateLabel}`.replace(/[^a-z0-9\-]/gi, "_").toLowerCase();
        zip.file(`${safeName}.pdf`, blob);
      }
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = "invoices.zip";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try { document.body.removeChild(a); } catch {}
        try { URL.revokeObjectURL(url); } catch {}
      }, 1000);
      toast.success("ZIP downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Failed to export PDFs");
    }
  };

  const exportCombinedPDF = () => {
    try {
      const invs = getInvoices();
      if (!invs.length) {
        toast.error("No invoices to export");
        return;
      }
      const doc = new jsPDF();
      invs.forEach((inv, idx) => {
        if (idx > 0) doc.addPage();
        doc.setFontSize(16);
        doc.text(sanitizeText(inv.hotelName || ""), 14, 18);
        doc.setFontSize(10);
        doc.text(sanitizeText(inv.invoiceTitle || ""), 14, 25);
        // metadata
        doc.setFontSize(9);
        const metaY2 = 32;
        doc.text(`Invoice #: ${sanitizeText(inv.bookingId.slice(0,8).toUpperCase())}`, 14, metaY2);
        doc.text(`Date: ${sanitizeText(new Date(inv.createdAt).toLocaleDateString("en-IN"))}`, 80, metaY2);
        doc.text(`Guest: ${sanitizeText(inv.guestName)}`, 140, metaY2);

        const curr = normalizeCurrency(inv.currency);
        const rows: any[] = [];
        rows.push([sanitizeText(inv.description), curr + inv.roomBaseAmount.toFixed(2)]);
        inv.extraItems.forEach((it) => rows.push([sanitizeText(it.desc), curr + it.amount.toFixed(2)]));

        autoTable(doc, {
          startY: 40,
          head: [["Description", "Amount"]],
          body: rows,
          headStyles: { fillColor: [217, 119, 6] },
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.text(`Subtotal: ${inv.currency}${inv.subtotal.toFixed(2)}`, 14, finalY);
        doc.text(`${inv.cgstLabel}: ${inv.currency}${inv.cgstAmount.toFixed(2)}`, 14, finalY + 6);
        doc.text(`${inv.sgstLabel}: ${inv.currency}${inv.sgstAmount.toFixed(2)}`, 14, finalY + 12);
        doc.setFontSize(12);
        doc.text(`Total: ${inv.currency}${inv.total.toFixed(2)}`, 14, finalY + 22);
        doc.text(`Balance Due: ${inv.currency}${inv.balance.toFixed(2)}`, 14, finalY + 30);
      });
      const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "all-invoices.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
      toast.success("Combined PDF downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Failed to export combined PDF");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={downloadInvoicesJSON} disabled={invoices.length===0}>
          <Download className="h-4 w-4 mr-1" /> Export JSON
        </Button>
        <Button size="sm" variant="outline" onClick={exportAllPDFs} disabled={invoices.length===0}>
          <Download className="h-4 w-4 mr-1" /> Export PDFs (ZIP)
        </Button>
        <Button size="sm" variant="outline" onClick={exportCombinedPDF} disabled={invoices.length===0}>
          <Download className="h-4 w-4 mr-1" /> Export All in One PDF
        </Button>
        <Button size="sm" variant="outline" onClick={() => {
            if (confirm("Clear all stored invoices?")) {
              clearInvoices();
              load();
            }
          }}
        >
          <Trash2 className="h-4 w-4 mr-1" /> Clear All
        </Button>
      </div>

      {invoices.length === 0 && <p className="text-muted-foreground">No stored invoices yet.</p>}

      <div className="space-y-2">
        {invoices.map((inv) => (
          <Card key={inv.id} className="border">
            <CardHeader className="flex justify-between items-center">
              <div>
                <CardTitle className="text-sm">
                  {inv.guestName} <span className="text-xs text-muted-foreground">({format(new Date(inv.createdAt), "PPP p")})</span>
                </CardTitle>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => printInvoice(inv)}>
                  <Printer className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => downloadInvoicePDF(inv)}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setViewing(inv)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => handleDelete(inv.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                <strong>Total:</strong> {inv.currency}{inv.total.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={viewing !== null} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <div className="ml-auto flex gap-2">
              {viewing && (
                <>
                  <Button size="icon" variant="ghost" onClick={() => viewing && printInvoice(viewing)}>
                    <Printer className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => viewing && downloadInvoicePDF(viewing)}>
                    <Download className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </DialogHeader>
          {viewing && (
            <div>
              {renderDetails(viewing)}
            </div>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setViewing(null)}>
              <X className="h-4 w-4" /> Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
