import useSWR, { useSWRConfig } from "swr";

import { apiRequest } from "@/lib/api/client";
import { apiEndpoints } from "@/lib/api/endpoints";
import { extractList, type ListResponse } from "@/lib/api/list-response";
import type {
  Article,
  ArticleFilters,
  ArticleWithMouvements,
  CategorieArticle,
  CategorieArticleDto,
  CreateArticleDto,
  CreateMouvementDto,
  MouvementFilters,
  MouvementStock,
  UpdateArticleDto,
} from "@/features/interface/stock.type";

type ItemResponse<T> = T | { data: T };

function extractItem<T>(response: ItemResponse<T>): T {
  return "data" in (response as { data?: T }) ? (response as { data: T }).data : (response as T);
}

function withQuery(url: string, params: Record<string, string | boolean | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "" || value === false) return;
    query.set(key, String(value));
  });
  const qs = query.toString();
  return qs ? `${url}?${qs}` : url;
}

const isStockKey = (key: unknown) =>
  typeof key === "string" &&
  (key.startsWith(apiEndpoints.stockArticles) ||
    key.startsWith(apiEndpoints.stockAlertes) ||
    key.startsWith(apiEndpoints.stockCategories) ||
    key.startsWith(apiEndpoints.stockMouvements));

export function useArticles(filters: ArticleFilters = {}) {
  const { data, error, mutate, isLoading } = useSWR<ListResponse<Article>>(
    withQuery(apiEndpoints.stockArticles, { ...filters }),
    apiRequest,
    { keepPreviousData: true },
  );

  return { articles: extractList(data), error, mutate, isLoading };
}

export function useArticle(id?: string | null) {
  const { data, error, mutate, isLoading } = useSWR<ItemResponse<ArticleWithMouvements> | null>(
    id ? apiEndpoints.stockArticle(id) : null,
    apiRequest,
  );

  return { article: data ? extractItem(data) : null, error, mutate, isLoading };
}

export function useCategories() {
  const { data, error, mutate, isLoading } = useSWR<ListResponse<CategorieArticle>>(
    apiEndpoints.stockCategories,
    apiRequest,
  );

  return { categories: extractList(data), error, mutate, isLoading };
}

export function useStockAlertes() {
  const { data, error, mutate, isLoading } = useSWR<ListResponse<Article>>(
    apiEndpoints.stockAlertes,
    apiRequest,
  );

  return { alertes: extractList(data), error, mutate, isLoading };
}

export function useMouvements(filters: MouvementFilters = {}, enabled = true) {
  const { data, error, mutate, isLoading } = useSWR<ListResponse<MouvementStock>>(
    enabled ? withQuery(apiEndpoints.stockMouvements, { ...filters }) : null,
    apiRequest,
  );

  return { mouvements: extractList(data), error, mutate, isLoading };
}

export function useStockActions() {
  const { mutate } = useSWRConfig();

  const refresh = () => mutate(isStockKey);

  return {
    addArticle: async (payload: CreateArticleDto) => {
      const response = await apiRequest<ItemResponse<Article>>(apiEndpoints.stockArticles, {
        method: "POST",
        body: payload,
      });
      await refresh();
      return extractItem(response);
    },
    updateArticle: async (id: string, payload: UpdateArticleDto) => {
      const response = await apiRequest<ItemResponse<Article>>(apiEndpoints.stockArticle(id), {
        method: "PUT",
        body: payload,
      });
      await refresh();
      return extractItem(response);
    },
    disableArticle: async (id: string) => {
      await apiRequest(apiEndpoints.stockArticle(id), { method: "DELETE" });
      await refresh();
    },
    addCategorie: async (payload: CategorieArticleDto) => {
      const response = await apiRequest<ItemResponse<CategorieArticle>>(
        apiEndpoints.stockCategories,
        { method: "POST", body: payload },
      );
      await refresh();
      return extractItem(response);
    },
    updateCategorie: async (id: string, payload: CategorieArticleDto) => {
      const response = await apiRequest<ItemResponse<CategorieArticle>>(
        apiEndpoints.stockCategorie(id),
        { method: "PUT", body: payload },
      );
      await refresh();
      return extractItem(response);
    },
    deleteCategorie: async (id: string) => {
      await apiRequest(apiEndpoints.stockCategorie(id), { method: "DELETE" });
      await refresh();
    },
    addMouvement: async (payload: CreateMouvementDto) => {
      const response = await apiRequest<{ data: MouvementStock; alerte?: boolean }>(
        apiEndpoints.stockMouvements,
        { method: "POST", body: payload },
      );
      await refresh();
      return { mouvement: response.data, alerte: response.alerte === true };
    },
  };
}
