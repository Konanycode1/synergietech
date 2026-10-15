import jsPDF from "jspdf";

import logoSts from "@/assets/logo.png";
import { formatDate, formatFCFA } from "@/lib/formatters";

export interface MaintenanceContractPdfData {
  clientName: string;
  clientRepresentative?: string;
  clientAddress?: string;
  service: string;
  siteDescription: string;
  frequency: string;
  monthlyAmount: number;
  billingPeriod: "MENSUELLE" | "TRIMESTRIELLE" | "ANNUELLE";
  durationMonths: number;
  startDate: string;
  tacitRenewal: boolean;
  outOfContractFee: number;
}

const COMPANY_FOOTER = [
  "SARL au capital de 5 000 000 FCFA - Siège social : Cocody Angré Deux Plateaux SICOGI - 06 BP 564 ABIDJAN 06",
  "N° CPTE CORIS BANK : 00853102410167 - N° R.C. : CI-ABJ-03-2023-B12-01304 - N° CC. : 2300926G",
  "Tél. : 25 22 02 90 53 - Email : synergies@yahoo.fr - www.sts.ci",
];

function sanitizeFilename(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "-").trim();
}

export function exportMaintenanceContractPDF(data: MaintenanceContractPdfData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  const bodyFontSize = 12;
  const bodyLineHeightFactor = 1.5;
  const bodyLineHeightMm = 6.35;
  const red: [number, number, number] = [200, 16, 16];

  const addHeader = () => {
    doc.addImage(logoSts, "PNG", margin, 9, 24, 20);
    doc.setTextColor(...red);
    doc.setFont("times", "bold");
    doc.setFontSize(17);
    doc.text("STS SARL", pageWidth / 2, 17, { align: "center" });
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(70, 70, 70);
    doc.text("Sécurité électronique, informatique et services", pageWidth / 2, 23, {
      align: "center",
    });
    doc.setDrawColor(...red);
    doc.setLineWidth(0.5);
    doc.line(margin, 33, pageWidth - margin, 33);
  };

  const addFooter = (page: number, totalPages: number) => {
    doc.setDrawColor(...red);
    doc.setLineWidth(0.4);
    doc.line(margin, pageHeight - 26, pageWidth - margin, pageHeight - 26);
    doc.setTextColor(80, 80, 80);
    doc.setFont("times", "normal");
    doc.setFontSize(7);
    COMPANY_FOOTER.forEach((line, index) => {
      doc.text(line, pageWidth / 2, pageHeight - 20 + index * 4, { align: "center" });
    });
    doc.text(`Page ${page} / ${totalPages}`, pageWidth - margin, pageHeight - 5, {
      align: "right",
    });
  };

  const paragraph = (text: string, y: number, options?: { bold?: boolean; indent?: number }) => {
    const indent = options?.indent ?? 0;
    doc.setTextColor(0, 0, 0);
    doc.setFont("times", options?.bold ? "bold" : "normal");
    doc.setFontSize(bodyFontSize);
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    doc.text(lines, margin + indent, y, {
      align: lines.length > 1 ? "justify" : "left",
      lineHeightFactor: bodyLineHeightFactor,
      maxWidth: contentWidth - indent,
    });
    return y + lines.length * bodyLineHeightMm;
  };

  const article = (number: number, title: string, text: string, y: number) => {
    y = paragraph(`Article ${number} — ${title}`, y, { bold: true });
    return paragraph(text, y + 1);
  };

  const billingMonths =
    data.billingPeriod === "MENSUELLE" ? 1 : data.billingPeriod === "TRIMESTRIELLE" ? 3 : 12;
  const invoiceAmount = data.monthlyAmount * billingMonths;
  const billingLabel =
    data.billingPeriod === "MENSUELLE"
      ? "chaque mois"
      : data.billingPeriod === "TRIMESTRIELLE"
        ? "chaque trimestre"
        : "chaque année";

  const startDate = new Date(data.startDate);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + data.durationMonths);

  addHeader();
  doc.setTextColor(0, 0, 0);
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.text(
    `CONTRAT D’ENTRETIEN DU SYSTÈME DE ${data.service.toLocaleUpperCase("fr-FR")}`,
    pageWidth / 2,
    44,
    { align: "center", maxWidth: contentWidth },
  );

  let y = 57;
  y = paragraph("Entre les soussignés :", y, { bold: true });
  y = paragraph(
    "La société SYNERGIE TECH SOLUTIONS SARL (STS SARL), dont le siège social est situé à Cocody Angré, représentée par son Directeur Général, ci-après dénommée « LE PRESTATAIRE ».",
    y + 2,
  );
  y = paragraph("D’une part,", y + 1);
  y = paragraph(
    `${data.clientName}${data.clientAddress ? `, sise à ${data.clientAddress}` : ""}${
      data.clientRepresentative ? `, représentée par ${data.clientRepresentative}` : ""
    }, ci-après dénommée « LE CLIENT ».`,
    y + 2,
  );
  y = paragraph("D’autre part,", y + 1);
  y = paragraph("Il a été convenu et arrêté ce qui suit :", y + 3, { bold: true });

  y = article(
    1,
    "Objet",
    `Le présent contrat a pour objet l’entretien du système de ${data.service.toLocaleLowerCase(
      "fr-FR",
    )} installé sur le site suivant : ${data.siteDescription}.`,
    y + 5,
  );
  y = article(
    2,
    "Prestations d’entretien",
    `L’entretien comprend la vérification, les tests, le nettoyage technique et le rétablissement du bon fonctionnement du système. Fréquence prévue : ${data.frequency}. Les dates et heures d’intervention sont convenues entre les parties.`,
    y + 4,
  );
  article(
    3,
    "Prix et exclusions",
    `Le remplacement d’un appareil ou d’un élément défectueux n’est pas compris dans le forfait et fait l’objet d’un devis séparé accepté par le client. L’entretien est facturé ${billingLabel} à ${formatFCFA(
      invoiceAmount,
    )} TTC, soit ${formatFCFA(data.monthlyAmount)} TTC par mois, payable par avance.`,
    y + 4,
  );

  doc.addPage();
  addHeader();
  y = 46;
  y = article(
    4,
    "Durée et règlement des différends",
    `Le présent contrat est conclu pour une durée de ${data.durationMonths} mois, du ${formatDate(
      startDate.toISOString(),
    )} au ${formatDate(
      endDate.toISOString(),
    )}. Les parties s’engagent à rechercher une solution amiable à tout différend. À défaut, le tribunal d’Abidjan-Plateau est compétent.`,
    y,
  );
  y = article(
    5,
    "Renouvellement",
    data.tacitRenewal
      ? "Le présent contrat est renouvelé par tacite reconduction, sauf dénonciation écrite par l’une des parties avant son échéance."
      : "Le présent contrat prend fin à son échéance et ne peut être renouvelé que par accord écrit des parties.",
    y + 5,
  );
  y = paragraph(
    `NB : En l’absence d’un contrat d’entretien après la période de garantie, toute intervention sur le système de sécurité est facturée au minimum à ${formatFCFA(
      data.outOfContractFee,
    )}, hors pièces et fournitures.`,
    y + 7,
    { bold: true },
  );
  y = paragraph(`Fait à Abidjan, le ${formatDate(new Date().toISOString())}`, y + 10);
  y = paragraph("En deux (02) exemplaires originaux.", y + 1);

  const signatureY = Math.max(y + 15, 155);
  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.text("POUR SYNERGIE TECH SOLUTIONS SARL", margin + 35, signatureY, {
    align: "center",
    maxWidth: 75,
  });
  doc.text(
    `POUR ${data.clientName.toLocaleUpperCase("fr-FR")}`,
    pageWidth - margin - 35,
    signatureY,
    {
      align: "center",
      maxWidth: 70,
    },
  );
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.text("Nom, signature et cachet", margin + 35, signatureY + 8, { align: "center" });
  doc.text("Lu et approuvé — signature et cachet", pageWidth - margin - 35, signatureY + 8, {
    align: "center",
  });

  doc.setPage(1);
  addFooter(1, 2);
  doc.setPage(2);
  addFooter(2, 2);

  doc.save(`contrat-entretien-${sanitizeFilename(data.clientName) || "client"}.pdf`);
}
