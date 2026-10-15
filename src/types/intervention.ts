export type InterventionType =
  "INSTALLATION" | "MAINTENANCE_PREVENTIVE" | "DEPANNAGE" | "CONTROLE_PERIODIQUE";

export type InterventionStatut = "PLANIFIEE" | "EN_COURS" | "TERMINEE" | "ANNULEE";

export interface Intervention {
  id: string;
  contratId?: string;
  clientNom: string;
  type: InterventionType;
  technicien: string;
  technicienId?: string;
  dateHeure: string;
  statut: InterventionStatut;
  description: string;
  rapport?: string;
  materielRemplace?: boolean;
}
