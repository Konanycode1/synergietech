export enum TypeMouvementStock {
  ENTREE = "ENTREE",
  SORTIE = "SORTIE",
  AJUSTEMENT = "AJUSTEMENT",
}

export interface CategorieArticle {
  id: string;
  nom: string;
  slug: string;
  description: string | null;
  _count?: { articles: number };
  createdAt: string;
  updatedAt: string;
}

export interface CategorieArticleDto {
  nom: string;
  description?: string;
}

export interface Article {
  id: string;
  reference: string;
  designation: string;
  categorieId: string | null;
  categorie: Pick<CategorieArticle, "id" | "nom" | "slug"> | null;
  unite: string;
  quantite: number;
  seuilAlerte: number;
  prixUnitaire: number;
  emplacement: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MouvementStock {
  id: string;
  type: TypeMouvementStock;
  quantite: number;
  quantiteAvant: number;
  quantiteApres: number;
  motif: string | null;
  articleId: string;
  userId: string | null;
  interventionId: string | null;
  createdAt: string;
  article?: Pick<Article, "id" | "reference" | "designation" | "unite"> | null;
  user?: { id: string; name: string | null } | null;
}

export interface ArticleWithMouvements extends Article {
  mouvements?: MouvementStock[];
}

export interface CreateArticleDto {
  reference: string;
  designation: string;
  categorieId?: string;
  unite?: string;
  quantite?: number;
  seuilAlerte?: number;
  prixUnitaire?: number;
  emplacement?: string;
}

export type UpdateArticleDto = Partial<Omit<CreateArticleDto, "quantite" | "categorieId">> & {
  categorieId?: string | null;
  isActive?: boolean;
};

export interface CreateMouvementDto {
  articleId: string;
  type: TypeMouvementStock;
  quantite: number;
  motif?: string;
  interventionId?: string;
}

export interface ArticleFilters {
  search?: string;
  categorieId?: string;
  alerte?: boolean;
  inactifs?: boolean;
}

export interface MouvementFilters {
  articleId?: string;
  type?: TypeMouvementStock;
  interventionId?: string;
}
