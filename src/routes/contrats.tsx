import { useSearchParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, useEffect } from "react";
import { Plus, AlertTriangle, FileSignature, Trash2 } from "lucide-react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import {
  BESOINS,
  type ContratStatut,
  type ContratType,
  type BesoinType,
  totalLignes,
} from "@/types";
import type { Contrat, LigneContrat } from "@/features/interface/contrats.type";
import { useContrat, useContratActions, useContrats } from "@/features/contrats/api/use-contrats";
import { MaintenanceContractDialog } from "@/features/contrats/components/MaintenanceContractDialog";
import { FieldError } from "@/components/PhoneField";
import { getApiErrorMessage } from "@/lib/api/client";
import { daysUntil, formatDate, formatFCFA } from "@/lib/formatters";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useClient, useClients } from "@/features/clients/api/use-client";
import { StatutContrat, TypeContrat} from "@/features/interface/enum";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoSts from "../assets/logo.png";


const TYPES: ContratType[] = [
  "INSTALLATION",
  "MAINTENANCE",
  "ABONNEMENT",
];
const STATUTS: ContratStatut[] = ["BROUILLON", "ACTIF", "RENOUVELLEMENT", "EXPIRE", "RESILIE"];

const contratFormSchema = z.object({
  clientId: z.string().trim().min(1, "L'identifiant du client est obligatoire").max(120),
  type: z.custom<TypeContrat>(
    (value) => TYPES.includes(value as ContratType),
    "Type de contrat invalide",
  ),
  besoin: z.custom<BesoinType>(
    (value) => BESOINS.includes(value as BesoinType),
    "Service invalide",
  ),
  dureeMois: z.number().int().min(1, "La durée minimale est d'un mois").max(120),
  statut: z.custom<ContratStatut>(
    (value) => STATUTS.includes(value as ContratStatut),
    "Statut invalide",
  ),
  lignes: z
    .array(
      z.object({
        description: z.string().trim().min(1, "La désignation est obligatoire"),
        quantite: z.number().int().min(1, "La quantité doit être supérieure à zéro"),
        prixUnitaire: z.number().min(0, "Le prix ne peut pas être négatif"),
      }),
    )
    .min(1, "Ajoutez au moins une ligne au devis"),
});

type ContratFormValues = z.infer<typeof contratFormSchema>;

const STATUT_STYLE: Record<ContratStatut, string> = {
  BROUILLON: "bg-muted text-muted-foreground",
  ACTIF: "bg-success/15 text-success border-success/30",
  "RENOUVELLEMENT": "bg-warning/15 text-warning border-warning/30",
  EXPIRE: "bg-destructive/15 text-destructive border-destructive/30",
  RESILIE: "bg-muted text-muted-foreground line-through",
};

export function ContratsPage() {
  const { contrats } = useContrats();
  const { clients } = useClients();
  const [openNew, setOpenNew] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const openContratId = searchParams.get("open");

  useEffect(() => {
    if (openContratId) setDetailId(openContratId);
  }, [openContratId]);

 const sorted = useMemo(
  () =>
    [...contrats].sort(
      (a, b) =>
        +(b.dateSignature ? new Date(b.dateSignature) : new Date(0)) -
        +(a.dateSignature ? new Date(a.dateSignature) : new Date(0))
    ),
  [contrats]
);
  const echeanceCount = contrats.filter((c) => {
   const j = c.dateEcheance ? daysUntil(c.dateEcheance) : -1;
    return j >= 0 && j <= 30 && c.statut !== "RESILIE" && c.statut !== "BROUILLON";
  }).length;
  const clientsById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients],
  );

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Contrats"
        subtitle={`${contrats.length} contrats · ${echeanceCount} échéance(s) dans les 30 jours`}
        actions={
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1.5" /> Nouveau contrat
              </Button>
            </DialogTrigger>
            <NewContratDialog onClose={() => setOpenNew(false)} />
          </Dialog>
        }
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Service</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Signature</TableHead>
              <TableHead>Échéance</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((c) => {
              const j =c.dateEcheance ? daysUntil(c.dateEcheance) : -1;
              const alerte =
                j >= 0 && j <= 30 && c.statut !== "RESILIE" && c.statut !== "BROUILLON";
              return (
                <TableRow key={c.id} onClick={() => setDetailId(c.id)} className="cursor-pointer">
                  <TableCell className="font-medium">
                    {c.client?.companyName || c.client?.name ||
                      clientsById.get(c.clientId)?.companyName ||
                      clientsById.get(c.clientId)?.name ||
                      "-"}
                  </TableCell>
                  <TableCell className="text-xs">{c.type}</TableCell>
                  <TableCell className="text-xs">{c.type}</TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatFCFA(c.montant)}
                  </TableCell>
                  <TableCell className="text-xs">{formatDate(c.dateSignature)}</TableCell>
                  <TableCell className="text-xs">
                    <div className="flex items-center gap-1.5">
                       {c.dateSignature ? formatDate(c.dateSignature) : "-"}
                      {alerte && (
                        <Badge
                          variant="outline"
                          className="bg-warning/15 text-warning border-warning/30 text-[10px]"
                        >
                          <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                          {j}j
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUT_STYLE[c.statut]}>
                      {c.statut}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        {detailId && <ContratDetail id={detailId} onClose={() => setDetailId(null)} />}
      </Dialog>
    </div>
  );
}

// ============================================
// NOMBRE EN LETTRES
// ============================================

function nombreEnLettres(nombre: number): string {
  const unites = [
    "",
    "un",
    "deux",
    "trois",
    "quatre",
    "cinq",
    "six",
    "sept",
    "huit",
    "neuf",
    "dix",
    "onze",
    "douze",
    "treize",
    "quatorze",
    "quinze",
    "seize",
  ];

  const dizaines = [
    "",
    "",
    "vingt",
    "trente",
    "quarante",
    "cinquante",
    "soixante",
  ];

  if (nombre === 0) return "zéro";

  if (nombre < 17) {
    return unites[nombre];
  }

  if (nombre < 20) {
    return `dix-${unites[nombre - 10]}`;
  }

  if (nombre < 70) {
    const dizaine = Math.floor(nombre / 10);
    const unite = nombre % 10;

    if (unite === 0) {
      return dizaines[dizaine];
    }

    if (unite === 1) {
      return `${dizaines[dizaine]} et un`;
    }

    return `${dizaines[dizaine]}-${unites[unite]}`;
  }

  if (nombre < 80) {
    if (nombre === 71) {
      return "soixante et onze";
    }

    return `soixante-${nombreEnLettres(nombre - 60)}`;
  }

  if (nombre < 100) {
    const reste = nombre - 80;

    if (reste === 0) {
      return "quatre-vingts";
    }

    return `quatre-vingt-${nombreEnLettres(reste)}`;
  }

  if (nombre < 200) {
    const reste = nombre - 100;

    if (reste === 0) {
      return "cent";
    }

    return `cent ${nombreEnLettres(reste)}`;
  }

  if (nombre < 1000) {
    const centaines = Math.floor(nombre / 100);
    const reste = nombre % 100;

    let texte =
      centaines === 1
        ? "cent"
        : `${nombreEnLettres(centaines)} cent`;

    if (reste > 0) {
      texte += ` ${nombreEnLettres(reste)}`;
    }

    return texte;
  }

  if (nombre < 1000000) {
    const milliers = Math.floor(nombre / 1000);
    const reste = nombre % 1000;

    let texte =
      milliers === 1
        ? "mille"
        : `${nombreEnLettres(milliers)} mille`;

    if (reste > 0) {
      texte += ` ${nombreEnLettres(reste)}`;
    }

    return texte;
  }

  if (nombre < 1000000000) {
    const millions = Math.floor(nombre / 1000000);
    const reste = nombre % 1000000;

    let texte =
      millions === 1
        ? "un million"
        : `${nombreEnLettres(millions)} millions`;

    if (reste > 0) {
      texte += ` ${nombreEnLettres(reste)}`;
    }

    return texte;
  }

  return nombre.toString();
}


// ============================================
// MONTANT EN TOUTES LETTRES
// ============================================

function montantEnLettresFCFA(value: number): string {
  return `${nombreEnLettres(Math.round(value))} francs CFA`
    .toUpperCase();
}

function formatClientReference(clientId: string): string {
  const segments = clientId.split("-");
  if (segments.length >= 4) {
    return `#RC-${segments[2]}-${segments[3]}`;
  }

  return `#RC-${clientId}`;
}


// ============================================
// CHARGEMENT DU LOGO
// ============================================


async function exportContratPDF(contrat: Contrat) {
  try {
    const clientName = contrat.client?.companyName || contrat.client?.name || "-";
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const rouge: [number, number, number] = [
      200,
      16,
      16,
    ];

    const gris: [number, number, number] = [
      90,
      90,
      90,
    ];

    const largeurPage = 210;
    const marge = 14;

    // ========================================
    // CALCUL DU TOTAL
    // ========================================

    const lignes = contrat.lignes ?? [];

    const total = lignes.reduce(
      (somme, ligne) =>
        somme +
        ligne.quantite * ligne.prixUnitaire,
      0
    );

    // ========================================
    // LOGO
    // ========================================

   

    doc.addImage(
      logoSts,
      "JPEG",
      14,
      10,
      30,
      24
    );

    // ========================================
    // EN-TÊTE STS
    // ========================================

    doc.setTextColor(...rouge);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);

    doc.text(
      "SYNERGIE TECH SOLUTIONS SARL",
      50,
      17
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...gris);

    doc.text(
      "Sécurité électronique, électronique et services",
      50,
      23
    );

    doc.text(
      "La maison de la sécurité électronique",
      50,
      28
    );

    // ========================================
    // TITRE
    // ========================================

    doc.setDrawColor(...rouge);
    doc.setLineWidth(0.7);

    doc.line(
      marge,
      39,
      largeurPage - marge,
      39
    );

    doc.setTextColor(...rouge);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);

    doc.text(
      "FACTURE PROFORMA",
      largeurPage / 2,
      49,
      { align: "center" }
    );

    // ========================================
    // NUMÉRO + DATE
    // ========================================

    const numeroProforma =
      contrat.id.slice(0, 8).toUpperCase();

    const dateProforma = contrat.dateSignature
      ? formatDate(contrat.dateSignature)
      : formatDate(new Date().toISOString());

    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    doc.text(
      `N° PROFORMA : ${numeroProforma}`,
      largeurPage - marge,
      17,
      { align: "right" }
    );

    doc.text(
      `DATE : ${dateProforma}`,
      largeurPage - marge,
      23,
      { align: "right" }
    );

    // ========================================
    // INFORMATIONS CLIENT
    // ========================================

    doc.setFillColor(245, 245, 245);
    doc.setDrawColor(210, 210, 210);

    doc.roundedRect(
      marge,
      56,
      182,
      34,
      2,
      2,
      "FD"
    );

    doc.setTextColor(...rouge);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);

    doc.text(
      "ADRESSE DE FACTURATION",
      18,
      63
    );

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    doc.text(
      `Client : ${clientName}`,
      18,
      70
    );

    doc.text(
      "Prestataire : SYNERGIE TECH SOLUTIONS SARL",
      18,
      76
    );

    doc.text(
      `Référence client : ${formatClientReference(contrat.clientId)}`,
      18,
      82
    );

    // ========================================
    // OBJET
    // ========================================

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...rouge);
    doc.setFontSize(10);

    doc.text("OBJET", 14, 99);

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    doc.text(
      `DEVIS / ${contrat.type}`,
      14,
      106
    );

    // ========================================
    // TABLEAU
    // ========================================

    const body = lignes.map((ligne, index) => [
      String(index + 1),
      ligne.designation,
      String(ligne.quantite),
      "U",
      formatFCFA(ligne.prixUnitaire),
      formatFCFA(
        ligne.quantite * ligne.prixUnitaire
      ),
    ]);

    autoTable(doc, {
      startY: 112,

      margin: {
        left: marge,
        right: marge,
      },

      head: [
        [
          "Réf",
          "Désignation",
          "Qté",
          "U",
          "Prix unitaire",
          "Montant TTC",
        ],
      ],

      body,

      foot: [
        [
          "",
          "",
          "",
          "",
          "TOTAL TTC",
          formatFCFA(total),
        ],
      ],

      theme: "grid",

      styles: {
        font: "helvetica",
        fontSize: 8.5,
        cellPadding: 3,
        textColor: [0, 0, 0],
        lineColor: [190, 190, 190],
        lineWidth: 0.2,
        valign: "middle",
      },

      headStyles: {
        fillColor: rouge,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center",
      },

      footStyles: {
        fillColor: [245, 220, 220],
        textColor: rouge,
        fontStyle: "bold",
      },

      columnStyles: {
        0: {
          cellWidth: 13,
          halign: "center",
        },

        1: {
          cellWidth: 75,
        },

        2: {
          cellWidth: 17,
          halign: "center",
        },

        3: {
          cellWidth: 12,
          halign: "center",
        },

        4: {
          cellWidth: 32,
          halign: "right",
        },

        5: {
          cellWidth: 33,
          halign: "right",
        },
      },
    });

    // ========================================
    // POSITION APRÈS LE TABLEAU
    // ========================================

    const finalY =
      (doc as jsPDF & {
        lastAutoTable?: { finalY: number };
      }).lastAutoTable?.finalY ?? 150;

    let y = finalY + 10;

    // ========================================
    // MONTANT EN LETTRES
    // ========================================

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    doc.text(
      "ARRÊTÉE LA PRÉSENTE FACTURE PROFORMA À LA SOMME DE :",
      marge,
      y
    );

    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...rouge);

    const montantLettres =
      montantEnLettresFCFA(total);

    const texteMontant = doc.splitTextToSize(
      montantLettres,
      182
    );

    doc.text(
      texteMontant,
      marge,
      y
    );

    y += texteMontant.length * 5 + 7;

    // ========================================
    // CONDITIONS DE RÈGLEMENT
    // ========================================

    doc.setFillColor(248, 248, 248);
    doc.setDrawColor(210, 210, 210);

    doc.roundedRect(
      marge,
      y,
      182,
      25,
      2,
      2,
      "FD"
    );

    doc.setTextColor(...rouge);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);

    doc.text(
      "CONDITION DE RÈGLEMENT",
      18,
      y + 7
    );

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");

    doc.text(
      "• 80% à la commande",
      18,
      y + 14
    );

    doc.text(
      "• 20% à la fin des travaux",
      18,
      y + 20
    );

    y += 32;

    // ========================================
    // VALIDITÉ
    // ========================================

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);

    doc.text(
      "NB : Proforma valable 01 Mois.",
      marge,
      y
    );

    // ========================================
    // PIED DE PAGE
    // ========================================

    const hauteurPage =
      doc.internal.pageSize.getHeight();

    doc.setDrawColor(...rouge);
    doc.setLineWidth(0.5);

    doc.line(
      marge,
      hauteurPage - 27,
      largeurPage - marge,
      hauteurPage - 27
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...gris);

    doc.text(
      "C.C N° : 2300926 G  |  Régime d'Imposition : TEE  |  Centre d'impôt : Angré",
      largeurPage / 2,
      hauteurPage - 21,
      { align: "center" }
    );

    doc.text(
      "SYNERGIE TECH SOLUTIONS SARL",
      largeurPage / 2,
      hauteurPage - 16,
      { align: "center" }
    );

    doc.text(
      "Sécurité électronique • Vidéosurveillance • Contrôle d'accès • Alarme",
      largeurPage / 2,
      hauteurPage - 11,
      { align: "center" }
    );

    // ========================================
    // NUMÉRO DE PAGE
    // ========================================

    doc.setFontSize(7);

    doc.text(
      "Page 1 / 1",
      largeurPage - marge,
      hauteurPage - 5,
      { align: "right" }
    );

    // ========================================
    // ENREGISTREMENT
    // ========================================

    const nomClient = (
      clientName !== "-" ? clientName : contrat.id
    )
      .replace(/[\\/:*?"<>|]/g, "-")
      .trim();

    doc.save(
      `proforma-${nomClient || contrat.id}.pdf`
    );

  } catch (error) {
    console.error(
      "Erreur lors de l'export PDF :",
      error
    );

    alert(
      `Impossible de générer le PDF : ${
        error instanceof Error
          ? error.message
          : String(error)
      }`
    );
  }
}

function ContratDetail({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const { contrat } = useContrat(id);
  const { client: linkedClient } = useClient(contrat?.clientId);
  const {
    updateContrat,
    addLigne,
    updateLigne,
    removeLigne,
  } = useContratActions();

  const [newLigne, setNewLigne] = useState({
    description: "",
    quantite: 1,
    prixUnitaire: 0,
  });
  const [openMaintenance, setOpenMaintenance] = useState(false);

  if (!contrat) return null;

  const client = linkedClient ?? contrat.client;
  const clientName = client?.companyName || client?.name || "Client non renseigné";
  const contratWithClient = { ...contrat, client };
  const j = daysUntil(contrat.dateEcheance);
  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {clientName}
          <Badge variant="outline" className={STATUT_STYLE[contrat.statut]}>
            {contrat.statut}
          </Badge>
        </DialogTitle>
        <DialogDescription>
          {contrat.type} · Référence client : {formatClientReference(contrat.clientId)} ·
          Prestataire : SYNERGIE TECH SOLUTIONS SARL
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Montant total (calculé)</Label>
          <div className="h-9 px-3 flex items-center rounded-md border border-input bg-muted/40 font-mono text-sm">
            {formatFCFA(contrat.montant)}
          </div>
        </div>
        <div>
          <Label>Statut</Label>
          <Select
            value={contrat.statut}
            onValueChange={(v: StatutContrat) => updateContrat(id, { statut: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Type</Label>
          <Select
            value={contrat.type}
            onValueChange={(v: TypeContrat) => updateContrat(id, { type: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Durée (mois)</Label>
          <Input
            type="number"
           value={contrat.dureeMois ?? ""}
            onChange={(e) => updateContrat(id, { dureeMois: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>Date de signature</Label>
          <Input
            type="date"
          value={contrat.dateSignature?.slice(0, 10) ?? ""}
            onChange={(e) =>
              updateContrat(id, { dateSignature: new Date(e.target.value).toISOString() })
            }
          />
        </div>
        <div>
          <Label>Échéance</Label>
          <Input
            type="date"
           value={contrat.dateEcheance ? contrat.dateEcheance.slice(0, 10) : ""}
            onChange={(e) =>
              updateContrat(id, { dateEcheance: new Date(e.target.value).toISOString() })
            }
          />
        </div>
      </div>

      {j >= 0 && j <= 30 && contrat.statut !== "RESILIE" && contrat.statut !== "BROUILLON" && (
        <div className="flex items-center gap-2 text-sm bg-warning/10 border border-warning/30 rounded-md p-3 text-warning">
          <AlertTriangle className="h-4 w-4" />
          Ce contrat arrive à échéance dans {j} jour(s).
        </div>
      )}

      <div>
        <Label className="text-sm mb-2 block">Devis — équipements & services</Label>
        <div className="rounded-md border overflow-hidden">
          <div className="grid grid-cols-[1fr_80px_130px_130px_36px] gap-2 px-3 py-2 bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
            <div>Désignation</div>
            <div className="text-center">Qté</div>
            <div className="text-right">P.U. (FCFA)</div>
            <div className="text-right">Total</div>
            <div />
          </div>
         {(contrat.lignes ?? []).map((l) => (
            <div
              key={l.id}
              className="grid grid-cols-[1fr_80px_130px_130px_36px] gap-2 px-3 py-1.5 items-center border-t"
            >
              <Input
                className="h-8"
                value={l.designation}
                onChange={(e) => updateLigne(id, l.id, { designation: e.target.value })}
              />
              <Input
                type="number"
                min={1}
                className="h-8 text-center"
                value={l.quantite}
                onChange={(e) => updateLigne(id, l.id, { quantite: Number(e.target.value) })}
              />
              <Input
                type="number"
                min={0}
                className="h-8 text-right font-mono"
                value={l.prixUnitaire}
                onChange={(e) => updateLigne(id, l.id, { prixUnitaire: Number(e.target.value) })}
              />
              <div className="text-right font-mono text-sm">
                {formatFCFA(l.quantite * l.prixUnitaire)}
              </div>
              <button
                onClick={() => removeLigne(id, l.id)}
                className="text-muted-foreground hover:text-destructive justify-self-center"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {(contrat.lignes ?? []).length === 0 && (
            <div className="px-3 py-3 text-xs text-muted-foreground border-t">
              Aucune ligne. Ajoutez du matériel ou une prestation ci-dessous.
            </div>
          )}
          <div className="grid grid-cols-[1fr_80px_130px_130px_36px] gap-2 px-3 py-2 border-t bg-muted/30 items-center font-medium">
            <div className="text-right text-sm">Total devis</div>
            <div />
            <div />
            <div className="text-right font-mono text-sm text-primary">
              {formatFCFA(totalLignes(contrat.lignes ?? []))}
            </div>
            <div />
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <Input
            placeholder="Désignation (ex : 4 caméras IP 4MP)"
            value={newLigne.description}
            onChange={(e) => setNewLigne({ ...newLigne, description: e.target.value })}
          />
          <Input
            type="number"
            min={1}
            className="w-20"
            placeholder="Qté"
            value={newLigne.quantite}
            onChange={(e) => setNewLigne({ ...newLigne, quantite: Number(e.target.value) })}
          />
          <Input
            type="number"
            min={0}
            className="w-32"
            placeholder="P.U."
            value={newLigne.prixUnitaire}
            onChange={(e) => setNewLigne({ ...newLigne, prixUnitaire: Number(e.target.value) })}
          />
          <Button
            onClick={() => {
              if (!newLigne.description.trim()) return;
              addLigne(id, newLigne.description, newLigne.quantite, newLigne.prixUnitaire);
              setNewLigne({ description: "", quantite: 1, prixUnitaire: 0 });
            }}
          >
            Ajouter
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-medium">Transformer ce devis en contrat d’entretien</div>
          <div className="text-xs text-muted-foreground">
            Le client et les informations du devis seront repris automatiquement.
          </div>
        </div>
        <Button variant="secondary" onClick={() => setOpenMaintenance(true)}>
          <FileSignature className="h-4 w-4" />
          Créer le contrat d’entretien
        </Button>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Fermer
          </Button>
           <Button variant="outline" onClick={() => exportContratPDF(contratWithClient)}>
            Exporter en PDF
        </Button>
        <Button
          onClick={() => {
            toast.success("Contrat enregistré");
            onClose();
          }}
        >
          Enregistrer
        </Button>
      </DialogFooter>

      <Dialog open={openMaintenance} onOpenChange={setOpenMaintenance}>
        {openMaintenance && (
          <MaintenanceContractDialog
            source={contratWithClient}
            onClose={() => setOpenMaintenance(false)}
          />
        )}
      </Dialog>
    </DialogContent>
  );
}

function NewContratDialog({ onClose }: { onClose: () => void }) {
  const { addContrat } = useContratActions();
  const { clients}=useClients();
  const {
    clearErrors,
    control,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ContratFormValues>({
    resolver: zodResolver(contratFormSchema),
    defaultValues: {
     clientId : "",
     type: TypeContrat.INSTALLATION_PONCTUELLE,
      besoin: "vidéosurveillance",
      dureeMois: 12,
      statut: StatutContrat.BROUILLON,
      lignes: [{ description: "", quantite: 1, prixUnitaire: 0 }],
    },
  });
  const {
    fields: lignes,
    append: addLigne,
    remove: removeLigne,
  } = useFieldArray({ control, name: "lignes" });
  const lignesValues = watch("lignes");
  const total = lignesValues.reduce(
    (somme, ligne) => somme + (ligne.quantite || 0) * (ligne.prixUnitaire || 0),
    0,
  );

  const submit = async (values: ContratFormValues) => {
    clearErrors("root.server");

    const lignesValides = values.lignes
  .filter((ligne) => ligne.description && ligne.quantite > 0)
  .map((ligne) => ({
    designation: ligne.description,
    quantite: ligne.quantite,
    prixUnitaire: ligne.prixUnitaire,
  }));
    const now = new Date();
    const echeance = new Date(now);
    echeance.setMonth(echeance.getMonth() + values.dureeMois);

    try {
     await addContrat({
  type: values.type,
  clientId: values.clientId,
  statut: values.statut as StatutContrat,
  montant: lignesValides.reduce(
    (somme, ligne) => somme + ligne.quantite * ligne.prixUnitaire,
    0
  ),
  dateSignature: now.toISOString(),
  dateEcheance: echeance.toISOString(),
  dureeMois: values.dureeMois,
  lignes: lignesValides,
});
      toast.success("Contrat créé — CA dashboard mis à jour");
      onClose();
    } catch (error) {
      const message = getApiErrorMessage(error, "La création du contrat a échoué.");
      setError("root.server", { type: "server", message });
      toast.error(message);
    }
  };

  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Nouveau devis / contrat</DialogTitle>
        <DialogDescription>
          Le montant du contrat est calculé automatiquement à partir des lignes du devis.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(submit)}>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Client *</Label>
          <Controller
  name="clientId"
  control={control}
  render={({ field }) => (
    <Select
      value={field.value || "none"}
      onValueChange={(value) => {
        if (value === "none") {
          field.onChange(undefined);
          return;
        }
        field.onChange(value);
      }}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">— Client hors contrat —</SelectItem>
        {clients.map((client) => (
          <SelectItem key={client.id} value={client.id}>
            {client.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )}
/>
            <FieldError message={errors.clientId?.message} />
          </div>
          <div>
            <Label>Type</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-invalid={!!errors.type}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.type?.message} />
          </div>
          <div>
            <Label>Service</Label>
            <Controller
              name="besoin"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-invalid={!!errors.besoin}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BESOINS.map((besoin) => (
                      <SelectItem key={besoin} value={besoin}>
                        {besoin}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.besoin?.message} />
          </div>
          <div>
            <Label>Durée (mois)</Label>
            <Controller
              name="dureeMois"
              control={control}
              render={({ field }) => (
                <Input
                  type="number"
                  min={1}
                  max={120}
                  value={field.value}
                  onChange={(event) => field.onChange(Number(event.target.value))}
                  aria-invalid={!!errors.dureeMois}
                />
              )}
            />
            <FieldError message={errors.dureeMois?.message} />
          </div>
          <div>
            <Label>Statut initial</Label>
            <Controller
              name="statut"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-invalid={!!errors.statut}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUTS.map((statut) => (
                      <SelectItem key={statut} value={statut}>
                        {statut}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.statut?.message} />
          </div>
        </div>

        <div className="mt-2">
          <div className="flex items-center justify-between mb-2">
            <Label>Lignes du devis</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => addLigne({ description: "", quantite: 1, prixUnitaire: 0 })}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter une ligne
            </Button>
          </div>
          <div className="rounded-md border overflow-hidden">
            <div className="grid grid-cols-[1fr_80px_130px_130px_36px] gap-2 px-3 py-2 bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
              <div>Désignation</div>
              <div className="text-center">Qté</div>
              <div className="text-right">P.U. (FCFA)</div>
              <div className="text-right">Total</div>
              <div />
            </div>
            {lignes.map((ligne, index) => (
              <div
                key={ligne.id}
                className="grid grid-cols-[1fr_80px_130px_130px_36px] gap-2 px-3 py-1.5 items-start border-t"
              >
                <div>
                  <Controller
                    name={`lignes.${index}.description`}
                    control={control}
                    render={({ field }) => (
                      <Input {...field} className="h-8" placeholder="Ex : 4 caméras IP 4MP" />
                    )}
                  />
                  <FieldError message={errors.lignes?.[index]?.description?.message} />
                </div>
                <div>
                  <Controller
                    name={`lignes.${index}.quantite`}
                    control={control}
                    render={({ field }) => (
                      <Input
                        type="number"
                        min={1}
                        className="h-8 text-center"
                        value={field.value}
                        onChange={(event) => field.onChange(Number(event.target.value))}
                      />
                    )}
                  />
                  <FieldError message={errors.lignes?.[index]?.quantite?.message} />
                </div>
                <div>
                  <Controller
                    name={`lignes.${index}.prixUnitaire`}
                    control={control}
                    render={({ field }) => (
                      <Input
                        type="number"
                        min={0}
                        className="h-8 text-right font-mono"
                        value={field.value}
                        onChange={(event) => field.onChange(Number(event.target.value))}
                      />
                    )}
                  />
                  <FieldError message={errors.lignes?.[index]?.prixUnitaire?.message} />
                </div>
                <div className="text-right font-mono text-sm pt-2">
                  {formatFCFA(
                    (lignesValues[index]?.quantite || 0) * (lignesValues[index]?.prixUnitaire || 0),
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeLigne(index)}
                  className="text-muted-foreground hover:text-destructive justify-self-center mt-2"
                  aria-label="Supprimer la ligne"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {lignes.length === 0 && (
              <div className="border-t px-3 py-2">
                <FieldError message={errors.lignes?.message} />
              </div>
            )}
            <div className="grid grid-cols-[1fr_80px_130px_130px_36px] gap-2 px-3 py-2 border-t bg-muted/30 items-center font-medium">
              <div className="text-right text-sm">Total devis</div>
              <div />
              <div />
              <div className="text-right font-mono text-sm text-primary">{formatFCFA(total)}</div>
              <div />
            </div>
          </div>
        </div>
        <FieldError message={errors.root?.server?.message} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Création..." : "Créer le devis"}
          </Button>
        </DialogFooter>

        </form>
        </DialogContent>
      
        
  );
}
