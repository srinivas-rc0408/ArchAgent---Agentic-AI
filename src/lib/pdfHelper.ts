
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { type CostBreakdown } from './gemini';

/**
 * Generates a professional 2-page architectural report.
 */
export const generateProfessionalPDF = async (
  costEstimationData: CostBreakdown,
  generatedImages: string[],
  currentPrompt: string
) => {
  const doc = new jsPDF();
  const date = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  // --- PAGE 1: TECHNICAL COST REPORT ---
  // Background Header
  doc.setFillColor(5, 5, 5); // Arch Agent Black
  doc.rect(0, 0, 210, 50, 'F');
  
  // Grid Pattern Aesthetic on Page 1 Header
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.05);
  for (let i = 0; i < 210; i += 10) {
    doc.line(i, 0, i, 50);
  }
  for (let j = 0; j < 50; j += 10) {
    doc.line(0, j, 210, j);
  }

  // Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("ARCH AGENT", 15, 30);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("NEURAL ARCHITECTURE ORCHESTRATION CENTER", 15, 38);
  doc.text(`REPORT ID: ${Math.random().toString(36).substring(7).toUpperCase()}`, 160, 25);
  doc.text(`${date}`, 160, 32);

  // Section: Technical Cost Analysis
  doc.setTextColor(5, 5, 5);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("TECHNICAL COST ANALYSIS", 15, 65);

  // Table Data Preparation
  const items = costEstimationData.items || [];
  const tableRows = items.map(item => [
    item.category?.toUpperCase() || 'MATERIAL',
    item.material || 'Unknown',
    item.specification || '-',
    item.quantity || '-',
    `₹ ${Number(item.unitPrice || 0).toLocaleString('en-IN')}`,
    `₹ ${Number(item.total || 0).toLocaleString('en-IN')}`
  ]);

  const totalAmount = items.reduce((sum, item) => sum + Number(item.total || 0), 0);

  autoTable(doc, {
    startY: 75,
    head: [['CATEGORY', 'ITEM', 'SPECIFICATION', 'QTY', 'RATE (INR)', 'TOTAL (INR)']],
    body: tableRows,
    theme: 'grid',
    headStyles: { 
      fillColor: [22, 22, 24], // Dark Grey
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    styles: { 
      fontSize: 8, 
      cellPadding: 5,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
      font: 'helvetica'
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 25 },
      1: { fontStyle: 'bold', cellWidth: 35 },
      5: { fontStyle: 'bold', halign: 'right' },
      4: { halign: 'right' }
    },
    foot: [['TOTAL PROJECT ESTIMATE', '', '', '', '', `₹ ${totalAmount.toLocaleString('en-IN')}`]],
    footStyles: {
      fillColor: [5, 5, 5],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'right'
    }
  });

  // Footer P1
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text("Quantities are estimated based on visual geometry and spatial logic. Precision buffer (10%) included.", 15, 285);

  // --- PAGE 2: DESIGN SHOWCASE ---
  doc.addPage();
  
  doc.setFillColor(5, 5, 5);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("DESIGN SHOWCASE", 15, 20);

  // Render Images in a Grid
  // We handle up to 4 images
  const images = generatedImages.slice(0, 4);
  const margin = 10;
  const colWidth = (210 - (margin * 3)) / 2;
  const rowHeight = colWidth * 1.25; // Aspect ratio approximation

  for (let i = 0; i < images.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + col * (colWidth + margin);
    const y = 40 + row * (rowHeight + margin);

    try {
      let imageDataToUse = images[i];
      let format = 'JPEG';
      
      // If it's a URL, try to use it directly with faster processing
      if (!images[i].startsWith('data:')) {
         try {
           const imgElement = new Image();
           imgElement.crossOrigin = 'Anonymous';
           imgElement.src = images[i];
           await new Promise<void>((resolve) => {
             imgElement.onload = () => {
               const canvas = document.createElement('canvas');
               // Cap dimensions for speed vs quality balance
               const maxDim = 1280;
               let w = imgElement.naturalWidth || 800;
               let h = imgElement.naturalHeight || 600;
               
               if (w > maxDim || h > maxDim) {
                 if (w > h) {
                   h = (maxDim / w) * h;
                   w = maxDim;
                 } else {
                   w = (maxDim / h) * w;
                   h = maxDim;
                 }
               }
               
               canvas.width = w;
               canvas.height = h;
               const ctx = canvas.getContext('2d');
               if (ctx) {
                 ctx.drawImage(imgElement, 0, 0, w, h);
                 imageDataToUse = canvas.toDataURL('image/jpeg', 0.7); // Balanced quality
               }
               resolve();
             };
             imgElement.onerror = () => {
               console.warn("Failed to load image for PDF.");
               resolve();
             };
             // Reduced timeout for snappier experience
             setTimeout(() => resolve(), 800);
           });
         } catch(fetchErr) {
           console.warn("Failed to fetch image for PDF:", fetchErr);
         }
      } else {
         if (images[i].startsWith('data:image/png')) format = 'PNG';
         else if (images[i].startsWith('data:image/webp')) format = 'WEBP';
      }
      
      doc.addImage(imageDataToUse, format, x, y, colWidth, rowHeight, undefined, 'FAST');
      
      // Label
      doc.setDrawColor(255, 255, 255);
      doc.rect(x, y + rowHeight - 10, colWidth, 10, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(7);
      doc.text(`VARIANT 0${i + 1}`, x + 5, y + rowHeight - 4);
    } catch (e) {
      console.warn("Failed to add image to PDF:", e);
      doc.setTextColor(100, 100, 100);
      doc.text("Image not available", x + 5, y + Math.floor(rowHeight / 2));
    }
  }

  // Design Prompt at the bottom
  const promptY = 40 + (Math.ceil(images.length / 2) * (rowHeight + margin)) + 10;
  doc.setTextColor(5, 5, 5);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("ARCHITECTURAL DESIGN PROMPT", 15, promptY);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const splitPrompt = doc.splitTextToSize(currentPrompt, 180);
  doc.text(splitPrompt, 15, promptY + 8);

  // Save
  doc.save(`ArchAgent_Full_Spec_${Date.now()}.pdf`);
};
