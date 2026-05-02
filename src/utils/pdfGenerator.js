import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export const generateDashboardPdf = async (elementId = "report-content") => {
  const input = document.getElementById(elementId);

  if (!input) {
    throw new Error("Report content not found");
  }

  const canvas = await html2canvas(input, {
    scale: 2,
    useCORS: true,
  });

  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF("p", "mm", "a4");

  const pageWidth = pdf.internal.pageSize.getWidth();
  const imgHeight = (canvas.height * pageWidth) / canvas.width;

  pdf.addImage(imgData, "PNG", 0, 0, pageWidth, imgHeight);

  return pdf;
};