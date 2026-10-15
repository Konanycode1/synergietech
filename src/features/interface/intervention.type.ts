import { StatutIntervention, TypeIntervention } from "./enum";

export interface APIintervention {
  id: string;
  type: TypeIntervention;
  statut: StatutIntervention;
  dateHeurePrevue: string;
  description: string | null;
  rapport: string | null;
  materielRemplace: boolean;
  clientId: string;
  contratId: string | null;
  technicienId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiInterventionWithRelations extends APIintervention {
  client?: { id: string; name: string } | null;
  technicien?: { id: string; name: string } | null;
}

export interface CreateInterventionDto {
  type: TypeIntervention;
  dateHeurePrevue: string;
  description?: string;
  clientId: string;
  contratId?: string;
  technicienId?: string;
  statut?: StatutIntervention;
}

export type UpdateInterventionDto = Partial<CreateInterventionDto> & {
  rapport?: string;
  materielRemplace?: boolean;
};

export interface EndInterventionDto {
  rapport: string;
  materielRemplace?: boolean;
}
