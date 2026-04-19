import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Export chat response to a well-formatted PDF
 */
export function exportResponseToPDF(
  message,
  chatTitle = 'Curalink Research Report',
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Helper: check page overflow
  function checkPage(needed = 10) {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
      drawPageHeader();
    }
  }

  // Helper: draw header on each page
  function drawPageHeader() {
    doc.setFillColor(6, 12, 26);
    doc.rect(0, 0, pageWidth, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(56, 189, 248);
    doc.text('CURALINK — AI Medical Research Assistant', margin, 8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      pageWidth - margin,
      8,
      { align: 'right' },
    );
    y = Math.max(y, 18);
  }

  // Page 1 header
  // Dark background header block
  doc.setFillColor(6, 12, 26);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Accent line
  doc.setFillColor(56, 189, 248);
  doc.rect(0, 48, pageWidth, 2, 'F');

  // Logo text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(56, 189, 248);
  doc.text('CURALINK', margin, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(52, 211, 153);
  doc.text('AI-Powered Medical Research Assistant', margin, 30);

  // Report title
  doc.setFontSize(11);
  doc.setTextColor(240, 246, 255);
  const titleLines = doc.splitTextToSize(chatTitle, contentWidth);
  doc.text(titleLines, margin, 40);

  // Date on the right
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    pageWidth - margin,
    40,
    { align: 'right' },
  );

  y = 58;

  // Query section
  if (message.userQuery) {
    doc.setFillColor(17, 29, 53);
    doc.roundedRect(margin, y, contentWidth, 18, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(56, 189, 248);
    doc.text('RESEARCH QUERY', margin + 6, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(240, 246, 255);
    doc.setFontSize(9);
    const qLines = doc.splitTextToSize(message.userQuery, contentWidth - 12);
    doc.text(qLines[0], margin + 6, y + 14);
    y += 24;
  }

  // Retrieval stats
  if (message.retrievalStats) {
    const stats = message.retrievalStats;
    const statItems = [
      { label: 'PubMed', value: stats.pubmedCount || 0, color: [245, 158, 11] },
      {
        label: 'OpenAlex',
        value: stats.openAlexCount || 0,
        color: [56, 189, 248],
      },
      { label: 'Trials', value: stats.trialsCount || 0, color: [52, 211, 153] },
      {
        label: 'Top Ranked',
        value: stats.rankedCount || 0,
        color: [167, 139, 250],
      },
    ];

    const statW = contentWidth / 4 - 3;
    statItems.forEach((s, i) => {
      const x = margin + i * (statW + 4);
      doc.setFillColor(13, 22, 40);
      doc.roundedRect(x, y, statW, 16, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(...s.color);
      doc.text(String(s.value), x + statW / 2, y + 9, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(s.label, x + statW / 2, y + 14, { align: 'center' });
    });
    y += 22;
  }

  // AI Response content
  const content = message.content || '';
  const sections = content.split(/^##\s/m).filter(Boolean);

  for (const section of sections) {
    const lines = section.split('\n');
    const heading = lines[0].replace(/^#+\s*/, '').trim();
    const body = lines.slice(1).join('\n').trim();

    checkPage(20);

    // Section heading
    doc.setFillColor(13, 22, 40);
    doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F');
    doc.setFillColor(56, 189, 248);
    doc.roundedRect(margin, y, 3, 10, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(240, 246, 255);
    doc.text(heading, margin + 8, y + 7);
    y += 14;

    // Body text
    if (body) {
      const cleanBody = body
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`(.*?)`/g, '$1')
        .replace(/^\s*[-*]\s/gm, '• ')
        .replace(/^\s*\d+\.\s/gm, '')
        .trim();

      const paragraphs = cleanBody.split(/\n{2,}/);
      for (const para of paragraphs) {
        if (!para.trim()) continue;
        checkPage(10);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184);
        const wrapped = doc.splitTextToSize(para.trim(), contentWidth - 4);
        for (const line of wrapped) {
          checkPage(6);
          // Bullet styling
          if (line.startsWith('•')) {
            doc.setTextColor(56, 189, 248);
            doc.text('•', margin + 2, y);
            doc.setTextColor(148, 163, 184);
            doc.text(line.slice(1).trim(), margin + 7, y);
          } else {
            doc.text(line, margin + 2, y);
          }
          y += 5.5;
        }
        y += 3;
      }
    }
    y += 4;
  }

  // Publications table
  const pubs = (message.sources || []).filter((s) => s.type === 'publication');
  if (pubs.length > 0) {
    checkPage(20);

    doc.setFillColor(13, 22, 40);
    doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F');
    doc.setFillColor(56, 189, 248);
    doc.roundedRect(margin, y, 3, 10, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(240, 246, 255);
    doc.text(`Research Publications (${pubs.length})`, margin + 8, y + 7);
    y += 14;

    doc.autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head: [['#', 'Title', 'Authors', 'Year', 'Source']],
      body: pubs.map((p, i) => [
        i + 1,
        p.title?.slice(0, 70) + (p.title?.length > 70 ? '...' : '') || '',
        (p.authors || []).slice(0, 2).join(', ') +
          (p.authors?.length > 2 ? ' et al.' : ''),
        p.year || '',
        p.source || '',
      ]),
      styles: {
        fontSize: 7.5,
        cellPadding: 3,
        textColor: [148, 163, 184],
        fillColor: [13, 22, 40],
        lineColor: [30, 45, 70],
        lineWidth: 0.3,
      },
      headStyles: {
        fillColor: [17, 29, 53],
        textColor: [56, 189, 248],
        fontSize: 7.5,
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [17, 29, 53] },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 75 },
        2: { cellWidth: 45 },
        3: { cellWidth: 12, halign: 'center' },
        4: { cellWidth: 22, halign: 'center' },
      },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // Clinical Trials table
  const trials = (message.sources || []).filter((s) => s.type === 'trial');
  if (trials.length > 0) {
    checkPage(20);

    doc.setFillColor(13, 22, 40);
    doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F');
    doc.setFillColor(52, 211, 153);
    doc.roundedRect(margin, y, 3, 10, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(240, 246, 255);
    doc.text(`Clinical Trials (${trials.length})`, margin + 8, y + 7);
    y += 14;

    doc.autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head: [['#', 'Title', 'Status', 'Phase', 'Location', 'NCT ID']],
      body: trials.map((t, i) => [
        i + 1,
        t.title?.slice(0, 60) + (t.title?.length > 60 ? '...' : '') || '',
        t.status || '',
        t.phase || '',
        (t.locations || []).slice(0, 1).join('; ') || '',
        t.nctId || '',
      ]),
      styles: {
        fontSize: 7.5,
        cellPadding: 3,
        textColor: [148, 163, 184],
        fillColor: [13, 22, 40],
        lineColor: [30, 45, 70],
        lineWidth: 0.3,
      },
      headStyles: {
        fillColor: [17, 29, 53],
        textColor: [52, 211, 153],
        fontSize: 7.5,
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [17, 29, 53] },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 65 },
        2: { cellWidth: 25 },
        3: { cellWidth: 18 },
        4: { cellWidth: 32 },
        5: { cellWidth: 22 },
      },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // Footer on last page
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(6, 12, 26);
    doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(74, 85, 104);
    doc.text(
      'Curalink — For educational purposes only. Not a substitute for professional medical advice.',
      margin,
      pageHeight - 4,
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 4, {
      align: 'right',
    });
  }

  const filename = `curalink-report-${Date.now()}.pdf`;
  doc.save(filename);
}
