import { type ComponentProps, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowLeftRight,
  Boxes,
  MapPin,
  MoreVertical,
  Package,
  PackageX,
  Pencil,
  Plus,
  Search,
  Tags,
  Trash2,
  Wallet,
  Wand2,
} from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/PageHeader";
import { FieldError } from "@/components/PhoneField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  type Article,
  type CategorieArticle,
  type MouvementStock,
  TypeMouvementStock,
} from "@/features/interface/stock.type";
import {
  useArticle,
  useArticles,
  useCategories,
  useMouvements,
  useStockActions,
} from "@/features/stock/api/use-stock";
import {
  MOUVEMENT_LABEL,
  MOUVEMENT_STYLE,
  MouvementDialog,
} from "@/features/stock/components/MouvementDialog";
import { nextReference, normalizeReference, referencePrefix } from "@/features/stock/reference";
import { ApiError, getApiErrorMessage } from "@/lib/api/client";
import { formatDateTime, formatFCFA } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const ALL = "all";
const NONE = "none";

function stockLevel(article: Article): "rupture" | "alerte" | "ok" {
  if (article.quantite <= 0) return "rupture";
  if (article.quantite <= article.seuilAlerte) return "alerte";
  return "ok";
}

const LEVEL_STYLE = {
  rupture: "bg-destructive/15 text-destructive border-destructive/30",
  alerte: "bg-warning/15 text-warning border-warning/30",
  ok: "bg-success/15 text-success border-success/30",
};

function QuantiteBadge({ article }: { article: Article }) {
  return (
    <Badge variant="outline" className={cn("tabular-nums", LEVEL_STYLE[stockLevel(article)])}>
      {article.quantite} {article.unite}
    </Badge>
  );
}

type MouvementTarget = { articleId?: string; type?: TypeMouvementStock } | null;

export function StockPage() {
  const [inactifs, setInactifs] = useState(false);
  const { articles, isLoading, error } = useArticles({ inactifs });
  const [search, setSearch] = useState("");
  const [categorie, setCategorie] = useState(ALL);
  const [alerteOnly, setAlerteOnly] = useState(false);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Article | "new" | null>(null);
  const [mouvement, setMouvement] = useState<MouvementTarget>(null);
  const [disabling, setDisabling] = useState<Article | null>(null);

  const actifs = useMemo(() => articles.filter((article) => article.isActive), [articles]);
  const { categories } = useCategories();

  const stats = useMemo(
    () => ({
      total: actifs.length,
      valeur: actifs.reduce((sum, a) => sum + a.quantite * a.prixUnitaire, 0),
      alertes: actifs.filter((a) => stockLevel(a) === "alerte").length,
      ruptures: actifs.filter((a) => stockLevel(a) === "rupture").length,
    }),
    [actifs],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("fr-FR");
    return articles
      .filter((article) => {
        if (categorie !== ALL && article.categorieId !== categorie) return false;
        if (alerteOnly && stockLevel(article) === "ok") return false;
        if (!term) return true;
        return [article.reference, article.designation, article.emplacement]
          .filter(Boolean)
          .some((value) => value!.toLocaleLowerCase("fr-FR").includes(term));
      })
      .sort((a, b) => a.designation.localeCompare(b.designation, "fr"));
  }, [alerteOnly, articles, categorie, search]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Stock"
        subtitle="Articles, catégories, niveaux de stock et mouvements du magasin"
        actions={
          <>
            <Button variant="outline" onClick={() => setMouvement({})}>
              <ArrowLeftRight className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Mouvement</span>
            </Button>
            <Button onClick={() => setEditing("new")}>
              <Plus className="h-4 w-4 mr-1.5" /> Nouvel article
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-6">
        <StatCard icon={Boxes} label="Articles actifs" value={String(stats.total)} />
        <StatCard icon={Wallet} label="Valeur du stock" value={formatFCFA(stats.valeur)} />
        <StatCard
          icon={AlertTriangle}
          label="Sous le seuil"
          value={String(stats.alertes)}
          tone={stats.alertes ? "warning" : undefined}
          onClick={() => setAlerteOnly(true)}
        />
        <StatCard
          icon={PackageX}
          label="En rupture"
          value={String(stats.ruptures)}
          tone={stats.ruptures ? "destructive" : undefined}
          onClick={() => setAlerteOnly(true)}
        />
      </div>

      <Tabs defaultValue="articles">
        <TabsList>
          <TabsTrigger value="articles">
            <Package className="h-4 w-4 mr-1.5" /> Articles
          </TabsTrigger>
          <TabsTrigger value="mouvements">
            <ArrowLeftRight className="h-4 w-4 mr-1.5" /> Mouvements
          </TabsTrigger>
          <TabsTrigger value="categories">
            <Tags className="h-4 w-4 mr-1.5" /> Catégories
          </TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Référence, désignation, emplacement..."
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={categorie} onValueChange={setCategorie}>
                <SelectTrigger className="flex-1 sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Toutes catégories</SelectItem>
                  {categories.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="flex shrink-0 items-center gap-2 text-sm whitespace-nowrap">
                <Switch checked={alerteOnly} onCheckedChange={setAlerteOnly} />
                Alertes
              </label>
              <label className="flex shrink-0 items-center gap-2 text-sm whitespace-nowrap">
                <Switch checked={inactifs} onCheckedChange={setInactifs} />
                Inactifs
              </label>
            </div>
          </div>

          {error && (
            <Card>
              <CardContent className="p-4 text-sm text-destructive">
                {getApiErrorMessage(error, "Impossible de charger le stock.")}
              </CardContent>
            </Card>
          )}

          {/* Mobile : cartes */}
          <div className="space-y-2 md:hidden">
            {isLoading &&
              Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            {!isLoading && filtered.length === 0 && <EmptyState />}
            {filtered.map((article) => (
              <button
                key={article.id}
                onClick={() => setDetailId(article.id)}
                className={cn(
                  "w-full rounded-lg border border-border bg-card p-3 text-left active:bg-muted",
                  !article.isActive && "opacity-60",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{article.designation}</div>
                    <div className="text-xs text-muted-foreground">
                      {article.reference}
                      {article.categorie && ` · ${article.categorie.nom}`}
                    </div>
                  </div>
                  <QuantiteBadge article={article} />
                </div>
                {article.emplacement && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {article.emplacement}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Desktop : tableau */}
          <Card className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Désignation</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Emplacement</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                  <TableHead className="text-right">Seuil</TableHead>
                  <TableHead className="text-right">Prix unitaire</TableHead>
                  <TableHead className="text-right">Valeur</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  Array.from({ length: 4 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={9}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                {!isLoading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <EmptyState />
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((article) => (
                  <TableRow
                    key={article.id}
                    onClick={() => setDetailId(article.id)}
                    className={cn("cursor-pointer", !article.isActive && "opacity-60")}
                  >
                    <TableCell className="font-mono text-xs">{article.reference}</TableCell>
                    <TableCell className="font-medium">
                      {article.designation}
                      {!article.isActive && (
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          Inactif
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{article.categorie?.nom ?? "-"}</TableCell>
                    <TableCell className="text-xs">{article.emplacement ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      <QuantiteBadge article={article} />
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {article.seuilAlerte}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums whitespace-nowrap">
                      {formatFCFA(article.prixUnitaire)}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums whitespace-nowrap">
                      {formatFCFA(article.prixUnitaire * article.quantite)}
                    </TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <ArticleMenu
                        article={article}
                        onMouvement={(type) => setMouvement({ articleId: article.id, type })}
                        onEdit={() => setEditing(article)}
                        onDisable={() => setDisabling(article)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="mouvements">
          <MouvementsTab articles={articles} />
        </TabsContent>
        <TabsContent value="categories">
          <CategoriesTab categories={categories} />
        </TabsContent>
      </Tabs>

      <Dialog open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        {detailId && (
          <ArticleDetail
            id={detailId}
            onMouvement={(type) => {
              setMouvement({ articleId: detailId, type });
              setDetailId(null);
            }}
            onEdit={(article) => {
              setEditing(article);
              setDetailId(null);
            }}
          />
        )}
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        {editing && (
          <ArticleFormDialog
            article={editing === "new" ? null : editing}
            categories={categories}
            onClose={() => setEditing(null)}
          />
        )}
      </Dialog>

      <Dialog open={!!mouvement} onOpenChange={(open) => !open && setMouvement(null)}>
        {mouvement && (
          <MouvementDialog
            articles={articles}
            defaultArticleId={mouvement.articleId}
            defaultType={mouvement.type}
            onClose={() => setMouvement(null)}
          />
        )}
      </Dialog>

      <Dialog open={!!disabling} onOpenChange={(open) => !open && setDisabling(null)}>
        {disabling && (
          <DisableArticleDialog article={disabling} onClose={() => setDisabling(null)} />
        )}
      </Dialog>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
  onClick,
}: {
  icon: typeof Boxes;
  label: string;
  value: string;
  tone?: "warning" | "destructive";
  onClick?: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className={cn(onClick && "cursor-pointer hover:bg-muted/40 transition-colors")}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon
            className={cn(
              "h-4 w-4",
              tone === "warning" && "text-warning",
              tone === "destructive" && "text-destructive",
            )}
          />
          {label}
        </div>
        <div className="mt-1 truncate text-lg font-semibold tabular-nums sm:text-2xl">{value}</div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="py-10 text-center text-sm text-muted-foreground">
      <Package className="mx-auto mb-2 h-8 w-8 opacity-40" />
      Aucun article trouvé
    </div>
  );
}

function ArticleMenu({
  article,
  onMouvement,
  onEdit,
  onDisable,
}: {
  article: Article;
  onMouvement: (type: TypeMouvementStock) => void;
  onEdit: () => void;
  onDisable: () => void;
}) {
  const { updateArticle } = useStockActions();
  const reactivate = async () => {
    try {
      await updateArticle(article.id, { isActive: true });
      toast.success("Article réactivé");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "La réactivation a échoué."));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Actions">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onMouvement(TypeMouvementStock.ENTREE)}>
          Entrée de stock
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onMouvement(TypeMouvementStock.SORTIE)}>
          Sortie de stock
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onMouvement(TypeMouvementStock.AJUSTEMENT)}>
          Ajustement d'inventaire
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onEdit}>Modifier</DropdownMenuItem>
        {article.isActive ? (
          <DropdownMenuItem className="text-destructive" onClick={onDisable}>
            Désactiver
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => void reactivate()}>Réactiver</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ArticleDetail({
  id,
  onMouvement,
  onEdit,
}: {
  id: string;
  onMouvement: (type: TypeMouvementStock) => void;
  onEdit: (article: Article) => void;
}) {
  const { article, isLoading } = useArticle(id);

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      {isLoading || !article ? (
        <>
          <DialogHeader>
            <DialogTitle>Chargement...</DialogTitle>
          </DialogHeader>
          <Skeleton className="h-40 w-full" />
        </>
      ) : (
        <>
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2 pr-6">
              {article.designation}
              <QuantiteBadge article={article} />
            </DialogTitle>
            <DialogDescription className="font-mono">{article.reference}</DialogDescription>
          </DialogHeader>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Info label="Catégorie" value={article.categorie?.nom ?? "-"} />
            <Info label="Emplacement" value={article.emplacement ?? "-"} />
            <Info label="Seuil d'alerte" value={`${article.seuilAlerte} ${article.unite}`} />
            <Info label="Prix unitaire" value={formatFCFA(article.prixUnitaire)} />
          </dl>

          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMouvement(TypeMouvementStock.ENTREE)}
            >
              Entrée
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMouvement(TypeMouvementStock.SORTIE)}
            >
              Sortie
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMouvement(TypeMouvementStock.AJUSTEMENT)}
            >
              Ajuster
            </Button>
          </div>

          <div className="border-t border-border pt-3">
            <div className="mb-2 text-sm font-medium">Derniers mouvements</div>
            {article.mouvements?.length ? (
              <ul className="space-y-1.5">
                {article.mouvements.map((m) => (
                  <MouvementRow key={m.id} mouvement={m} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun mouvement enregistré.</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => onEdit(article)}>
              <Pencil className="h-4 w-4 mr-1.5" /> Modifier l'article
            </Button>
          </DialogFooter>
        </>
      )}
    </DialogContent>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function MouvementRow({
  mouvement: m,
  articleLabel,
}: {
  mouvement: MouvementStock;
  articleLabel?: string;
}) {
  const delta = m.quantiteApres - m.quantiteAvant;
  return (
    <li className="flex items-start justify-between gap-3 rounded-md bg-muted/40 px-3 py-2 text-sm">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn("text-[10px]", MOUVEMENT_STYLE[m.type])}>
            {MOUVEMENT_LABEL[m.type]}
          </Badge>
          {articleLabel && <span className="truncate font-medium">{articleLabel}</span>}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {formatDateTime(m.createdAt)}
          {m.user?.name && ` · ${m.user.name}`}
          {m.motif && ` · ${m.motif}`}
        </div>
      </div>
      <div className="shrink-0 text-right tabular-nums">
        <div
          className={cn(
            "font-semibold",
            delta > 0 ? "text-success" : delta < 0 ? "text-warning" : "text-muted-foreground",
          )}
        >
          {delta > 0 ? `+${delta}` : delta}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {m.quantiteAvant} → {m.quantiteApres}
        </div>
      </div>
    </li>
  );
}

function MouvementsTab({ articles }: { articles: Article[] }) {
  const [type, setType] = useState<TypeMouvementStock | typeof ALL>(ALL);
  const [articleId, setArticleId] = useState(ALL);
  const { mouvements, isLoading } = useMouvements({
    type: type === ALL ? undefined : type,
    articleId: articleId === ALL ? undefined : articleId,
  });
  const articlesById = useMemo(
    () => new Map(articles.map((article) => [article.id, article])),
    [articles],
  );
  const labelOf = (m: MouvementStock) =>
    m.article?.designation ?? articlesById.get(m.articleId)?.designation ?? "Article";

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select value={type} onValueChange={(value) => setType(value as TypeMouvementStock)}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous les types</SelectItem>
            {Object.values(TypeMouvementStock).map((value) => (
              <SelectItem key={value} value={value}>
                {MOUVEMENT_LABEL[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={articleId} onValueChange={setArticleId}>
          <SelectTrigger className="sm:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous les articles</SelectItem>
            {articles.map((article) => (
              <SelectItem key={article.id} value={article.id}>
                {article.designation}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ul className="space-y-1.5 md:hidden">
        {isLoading && <Skeleton className="h-16 w-full" />}
        {!isLoading && mouvements.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Aucun mouvement</p>
        )}
        {mouvements.map((m) => (
          <MouvementRow key={m.id} mouvement={m} articleLabel={labelOf(m)} />
        ))}
      </ul>

      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Article</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Quantité</TableHead>
              <TableHead className="text-right">Avant → Après</TableHead>
              <TableHead>Motif</TableHead>
              <TableHead>Par</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && mouvements.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Aucun mouvement
                </TableCell>
              </TableRow>
            )}
            {mouvements.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="text-xs whitespace-nowrap">
                  {formatDateTime(m.createdAt)}
                </TableCell>
                <TableCell className="font-medium">{labelOf(m)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={MOUVEMENT_STYLE[m.type]}>
                    {MOUVEMENT_LABEL[m.type]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{m.quantite}</TableCell>
                <TableCell className="text-right text-xs tabular-nums">
                  {m.quantiteAvant} → {m.quantiteApres}
                </TableCell>
                <TableCell className="max-w-64 truncate text-xs">{m.motif ?? "-"}</TableCell>
                <TableCell className="text-xs">{m.user?.name ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

const optionalInt = z.string().trim().regex(/^\d*$/, "Nombre entier positif attendu");

const articleSchema = z.object({
  reference: z.string().trim().min(1, "La référence est obligatoire").max(60),
  designation: z.string().trim().min(1, "La désignation est obligatoire").max(160),
  categorieId: z.string(),
  unite: z.string().trim().min(1, "L'unité est obligatoire").max(20),
  quantite: optionalInt,
  seuilAlerte: optionalInt,
  prixUnitaire: optionalInt,
  emplacement: z.string().trim().max(120),
});

type ArticleFormValues = z.infer<typeof articleSchema>;

const toInt = (value: string) => (value === "" ? undefined : Number(value));

function ArticleFormDialog({
  article,
  categories,
  onClose,
}: {
  article: Article | null;
  categories: CategorieArticle[];
  onClose: () => void;
}) {
  const { addArticle, updateArticle } = useStockActions();
  const isEdit = !!article;
  // Toutes les références, inactifs compris : l'API refuse aussi les doublons sur ces articles.
  const { articles: allArticles } = useArticles({ inactifs: true });
  const [autoRef, setAutoRef] = useState(!isEdit);
  const [rejectedRefs, setRejectedRefs] = useState<string[]>([]);
  const {
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      reference: article?.reference ?? "",
      designation: article?.designation ?? "",
      categorieId: article?.categorieId ?? NONE,
      unite: article?.unite ?? "piece",
      quantite: "",
      seuilAlerte: article ? String(article.seuilAlerte) : "",
      prixUnitaire: article ? String(article.prixUnitaire) : "",
      emplacement: article?.emplacement ?? "",
    },
  });

  const takenRefs = useMemo(() => {
    const map = new Map<string, string>();
    allArticles
      .filter((item) => item.id !== article?.id)
      .forEach((item) => map.set(item.reference.toUpperCase(), item.designation));
    rejectedRefs.forEach((ref) => map.set(ref, map.get(ref) ?? "un autre article"));
    return map;
  }, [allArticles, article?.id, rejectedRefs]);

  const [reference, designation, categorieId] = useWatch({
    control,
    name: ["reference", "designation", "categorieId"],
  });
  const categorie = categories.find((item) => item.id === categorieId)?.nom ?? "";

  const generate = () =>
    designation.trim()
      ? nextReference(referencePrefix(categorie, designation), takenRefs.keys())
      : "";

  useEffect(() => {
    if (autoRef) setValue("reference", generate(), { shouldValidate: !!designation.trim() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRef, designation, categorie, takenRefs]);

  const duplicateOf = reference ? takenRefs.get(normalizeReference(reference)) : undefined;

  const submit = async (values: ArticleFormValues) => {
    const ref = normalizeReference(values.reference);
    if (takenRefs.has(ref)) {
      setError("reference", { message: `Référence déjà utilisée par « ${takenRefs.get(ref)} »` });
      return;
    }
    const payload = {
      reference: ref,
      designation: values.designation,
      unite: values.unite,
      seuilAlerte: toInt(values.seuilAlerte),
      prixUnitaire: toInt(values.prixUnitaire),
      emplacement: values.emplacement || undefined,
    };
    try {
      if (article) {
        await updateArticle(article.id, {
          ...payload,
          categorieId: values.categorieId === NONE ? null : values.categorieId,
        });
        toast.success("Article mis à jour");
      } else {
        await addArticle({
          ...payload,
          categorieId: values.categorieId === NONE ? undefined : values.categorieId,
          quantite: toInt(values.quantite),
        });
        toast.success("Article créé");
      }
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        // Créée entre-temps par quelqu'un d'autre : on l'écarte et on propose la suivante.
        setRejectedRefs((refs) => [...refs, ref]);
        setError("reference", {
          message: autoRef
            ? "Référence prise entre-temps, une nouvelle a été générée. Validez à nouveau."
            : "Référence déjà utilisée",
        });
        return;
      }
      const message = getApiErrorMessage(error, "L'enregistrement de l'article a échoué.");
      setError("root.server", { message });
      toast.error(message);
    }
  };

  const field = (
    name: keyof ArticleFormValues,
    label: string,
    props: ComponentProps<typeof Input> = {},
    className = "",
  ) => (
    <div className={className}>
      <Label>{label}</Label>
      <Controller
        name={name}
        control={control}
        render={({ field: f }) => <Input {...f} {...props} aria-invalid={!!errors[name]} />}
      />
      <FieldError message={errors[name]?.message} />
    </div>
  );

  const numeric = { type: "number", inputMode: "numeric", min: 0 } as const;

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{isEdit ? "Modifier l'article" : "Nouvel article"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "La quantité se modifie via les mouvements de stock."
            : "Une quantité initiale crée un mouvement d'entrée « Stock initial »."}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(submit)} className="grid grid-cols-2 gap-3">
        <div>
          <Label>Référence</Label>
          <div className="flex gap-1.5">
            <Controller
              name="reference"
              control={control}
              render={({ field: f }) => (
                <Input
                  {...f}
                  onChange={(event) => {
                    setAutoRef(false);
                    f.onChange(event.target.value.toUpperCase());
                  }}
                  placeholder={autoRef ? "Auto" : "CAM-IP-4MP"}
                  className="font-mono"
                  aria-invalid={!!errors.reference || !!duplicateOf}
                />
              )}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              title="Générer automatiquement"
              aria-label="Générer la référence"
              onClick={() => {
                setAutoRef(true);
                setValue("reference", generate(), { shouldValidate: true });
              }}
            >
              <Wand2 className="h-4 w-4" />
            </Button>
          </div>
          <FieldError
            message={
              duplicateOf ? `Déjà utilisée par « ${duplicateOf} »` : errors.reference?.message
            }
          />
          {autoRef && !duplicateOf && !errors.reference && (
            <p className="mt-1 text-[11px] text-muted-foreground">Générée automatiquement</p>
          )}
        </div>
        {field("unite", "Unité", { placeholder: "piece, m, rouleau..." })}
        {field("designation", "Désignation", { placeholder: "Caméra IP dôme 4MP" }, "col-span-2")}
        <div>
          <Label>Catégorie</Label>
          <Controller
            name="categorieId"
            control={control}
            render={({ field: f }) => (
              <Select value={f.value} onValueChange={f.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sans catégorie</SelectItem>
                  {categories.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {categories.length === 0 && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Créez vos catégories dans l'onglet « Catégories ».
            </p>
          )}
        </div>
        {field("emplacement", "Emplacement", { placeholder: "Magasin A - Étagère 2" })}
        {!isEdit && field("quantite", "Stock initial", numeric)}
        {field("seuilAlerte", "Seuil d'alerte", numeric)}
        {field("prixUnitaire", "Prix unitaire (FCFA)", numeric, isEdit ? "" : "col-span-2")}
        <div className="col-span-2">
          <FieldError message={errors.root?.server?.message} />
        </div>
        <DialogFooter className="col-span-2 gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Enregistrement..." : isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function DisableArticleDialog({ article, onClose }: { article: Article; onClose: () => void }) {
  const { disableArticle } = useStockActions();
  const [pending, setPending] = useState(false);

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Désactiver « {article.designation} » ?</DialogTitle>
        <DialogDescription>
          L'article n'apparaîtra plus dans les listes, mais son historique de mouvements est
          conservé. Vous pourrez le réactiver via le filtre « Inactifs ».
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button
          variant="destructive"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            try {
              await disableArticle(article.id);
              toast.success("Article désactivé");
              onClose();
            } catch (error) {
              toast.error(getApiErrorMessage(error, "La désactivation a échoué."));
            } finally {
              setPending(false);
            }
          }}
        >
          Désactiver
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function CategoriesTab({ categories }: { categories: CategorieArticle[] }) {
  const { isLoading } = useCategories();
  const [editing, setEditing] = useState<CategorieArticle | "new" | null>(null);
  const [deleting, setDeleting] = useState<CategorieArticle | null>(null);
  const sorted = useMemo(
    () => [...categories].sort((a, b) => a.nom.localeCompare(b.nom, "fr")),
    [categories],
  );

  const actions = (item: CategorieArticle) => {
    const used = item._count?.articles ?? 0;
    return (
      <div className="flex shrink-0 justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Modifier"
          onClick={() => setEditing(item)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          aria-label="Supprimer"
          title={used ? `Utilisée par ${used} article(s)` : "Supprimer"}
          disabled={used > 0}
          onClick={() => setDeleting(item)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {categories.length} catégorie{categories.length > 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4 mr-1.5" /> Nouvelle catégorie
        </Button>
      </div>

      <ul className="space-y-2 md:hidden">
        {isLoading && <Skeleton className="h-16 w-full" />}
        {!isLoading && sorted.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Aucune catégorie</p>
        )}
        {sorted.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{item.nom}</div>
              <div className="truncate text-xs text-muted-foreground">
                {item._count?.articles ?? 0} article(s)
                {item.description && ` · ${item.description}`}
              </div>
            </div>
            {actions(item)}
          </li>
        ))}
      </ul>

      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Articles</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Aucune catégorie
                </TableCell>
              </TableRow>
            )}
            {sorted.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.nom}</TableCell>
                <TableCell className="max-w-96 truncate text-xs text-muted-foreground">
                  {item.description ?? "-"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {item._count?.articles ?? 0}
                </TableCell>
                <TableCell>{actions(item)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        {editing && (
          <CategorieFormDialog
            categorie={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
          />
        )}
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        {deleting && (
          <DeleteCategorieDialog categorie={deleting} onClose={() => setDeleting(null)} />
        )}
      </Dialog>
    </div>
  );
}

const categorieSchema = z.object({
  nom: z.string().trim().min(1, "Le nom est obligatoire").max(80),
  description: z.string().trim().max(255, "La description est trop longue"),
});

type CategorieFormValues = z.infer<typeof categorieSchema>;

function CategorieFormDialog({
  categorie,
  onClose,
}: {
  categorie: CategorieArticle | null;
  onClose: () => void;
}) {
  const { addCategorie, updateCategorie } = useStockActions();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CategorieFormValues>({
    resolver: zodResolver(categorieSchema),
    defaultValues: { nom: categorie?.nom ?? "", description: categorie?.description ?? "" },
  });

  const submit = async (values: CategorieFormValues) => {
    const payload = { nom: values.nom, description: values.description || undefined };
    try {
      if (categorie) {
        await updateCategorie(categorie.id, payload);
        toast.success("Catégorie mise à jour");
      } else {
        await addCategorie(payload);
        toast.success("Catégorie créée");
      }
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        // L'API normalise le nom (slug) et renvoie la catégorie existante dans `data`.
        const existing = (error.details as { data?: { nom?: string } } | undefined)?.data?.nom;
        setError("nom", {
          message: existing ? `La catégorie « ${existing} » existe déjà` : error.message,
        });
        return;
      }
      const message = getApiErrorMessage(error, "L'enregistrement de la catégorie a échoué.");
      setError("root.server", { message });
      toast.error(message);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{categorie ? "Modifier la catégorie" : "Nouvelle catégorie"}</DialogTitle>
        <DialogDescription>
          « Caméras IP », « cameras ip » et « CAMERAS-IP » sont considérées comme la même catégorie.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(submit)} className="space-y-3">
        <div>
          <Label>Nom</Label>
          <Controller
            name="nom"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="Caméras IP" aria-invalid={!!errors.nom} />
            )}
          />
          <FieldError message={errors.nom?.message} />
        </div>
        <div>
          <Label>Description (optionnel)</Label>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <Textarea
                {...field}
                rows={2}
                placeholder="Caméras réseau intérieures et extérieures"
                aria-invalid={!!errors.description}
              />
            )}
          />
          <FieldError message={errors.description?.message} />
        </div>
        <FieldError message={errors.root?.server?.message} />
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Enregistrement..." : categorie ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function DeleteCategorieDialog({
  categorie,
  onClose,
}: {
  categorie: CategorieArticle;
  onClose: () => void;
}) {
  const { deleteCategorie } = useStockActions();
  const [pending, setPending] = useState(false);

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Supprimer « {categorie.nom} » ?</DialogTitle>
        <DialogDescription>
          Cette action est définitive. Une catégorie encore utilisée par des articles ne peut pas
          être supprimée.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button
          variant="destructive"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            try {
              await deleteCategorie(categorie.id);
              toast.success("Catégorie supprimée");
              onClose();
            } catch (error) {
              toast.error(getApiErrorMessage(error, "La suppression a échoué."));
            } finally {
              setPending(false);
            }
          }}
        >
          Supprimer
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
