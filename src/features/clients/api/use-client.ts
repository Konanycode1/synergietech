import useSWR, { useSWRConfig } from "swr";

import type { Client, CreateClientDto, UpdateClientDto } from "@/features/interface/client.type";
import { api } from "@/features/util/url";
import { apiRequest } from "@/lib/api/client";
import { apiEndpoints } from "@/lib/api/endpoints";
import { CreateMembrePayload } from "@/features/equipe/api/use-equipe";

type ClientListResponse =
  | Client[]
  | {
      clients?: Client[];
      data?: Client[] | { clients?: Client[] };
    };

type ClientDetailResponse = Client | { client: Client } | { data: Client | { client: Client } };

function extractClients(response?: ClientListResponse): Client[] {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.clients)) return response.clients;
  if (Array.isArray(response?.data)) return response.data;
  if (response?.data && Array.isArray(response.data.clients)) return response.data.clients;
  return [];
}

function extractClient(response?: ClientDetailResponse | null): Client | null {
  if (!response) return null;
  if ("client" in response) return response.client;
  if ("data" in response) {
    return "client" in response.data ? response.data.client : response.data;
  }
  return response;
}

export function useClients() {
  const { data, error, mutate, isLoading } = useSWR<ClientListResponse>(
    `${api}client/`,
    apiRequest,
  );
  return {
    clients: extractClients(data),
    error,
    mutate,
    isLoading,
  };
}

export function useClient(id?: string) {
  const { data, error, mutate, isLoading } = useSWR<ClientDetailResponse | null>(
    id ? `${api}client/${id}` : null,
    apiRequest,
  );
  return {
    client: extractClient(data),
    error,
    mutate,
    isLoading,
  };
}

export function useClientActions() {
  const { mutate } = useSWRConfig();

  const refresh = (id?: string) =>
    Promise.all([
      mutate(apiEndpoints.allUser),
      id ? mutate(apiEndpoints.userId(id)) : Promise.resolve(),
      mutate(apiEndpoints.prospects),
      mutate(apiEndpoints.interventions),
    ]);

  return {
    addClient: async (payload: CreateClientDto) => {
      const user = await apiRequest<Client>(apiEndpoints.createClient, {
        method: "POST",
        body: payload,
      });
      await refresh();
      return user;
    },
    updateClient: async (id: string, patch: UpdateClientDto) => {
      const user = await apiRequest<Client>(apiEndpoints.updateClient(id), {
        method: "PUT",
        body: patch,
      });
      await refresh(id);
      return user;
    },
    removeClient: async (id: string) => {
      await apiRequest<void>(apiEndpoints.deleteClient(id), { method: "DELETE" });
      await refresh();
    },
  };
}
