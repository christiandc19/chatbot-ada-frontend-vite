import jsPDF from "jspdf";

/*
  This file creates a real PDF report using jsPDF.

  IMPORTANT:
  This does NOT use html2canvas.
  This does NOT screenshot the dashboard.
  It builds the PDF using real dashboard data.
*/

const formatDateRange = (selectedRange) => {
  if (selectedRange === "7") return "Last 7 days";
  if (selectedRange === "30") return "Last 30 days";
  if (selectedRange === "all") return "All time";

  return "Custom range";
};

const createFileName = (reportName) => {
  return (reportName || "web-analytics-report")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");
};

const formatNumber = (value) => {
  return String(value || 0);
};

/*
  Draws a soft card background.
*/
const drawCard = (pdf, x, y, width, height) => {
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(x, y, width, height, 4, 4, "FD");
};

/*
  Draws a simple line chart inside the PDF.
  This is real PDF drawing, not a screenshot.
*/
const drawLineChart = (pdf, data, x, y, width, height) => {
  if (!data || data.length === 0) {
    pdf.setFontSize(9);
    pdf.setTextColor(100);
    pdf.text("No chart data available.", x + 6, y + 16);
    return;
  }

  const chartPadding = 8;
  const chartX = x + chartPadding;
  const chartY = y + 14;
  const chartWidth = width - chartPadding * 2;
  const chartHeight = height - 24;

  const maxValue = Math.max(
    ...data.map((item) =>
      Math.max(
        Number(item.visitors) || 0,
        Number(item.leads) || 0,
        Number(item.interactions) || 0
      )
    ),
    1
  );

  // Grid lines
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.2);

  for (let i = 0; i <= 4; i++) {
    const gridY = chartY + (chartHeight / 4) * i;
    pdf.line(chartX, gridY, chartX + chartWidth, gridY);
  }

  const drawSeries = (key, color) => {
    pdf.setDrawColor(color[0], color[1], color[2]);
    pdf.setLineWidth(0.8);

    data.forEach((item, index) => {
      const value = Number(item[key]) || 0;

      const pointX =
        chartX + (index / Math.max(data.length - 1, 1)) * chartWidth;

      const pointY =
        chartY + chartHeight - (value / maxValue) * chartHeight;

      if (index > 0) {
        const previousValue = Number(data[index - 1][key]) || 0;

        const previousX =
          chartX + ((index - 1) / Math.max(data.length - 1, 1)) * chartWidth;

        const previousY =
          chartY + chartHeight - (previousValue / maxValue) * chartHeight;

        pdf.line(previousX, previousY, pointX, pointY);
      }
    });
  };

  // Visitors = blue
  drawSeries("visitors", [37, 99, 235]);

  // Leads = orange
  drawSeries("leads", [249, 115, 22]);

  // Interactions = green
  drawSeries("interactions", [22, 163, 74]);

  // Legend
  pdf.setFontSize(7);
  pdf.setTextColor(71, 85, 105);

  pdf.setFillColor(37, 99, 235);
  pdf.circle(x + 8, y + height - 5, 1.4, "F");
  pdf.text("Visitors", x + 12, y + height - 4);

  pdf.setFillColor(249, 115, 22);
  pdf.circle(x + 36, y + height - 5, 1.4, "F");
  pdf.text("Leads", x + 40, y + height - 4);

  pdf.setFillColor(22, 163, 74);
  pdf.circle(x + 58, y + height - 5, 1.4, "F");
  pdf.text("Interactions", x + 62, y + height - 4);
};

/*
  Draws a simple pie chart.
*/
const drawPieChart = (pdf, sourceData, centerX, centerY, radius) => {
  if (!sourceData || sourceData.length === 0) {
    pdf.setFontSize(9);
    pdf.setTextColor(100);
    pdf.text("No source data available.", centerX - 22, centerY);
    return;
  }

  const total = sourceData.reduce((sum, item) => sum + Number(item.value || 0), 0);

  if (total === 0) return;

  const colors = [
    [37, 99, 235],
    [22, 163, 74],
    [249, 115, 22],
    [148, 163, 184],
  ];

  let startAngle = 0;

  sourceData.forEach((item, index) => {
    const value = Number(item.value || 0);
    const sliceAngle = (value / total) * 360;
    const endAngle = startAngle + sliceAngle;

    pdf.setFillColor(...colors[index % colors.length]);

    // Draw pie slice using many small triangle points
    const points = [[centerX, centerY]];

    for (let angle = startAngle; angle <= endAngle; angle += 4) {
      const radians = (Math.PI / 180) * angle;

      points.push([
        centerX + Math.cos(radians) * radius,
        centerY + Math.sin(radians) * radius,
      ]);
    }

    const endRadians = (Math.PI / 180) * endAngle;

    points.push([
      centerX + Math.cos(endRadians) * radius,
      centerY + Math.sin(endRadians) * radius,
    ]);

    pdf.triangle(
      points[0][0],
      points[0][1],
      points[1][0],
      points[1][1],
      points[points.length - 1][0],
      points[points.length - 1][1],
      "F"
    );

    for (let i = 1; i < points.length - 1; i++) {
      pdf.triangle(
        centerX,
        centerY,
        points[i][0],
        points[i][1],
        points[i + 1][0],
        points[i + 1][1],
        "F"
      );
    }

    startAngle = endAngle;
  });

  // Legend
  let legendY = centerY + radius + 10;

  sourceData.forEach((item, index) => {
    pdf.setFillColor(...colors[index % colors.length]);
    pdf.circle(centerX - 28, legendY - 1, 1.5, "F");

    pdf.setFontSize(8);
    pdf.setTextColor(71, 85, 105);
    pdf.text(
      `${item.name}: ${item.percent || 0}%`,
      centerX - 24,
      legendY
    );

    legendY += 5;
  });
};

export const generateDashboardPdf = (reportData) => {
  const pdf = new jsPDF("p", "mm", "a4");

  const {
    reportName,
    selectedRange,
    selectedCommunity,
    visitors,
    totalLeads,
    webformLeads,
    chatLeads,
    surveyLeads,
    toursScheduled,
    moveIns,
    leadTrendData = [],
    sourceData = [],
    recommendations = [],
  } = reportData;

  const pageWidth = pdf.internal.pageSize.getWidth();

  /*
    Page background
  */
  pdf.setFillColor(248, 250, 252);
  pdf.rect(0, 0, 210, 297, "F");

  /*
    Header
  */
  pdf.setTextColor(15, 23, 42);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text(reportName || "Web Analytics Report", 14, 18);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(100, 116, 139);
  pdf.text("Chatbot performance and lead activity", 14, 26);

  pdf.text(`Generated on ${new Date().toLocaleDateString()}`, 150, 18);

  /*
    Filter card
  */
  drawCard(pdf, 14, 34, 182, 18);

  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text("Date Range", 20, 42);
  pdf.text("Community", 80, 42);

  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(15, 23, 42);
  pdf.text(formatDateRange(selectedRange), 20, 48);
  pdf.text(
    selectedCommunity === "all" ? "Any community or group" : selectedCommunity,
    80,
    48
  );

  /*
    KPI cards
  */
  const metrics = [
    ["Visitors", visitors],
    ["Total Leads", totalLeads],
    ["Webform", webformLeads],
    ["Chat", chatLeads],
    ["Survey", surveyLeads],
    ["Tours", toursScheduled],
    ["Move-ins", moveIns],
  ];

  let cardX = 14;
  let cardY = 60;

  metrics.forEach(([label, value], index) => {
    drawCard(pdf, cardX, cardY, 24, 22);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(label, cardX + 4, cardY + 8);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(15, 23, 42);
    pdf.text(formatNumber(value), cardX + 4, cardY + 17);

    cardX += 26;

    if (index === 6) {
      cardX = 14;
    }
  });

  /*
    Overview + Line chart
  */
  drawCard(pdf, 14, 92, 112, 78);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(15, 23, 42);
  pdf.text("Overview Trend", 20, 104);

  drawLineChart(pdf, leadTrendData, 20, 108, 100, 54);

  /*
    Leads by Source + Pie chart
  */
  drawCard(pdf, 132, 92, 64, 78);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(15, 23, 42);
  pdf.text("Leads by Source", 140, 104);

  drawPieChart(pdf, sourceData, 164, 128, 18);

  /*
    Insights
  */
  drawCard(pdf, 14, 180, 182, 78);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(15, 23, 42);
  pdf.text("Insights", 20, 192);

  let insightY = 202;

  recommendations.slice(0, 3).forEach((item, index) => {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);
    pdf.text(`${index + 1}. ${item.title}`, 20, insightY);

    insightY += 5;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(71, 85, 105);

    const recommendationLines = pdf.splitTextToSize(
      item.recommendation,
      160
    );

    pdf.text(recommendationLines, 20, insightY);

    insightY += recommendationLines.length * 4 + 6;
  });

  /*
    Footer
  */
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text("Generated by WebSmartAssistant", 14, 286);

  pdf.text("Page 1 of 1", pageWidth - 32, 286);

  pdf.save(`${createFileName(reportName)}.pdf`);
};