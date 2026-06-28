import jsPDF from 'jspdf';
import autoTable, { type Styles } from 'jspdf-autotable';
import logoImage from '../../assets/logo.png';
import { type ExpenseInterface } from '../../stores/expenseStore';
import { type IncomeInterface } from '../../stores/incomeStore';
import { formatCurrency } from '../../utils';

// Refined color palette - more sophisticated and cohesive
const COLORS = {
  primary: '#2563EB', // Refined blue
  primaryDark: '#1E40AF', // Darker blue for accents
  primaryLight: '#DBEAFE', // Light blue for backgrounds
  success: '#059669', // Refined green
  successLight: '#D1FAE5', // Light green
  danger: '#DC2626', // Refined red
  dangerLight: '#FEE2E2', // Light red
  text: '#1F2937', // Dark gray for text
  textMuted: '#6B7280', // Muted gray
  border: '#E5E7EB', // Light border
  background: '#F9FAFB', // Off-white background
  white: '#FFFFFF',
};

// Load image as Base64
const loadImage = async (src: string): Promise<string> => {
  try {
    const response = await fetch(src);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading image:', error);
    throw error;
  }
};



export const generateMonthlyReport = async (
  expenses: ExpenseInterface[],
  incomes: IncomeInterface[],
  selectedMonth?: number,
  selectedYear?: number
) => {
  const now = new Date();
  const month = selectedMonth !== undefined ? selectedMonth : now.getMonth();
  const year = selectedYear !== undefined ? selectedYear : now.getFullYear();
  const selectedDate = new Date(year, month, 1);
  const monthName = selectedDate.toLocaleString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
  const monthNameCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  // Filter data
  const currentMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  const currentMonthIncomes = incomes.filter(i => {
    const d = new Date(i.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  const totalExpenses = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncomes = currentMonthIncomes.reduce((sum, i) => sum + i.amount, 0);
  const balance = totalIncomes - totalExpenses;

  const expenseByCategory: Record<string, number> = {};
  currentMonthExpenses.forEach(e => {
    expenseByCategory[e.name] = (expenseByCategory[e.name] || 0) + e.amount;
  });

  const incomeByCategory: Record<string, number> = {};
  currentMonthIncomes.forEach(i => {
    incomeByCategory[i.name] = (incomeByCategory[i.name] || 0) + i.amount;
  });

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Refined table styles
  const tableStyles: Partial<Styles> = {
    font: 'helvetica',
    fontSize: 9,
    cellPadding: 4,
    lineColor: COLORS.border,
    lineWidth: 0.1,
    textColor: COLORS.text,
    fillColor: COLORS.white,
    halign: 'left',
    valign: 'middle',
  };

  const headStyles: Partial<Styles> = {
    fillColor: COLORS.primaryLight,
    textColor: COLORS.primaryDark,
    fontStyle: 'bold',
    fontSize: 9,
    cellPadding: 4,
    halign: 'left',
  };

  // Page break check
  const checkPageBreak = (y: number, requiredSpace: number): number => {
    if (y + requiredSpace > pageHeight - 25) {
      doc.addPage();
      return 20;
    }
    return y;
  };

  // ========== HEADER SECTION ==========
  // Subtle gradient-like header with rounded bottom corners
  doc.setFillColor(COLORS.primary);
  doc.rect(0, 0, pageWidth, 38, 'F');

  // Decorative accent line
  doc.setFillColor(COLORS.primaryDark);
  doc.rect(0, 38, pageWidth, 2, 'F');

  // Logo with white background
  try {
    const logoDataUrl = await loadImage(logoImage);
    doc.setFillColor(COLORS.white);
    doc.roundedRect(margin, 10, 20, 20, 4, 4, 'F');
    doc.addImage(logoDataUrl, 'PNG', margin + 2.5, 12.5, 15, 15);
  } catch (err) {
    console.warn('Logo non chargé :', err);
  }

  // Title
  doc.setFontSize(22);
  doc.setTextColor(COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.text('Rapport Financier', margin + 26, 20);

  // Month subtitle
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(monthNameCapitalized, margin + 26, 28);

  // Generation date on the right
  doc.setFontSize(8);
  doc.setTextColor(COLORS.white);
  const generatedText = `Généré le ${now.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })}`;
  doc.text(generatedText, pageWidth - margin, 28, { align: 'right' });

  // ========== SUMMARY CARDS ==========
  let y = 50;

  // Section title
  doc.setFontSize(12);
  doc.setTextColor(COLORS.text);
  doc.setFont('helvetica', 'bold');
  doc.text('Résumé du mois', margin, y);
  y += 8;

  const cardWidth = (contentWidth - 8) / 3;
  const cardHeight = 28;
  const cardData = [
    {
      label: 'Revenus',
      value: totalIncomes,
      color: COLORS.success,
      lightColor: COLORS.successLight,
    },
    {
      label: 'Dépenses',
      value: totalExpenses,
      color: COLORS.danger,
      lightColor: COLORS.dangerLight,
    },
    {
      label: 'Solde',
      value: balance,
      color: balance >= 0 ? COLORS.success : COLORS.danger,
      lightColor: balance >= 0 ? COLORS.successLight : COLORS.dangerLight,
    },
  ];

  cardData.forEach((card, index) => {
    const cardX = margin + index * (cardWidth + 4);

    // Card background with subtle border
    doc.setFillColor(COLORS.white);
    doc.setDrawColor(COLORS.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(cardX, y, cardWidth, cardHeight, 3, 3, 'FD');

    // Colored accent on left side
    doc.setFillColor(card.color);
    doc.roundedRect(cardX, y, 3, cardHeight, 3, 0, 'F');
    doc.rect(cardX + 1.5, y, 1.5, cardHeight, 'F'); // Fill the right edge of the rounded part

    // Label
    doc.setFontSize(9);
    doc.setTextColor(COLORS.textMuted);
    doc.setFont('helvetica', 'normal');
    doc.text(card.label, cardX + 10, y + 10);

    // Value
    doc.setFontSize(14);
    doc.setTextColor(card.color);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(card.value), cardX + 10, y + 20);
  });

  y += cardHeight + 15;

  // ========== EXPENSES TABLE ==========
  y = checkPageBreak(y, 40);

  // Section header with icon-like decoration
  doc.setFillColor(COLORS.dangerLight);
  doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setTextColor(COLORS.danger);
  doc.setFont('helvetica', 'bold');
  doc.text('Dépenses par catégorie', margin + 4, y + 7);
  y += 14;

  if (Object.keys(expenseByCategory).length > 0) {
    const expenseData = Object.entries(expenseByCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, val]) => [cat, formatCurrency(val)]);

    autoTable(doc, {
      startY: y,
      head: [['Catégorie', 'Montant']],
      body: expenseData,
      styles: tableStyles,
      headStyles: { ...headStyles, fillColor: COLORS.dangerLight, textColor: COLORS.danger },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.65 },
        1: { cellWidth: contentWidth * 0.35, halign: 'right' },
      },
      alternateRowStyles: { fillColor: COLORS.background },
      margin: { left: margin, right: margin },
      didDrawPage: data => {
        y = data.cursor?.y || y + 10;
      },
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || y;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(COLORS.textMuted);
    doc.setFont('helvetica', 'italic');
    doc.text('Aucune dépense enregistrée ce mois-ci', margin + 4, y + 5);
    y += 12;
  }

  y += 12;

  // ========== INCOMES TABLE ==========
  y = checkPageBreak(y, 40);

  // Section header
  doc.setFillColor(COLORS.successLight);
  doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setTextColor(COLORS.success);
  doc.setFont('helvetica', 'bold');
  doc.text('Revenus par catégorie', margin + 4, y + 7);
  y += 14;

  if (Object.keys(incomeByCategory).length > 0) {
    const incomeData = Object.entries(incomeByCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, val]) => [cat, formatCurrency(val)]);

    autoTable(doc, {
      startY: y,
      head: [['Catégorie', 'Montant']],
      body: incomeData,
      styles: tableStyles,
      headStyles: { ...headStyles, fillColor: COLORS.successLight, textColor: COLORS.success },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.65 },
        1: { cellWidth: contentWidth * 0.35, halign: 'right' },
      },
      alternateRowStyles: { fillColor: COLORS.background },
      margin: { left: margin, right: margin },
      didDrawPage: data => {
        y = data.cursor?.y || y + 10;
      },
    });
  } else {
    doc.setFontSize(9);
    doc.setTextColor(COLORS.textMuted);
    doc.setFont('helvetica', 'italic');
    doc.text('Aucun revenu enregistré ce mois-ci', margin + 4, y + 5);
  }

  // ========== FOOTER ==========
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer line
    doc.setDrawColor(COLORS.border);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

    // Copyright
    doc.setFontSize(7);
    doc.setTextColor(COLORS.textMuted);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `© ${new Date().getFullYear()} Xpense — Votre gestionnaire financier`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );

    // Page number
    doc.text(`${i} / ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  }

  doc.save(`rapport-${monthName}.pdf`);
};
