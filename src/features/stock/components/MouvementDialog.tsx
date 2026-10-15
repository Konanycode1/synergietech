import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { FieldError } from "@/components/PhoneField";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type Article, TypeMouvementStock } from "@/features/interface/stock.type";
import { useStockActions } from "@/features/stock/api/use-stock";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

export const MOUVEMENT_LABEL: Record<TypeMouvementStock, string> = {
  [TypeMouvementStock.ENTREE]: "Entrée",
  [TypeMouvementStock.SORTIE]: "Sortie",
  [TypeMouvementStock.AJUSTEMENT]: "Ajustement",
};

export const MOUVEMENT_STYLE: Record<TypeMouvementStock, string> = {
  [TypeMouvementStock.ENTREE]: "bg-success/15 text-success border-success/30",
  [TypeMouvementStock.SORTIE]: "bg-warning/15 text-warning border-warning/30",
  [TypeMouvementStock.AJUSTEMENT]: "bg-chart-1/15 text-chart-1 border-chart-1/30",
};

const MOUVEMENT_ICON = {
  [TypeMouvementStock.ENTREE]: ArrowDownToLine,
  [TypeMouvementStock.SORTIE]: ArrowUpFromLine,
  [TypeMouvementStock.AJUSTEMENT]: SlidersHorizontal,
};

const TYPES = [TypeMouvementStock.ENTREE, TypeMouvementStock.SORTIE, TypeMouvementStock.AJUSTEMENT];

const mouvementSchema = z
  .object({
    articleId: z.string().min(1, "Sélectionnez un article"),
    type: z.nativeEnum(TypeMouvementStock),
    quantite: z.string().trim().regex(/^\d+$/, "Quantité invalide"),
    motif: z.string().trim().max(255, "Le motif est trop long"),
  })
  .superRefine((values, ctx) => {
    const quantite = Number(values.quantite);
    if (values.type !== TypeMouvementStock.AJUSTEMENT && quantite <= 0) {
      ctx.addIssue({ code: "custom", path: ["quantite"], message: "La quantité doit être > 0" });
    }
    if (values.type === TypeMouvementStock.AJUSTEMENT && !values.motif) {
      ctx.addIssue({ code: "custom", path: ["motif"], message: "Le motif est obligatoire" });
    }
  });

type MouvementFormValues = z.infer<typeof mouvementSchema>;

export function MouvementDialog({
  articles,
  defaultArticleId,
  defaultType = TypeMouvementStock.ENTREE,
  allowedTypes = TYPES,
  interventionId,
  defaultMotif = "",
  title = "Mouvement de stock",
  description = "Entrée, sortie ou ajustement d'inventaire",
  onClose,
}: {
  articles: Article[];
  defaultArticleId?: string;
  defaultType?: TypeMouvementStock;
  allowedTypes?: TypeMouvementStock[];
  interventionId?: string;
  defaultMotif?: string;
  title?: string;
  description?: string;
  onClose: () => void;
}) {
  const { addMouvement } = useStockActions();
  const activeArticles = useMemo(
    () =>
      articles
        .filter((article) => article.isActive)
        .sort((a, b) => a.designation.localeCompare(b.designation, "fr")),
    [articles],
  );

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MouvementFormValues>({
    resolver: zodResolver(mouvementSchema),
    defaultValues: {
      articleId: defaultArticleId ?? "",
      type: defaultType,
      quantite: defaultType === TypeMouvementStock.AJUSTEMENT ? "" : "1",
      motif: defaultMotif,
    },
  });

  const [articleId, type, quantiteRaw] = useWatch({
    control,
    name: ["articleId", "type", "quantite"],
  });
  const article = activeArticles.find((item) => item.id === articleId);
  const quantite = Number(quantiteRaw) || 0;
  const apres = article
    ? type === TypeMouvementStock.ENTREE
      ? article.quantite + quantite
      : type === TypeMouvementStock.SORTIE
        ? article.quantite - quantite
        : quantite
    : null;

  const submit = async (values: MouvementFormValues) => {
    const qty = Number(values.quantite);
    if (values.type === TypeMouvementStock.SORTIE && article && qty > article.quantite) {
      setError("quantite", { message: `Stock insuffisant (${article.quantite} disponible)` });
      return;
    }
    try {
      const { alerte } = await addMouvement({
        articleId: values.articleId,
        type: values.type,
        quantite: qty,
        motif: values.motif || undefined,
        interventionId,
      });
      toast.success("Mouvement enregistré");
      if (alerte) toast.warning(`${article?.designation ?? "Article"} est sous le seuil d'alerte`);
      onClose();
    } catch (error) {
      const message = getApiErrorMessage(error, "L'enregistrement du mouvement a échoué.");
      setError("root.server", { message });
      toast.error(message);
    }
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        {allowedTypes.length > 1 && (
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-3 gap-2">
                {allowedTypes.map((value) => {
                  const Icon = MOUVEMENT_ICON[value];
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => field.onChange(value)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-md border px-2 py-2.5 text-xs font-medium transition-colors",
                        field.value === value
                          ? MOUVEMENT_STYLE[value]
                          : "border-border text-muted-foreground hover:bg-muted",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {MOUVEMENT_LABEL[value]}
                    </button>
                  );
                })}
              </div>
            )}
          />
        )}

        <div>
          <Label>Article</Label>
          <Controller
            name="articleId"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-invalid={!!errors.articleId}>
                  <SelectValue placeholder="Sélectionner un article" />
                </SelectTrigger>
                <SelectContent>
                  {activeArticles.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.designation} · {item.quantite} {item.unite}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.articleId?.message} />
        </div>

        <div>
          <Label>
            {type === TypeMouvementStock.AJUSTEMENT ? "Quantité constatée" : "Quantité"}
            {article && <span className="text-muted-foreground"> ({article.unite})</span>}
          </Label>
          <Controller
            name="quantite"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                inputMode="numeric"
                min={0}
                aria-invalid={!!errors.quantite}
              />
            )}
          />
          <FieldError message={errors.quantite?.message} />
          {article && apres !== null && (
            <p
              className={cn(
                "mt-1.5 text-xs",
                apres < 0
                  ? "text-destructive"
                  : apres <= article.seuilAlerte
                    ? "text-warning"
                    : "text-muted-foreground",
              )}
            >
              Stock : {article.quantite} → <span className="font-semibold">{apres}</span>{" "}
              {article.unite}
              {apres >= 0 && apres <= article.seuilAlerte && " · sous le seuil d'alerte"}
            </p>
          )}
        </div>

        <div>
          <Label>Motif{type !== TypeMouvementStock.AJUSTEMENT && " (optionnel)"}</Label>
          <Controller
            name="motif"
            control={control}
            render={({ field }) => (
              <Textarea
                {...field}
                rows={2}
                placeholder={
                  type === TypeMouvementStock.AJUSTEMENT
                    ? "Inventaire mensuel, casse, perte..."
                    : "Livraison fournisseur, installation client..."
                }
                aria-invalid={!!errors.motif}
              />
            )}
          />
          <FieldError message={errors.motif?.message} />
        </div>

        <FieldError message={errors.root?.server?.message} />

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Enregistrement..." : "Valider"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
