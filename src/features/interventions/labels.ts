import type { InterventionStatut, InterventionType } from "@/types";

export const TYPE_LABEL: Record<InterventionType, string> = {
  INSTALLATION: "Installation",
  MAINTENANCE_PREVENTIVE: "Maintenance préventive",
  DEPANNAGE: "Dépannage",
  CONTROLE_PERIODIQUE: "Contrôle périodique",
};

export const STATUT_LABEL: Record<InterventionStatut, string> = {
  PLANIFIEE: "Planifiée",
  EN_COURS: "En cours",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
};
