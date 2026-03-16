import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { Invoice, Customer, Organization } from "../types";
import { format } from "date-fns";

export const generateInvoicePDF = (invoice: Invoice, customer: Customer, org: Organization) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.text(org.name, 14, 22);
  doc.setFontSize(10);
  doc.text(`GSTIN: ${org.gstNumber || "N/A"}`, 14, 30);
  
  doc.setFontSize(16);
  doc.text("INVOICE", 150, 22);
  doc.setFontSize(10);
  doc.text(`Invoice #: ${invoice.invoiceNumber}`, 150, 30);
  doc.text(`Date: ${format(new Date(invoice.date), "dd MMM yyyy")}`, 150, 35);
  doc.text(`Status: ${invoice.status.toUpperCase()}`, 150, 40);

  // Bill To
  doc.setFontSize(12);
  doc.text("Bill To:", 14, 50);
  doc.setFontSize(10);
  doc.text(customer.name, 14, 56);
  doc.text(customer.email || "", 14, 61);
  doc.text(customer.billingAddress || "", 14, 66, { maxWidth: 80 });

  // Table
  const tableData = invoice.items.map((item) => {
    return [
      item.name,
      item.quantity.toString(),
      `INR ${item.unitPrice.toFixed(2)}`,
      `${item.taxRate}%`,
      `INR ${item.subtotal.toFixed(2)}`,
    ];
  });

  (doc as any).autoTable({
    startY: 80,
    head: [["Item", "Qty", "Price", "Tax %", "Total"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillStyle: [41, 128, 185] },
  });

  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.text(`Subtotal: INR ${invoice.totalAmount.toFixed(2)}`, 140, finalY);
  
  let currentY = finalY + 7;
  doc.text(`Tax: INR ${invoice.totalTax.toFixed(2)}`, 140, currentY);
  currentY += 7;
  
  if (invoice.totalDiscount > 0) {
    doc.text(`Discount: INR ${invoice.totalDiscount.toFixed(2)}`, 140, currentY);
    currentY += 7;
  }
  
  doc.setFontSize(12);
  doc.text(`Grand Total: INR ${invoice.grandTotal.toFixed(2)}`, 140, currentY + 5);

  doc.save(`Invoice_${invoice.invoiceNumber}.pdf`);
};
