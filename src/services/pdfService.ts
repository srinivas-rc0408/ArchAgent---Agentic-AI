import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface PDFEstimationItem {
  category: string;
  spec: string;
  qty: string;
  rate: number;
  total: number;
}

export interface PDFData {
  projectName: string;
  prompt: string;
  estimation: PDFEstimationItem[];
  images: string[];
}

/**
 * Fetch a remote render and re-encode it as a JPEG data URL.
 *
 * jsPDF's `addImage` cannot resolve a URL on its own — the previous version
 * passed remote URLs straight in, which threw for every Pollinations render
 * and silently produced a gallery page of empty boxes. Downscaling also keeps
 * a four-image report near 1 MB instead of 20 MB.
 */
async function toJpegDataUrl(src: string, maxDim = 1280): Promise<string | null> {
  if (src.startsWith("data:image/jpeg")) return src;

  try {
    const blob = await fetch(src, { mode: "cors" }).then((r) => {
      if (!r.ok) throw new Error(`${r.status}`);
      return r.blob();
    });
    const bitmap = await createImageBitmap(blob);

    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    return canvas.toDataURL("image/jpeg", 0.82);
  } catch (err) {
    console.warn("[PDF] Could not embed image:", src.slice(0, 60), err);
    return null;
  }
}

export async function generateProjectPDF(data: PDFData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const dateStr = new Date()
    .toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();

  // Decode every image up front so page 2 lays out in one pass.
  const embedded = await Promise.all(data.images.slice(0, 4).map((src) => toJpegDataUrl(src)));

  // ─── Page 1 — financials ───────────────────────────────────────
  doc.setFillColor(5, 5, 5);
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("ARCH AGENT", 15, 20);

  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.text("AUTONOMOUS DESIGN & ESTIMATION", 15, 26);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`DATE: ${dateStr}`, pageWidth - 15, 18, { align: "right" });

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("TECHNICAL FEASIBILITY & COST ANALYSIS", 15, 55);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Project: ${data.projectName || "Conceptual Design"}`, 15, 62);
  doc.text("Bengaluru market metrics", 15, 67);

  const grandTotal = data.estimation.reduce((sum, item) => sum + item.total, 0);

  autoTable(doc, {
    startY: 75,
    head: [["CATEGORY", "SPECIFICATION", "QTY", "RATE (INR)", "TOTAL"]],
    body: data.estimation.map((item) => [
      item.category,
      item.spec,
      item.qty,
      `INR ${item.rate.toLocaleString("en-IN")}`,
      `INR ${item.total.toLocaleString("en-IN")}`,
    ]),
    foot: [["TOTAL", "", "", "", `INR ${grandTotal.toLocaleString("en-IN")}`]],
    theme: "grid",
    headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontSize: 8, halign: "center" },
    footStyles: { fillColor: [5, 5, 5], textColor: [255, 255, 255], fontSize: 9, halign: "right" },
    bodyStyles: { fontSize: 8, textColor: [50, 50, 50] },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 32, halign: "right" },
      4: { cellWidth: 35, halign: "right" },
    },
    styles: { cellPadding: 3.5, valign: "middle" },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 12;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    "*Figures include a 10% precision buffer. Estimates are algorithmic and non-binding.",
    15,
    finalY,
  );

  // ─── Page 2 — visual gallery ───────────────────────────────────
  const usable = embedded.filter((img): img is string => img !== null);
  if (usable.length > 0) {
    doc.addPage();

    doc.setFillColor(5, 5, 5);
    doc.rect(0, 0, pageWidth, 25, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("VISUALIZATION GALLERY", 15, 16);

    const gap = 10;
    const imgWidth = (pageWidth - gap * 3) / 2;
    const imgHeight = imgWidth * 0.75;

    usable.forEach((img, i) => {
      const x = gap + (i % 2) * (imgWidth + gap);
      const y = 35 + Math.floor(i / 2) * (imgHeight + gap + 6);

      doc.addImage(img, "JPEG", x, y, imgWidth, imgHeight, undefined, "FAST");
      doc.setTextColor(120, 120, 120);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(`VARIANT 0${i + 1}`, x, y + imgHeight + 4);
    });

    doc.setFont("courier", "normal");
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      doc.splitTextToSize(`DESIGN PROMPT: ${data.prompt}`, pageWidth - 30),
      15,
      pageHeight - 24,
    );
  }

  const safeName = (data.projectName || "Report").replace(/[^\w-]+/g, "_").slice(0, 60);
  doc.save(`Arch_Agent_${safeName}.pdf`);
}
