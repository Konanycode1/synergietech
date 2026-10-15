import useSWR, { useSWRConfig } from "swr";

import { apiRequest } from "@/lib/api/client";
import { apiEndpoints } from "@/lib/api/endpoints";
import { extractList, type ListResponse } from "@/lib/api/list-response";
import type { Intervention, InterventionStatut, InterventionType } from "@/types";
import { StatutIntervention, TypeIntervention } from "@/features/interface/enum";
import type {
  APIintervention,
  ApiInterventionWithRelations,
  CreateInterventionDto,
  EndInterventionDto,
  UpdateInterventionDto,
} from "@/features/interface/intervention.type";

export type CreateInterventionPayload = CreateInterventionDto;

type ItemResponse<T> = T | { data: T };

function extractItem<T>(response: ItemResponse<T>): T {
  return "data" in (response as { data?: T }) ? (response as { data: T }).data : (response as T);
}

const statutInt: Record<StatutIntervention, InterventionStatut> = {
  [StatutIntervention.PLANIFIEE]: "PLANIFIEE",
  [StatutIntervention.EN_COURS]: "EN_COURS",
  [StatutIntervention.TERMINEE]: "TERMINEE",
  [StatutIntervention.ANNULEE]: "ANNULEE",
};

const typeInt: Record<TypeIntervention, InterventionType> = {
  [TypeIntervention.INSTALLATION]: "INSTALLATION",
  [TypeIntervention.MAINTENANCE_PREVENTIVE]: "MAINTENANCE_PREVENTIVE",
  [TypeIntervention.DEPANNAGE]: "DEPANNAGE",
  [TypeIntervention.CONTROLE_PERIODIQUE]: "CONTROLE_PERIODIQUE",
};

function toUiIntervention(intervention: ApiInterventionWithRelations): Intervention {
  return {
    id: intervention.id,
    contratId: intervention.contratId ?? undefined,
    clientNom: intervention.client?.name ?? "",
    type: typeInt[intervention.type] ?? "INSTALLATION",
    technicien: intervention.technicien?.name ?? "Non assigné",
    technicienId: intervention.technicienId ?? undefined,
    dateHeure: intervention.dateHeurePrevue,
    statut: statutInt[intervention.statut] ?? "PLANIFIEE",
    description: intervention.description ?? "",
    rapport: intervention.rapport ?? undefined,
    materielRemplace: intervention.materielRemplace,
  };
}

export function useInterventions() {
  const { data, error, mutate, isLoading } = useSWR<ListResponse<APIintervention>>(
    apiEndpoints.interventions,
    apiRequest,
  );

  return { interventions: extractList(data).map(toUiIntervention), error, mutate, isLoading };
}

export function useIntervention(id?: string) {
  const { data, error, mutate, isLoading } = useSWR<ItemResponse<APIintervention> | null>(
    id ? apiEndpoints.intervention(id) : null,
    apiRequest,
  );

  return {
    intervention: data ? toUiIntervention(extractItem(data)) : null,
    error,
    mutate,
    isLoading,
  };
}

export function useInterventionActions() {
  const { mutate } = useSWRConfig();

  const refresh = (id?: string) =>
    Promise.all([
      mutate(apiEndpoints.interventions),
      id ? mutate(apiEndpoints.intervention(id)) : Promise.resolve(),
    ]);

  return {
    addIntervention: async (payload: CreateInterventionPayload) => {
      const response = await apiRequest<ItemResponse<APIintervention>>(
        apiEndpoints.addIntervention,
        { method: "POST", body: payload },
      );
      await refresh();
      return toUiIntervention(extractItem(response));
    },
    updateIntervention: async (id: string, put: Partial<APIintervention>) => {
      const response = await apiRequest<ItemResponse<APIintervention>>(
        apiEndpoints.updateIntervention(id),
        { method: "PUT", body: put },
      );
      await refresh(id);
      return toUiIntervention(extractItem(response));
    },
    endIntervention: async (id: string, payload: EndInterventionDto) => {
      const response = await apiRequest<ItemResponse<APIintervention>>(
        apiEndpoints.endIntervention(id),
        { method: "PUT", body: payload },
      );
      await refresh(id);
      return toUiIntervention(extractItem(response));
    },
    deleteIntervention: async (id: string) => {
      await apiRequest(apiEndpoints.deleteIntervention(id), { method: "DELETE" });
      await refresh();
    },
  };
}
