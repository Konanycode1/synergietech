import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Check, FileText, Search } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { FieldError } from "@/components/PhoneField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useClients } from "@/features/clients/api/use-client";
import { useContrats } from "@/features/contrats/api/use-contrats";
import type { Contrat } from "@/features/interface/contrats.type";
import {
  StatutContrat,
  StatutIntervention,
  TypeContrat,
  TypeIntervention,
} from "@/features/interface/enum";
import { useInterventionActions } from "@/features/interventions/api/use-interventions";
import useAuth from "@/hooks/authUser";
import { getApiErrorMessage } from "@/lib/api/client";
import { TYPE_LABEL } from "@/features/interventions/labels";
import { cn } from "@/lib/utils";

const TYPES = [
  TypeIntervention.INSTALLATION,
  TypeIntervention.MAINTENANCE_PREVENTIVE,
  TypeIntervention.DEPANNAGE,
  TypeIntervention.CONTROLE_PERIODIQUE,
];

// Seuls les contrats en vigueur donnent lieu à une intervention.
const CONTRATS_OUVERTS = [StatutContrat.ACTIF, StatutContrat.RENOUVELLEMENT];

const typeParDefaut = (contrat: Contrat) =>
  contrat.type === TypeContrat.INSTALLATION_PONCTUELLE
    ? TypeIntervention.INSTALLATION
    : TypeIntervention.MAINTENANCE_PREVENTIVE;

const schema = z.object({
  contratId: z.string().min(1, "Choisissez un contrat"),
  type: z.nativeEnum(TypeIntervention),
  dateHeurePrevue: z
    .string()
    .min(1, "La date et l'heure sont obligatoires")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "Date invalide"),
  description: z.string().trim().max(1000, "La description est trop longue"),
});

type FormValues = z.infer<typeof schema>;

/** Date locale arrondie à l'heure suivante, au format attendu par <input type="datetime-local">. */
function prochaineHeure() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}

export function NouvelleInterventionTechnicien({ onClose }: { onClose: () => void }) {
  const { addIntervention } = useInterventionActions();
  const { contrats, isLoading } = useContrats();
  const { clients } = useClients();
  const userId = useAuth((state) => state.userId || state.user?.id);
  const [search, setSearch] = useState("");

  const clientsById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const nomClient = (contrat: Contrat) => {
    const client = contrat.client ?? clientsById.get(contrat.clientId);
    return client?.companyName || client?.name || "Client non renseigné";
  };

  const ouverts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("fr-FR");
    return contrats
      .filter((contrat) => CONTRATS_OUVERTS.includes(contrat.statut))
      .filter((contrat) => !term || nomClient(contrat).toLocaleLowerCase("fr-FR").includes(term))
      .sort((a, b) => nomClient(a).localeCompare(nomClient(b), "fr"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contrats, clientsById, search]);

  const {
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      contratId: "",
      type: TypeIntervention.MAINTENANCE_PREVENTIVE,
      dateHeurePrevue: prochaineHeure(),
      description: "",
    },
  });

  const contratId = useWatch({ control, name: "contratId" });
  const contrat = contrats.find((item) => item.id === contratId);

  const choisir = (item: Contrat) => {
    setValue("contratId", item.id, { shouldValidate: true });
    setValue("type", typeParDefaut(item));
  };

  const submit = async (values: FormValues) => {
    if (!contrat) return;
    try {
      await addIntervention({
        contratId: contrat.id,
        clientId: contrat.clientId,
        technicienId: userId || undefined,
        type: values.type,
        dateHeurePrevue: new Date(values.dateHeurePrevue).toISOString(),
        description: values.description || undefined,
        statut: StatutIntervention.PLANIFIEE,
      });
      toast.success("Intervention planifiée");
      onClose();
    } catch (error) {
      const message = getApiErrorMessage(error, "La création de l'intervention a échoué.");
      setError("root.server", { message });
      toast.error(message);
    }
  };

  // Étape 1 : choix du contrat
  if (!contrat) {
    return (
      <div className="space-y-4">
        <SheetHeader className="text-left">
          <SheetTitle>Nouvelle intervention</SheetTitle>
          <SheetDescription>Choisissez le contrat concerné</SheetDescription>
        </SheetHeader>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un client..."
            className="pl-8 text-base sm:text-sm"
          />
        </div>
        <div className="space-y-2">
          {isLoading &&
            Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          {!isLoading && ouverts.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucun contrat actif{search && " pour cette recherche"}
            </p>
          )}
          {ouverts.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => choisir(item)}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left active:bg-muted"
            >
              <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{nomClient(item)}</div>
                <div className="text-xs text-muted-foreground">{item.type}</div>
              </div>
              {item.statut === StatutContrat.RENOUVELLEMENT && (
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  Renouvellement
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Étape 2 : détails de l'intervention
  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <SheetHeader className="text-left">
        <SheetTitle>Nouvelle intervention</SheetTitle>
        <SheetDescription asChild>
          <button
            type="button"
            onClick={() => setValue("contratId", "")}
            className="flex items-center gap-1.5 text-left"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {nomClient(contrat)} · {contrat.type}
            </span>
          </button>
        </SheetDescription>
      </SheetHeader>

      <div>
        <Label>Type d'intervention</Label>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {TYPES.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => field.onChange(value)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-sm transition-colors",
                    field.value === value
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {field.value === value && <Check className="h-4 w-4" />}
                  {TYPE_LABEL[value]}
                </button>
              ))}
            </div>
          )}
        />
      </div>

      <div>
        <Label>Date et heure prévues</Label>
        <Controller
          name="dateHeurePrevue"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              type="datetime-local"
              className="text-base sm:text-sm"
              aria-invalid={!!errors.dateHeurePrevue}
            />
          )}
        />
        <FieldError message={errors.dateHeurePrevue?.message} />
      </div>

      <div>
        <Label>Travail à réaliser</Label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <Textarea
              {...field}
              rows={3}
              placeholder="Panne signalée, équipements concernés..."
              className="text-base sm:text-sm"
              aria-invalid={!!errors.description}
            />
          )}
        />
        <FieldError message={errors.description?.message} />
      </div>

      <FieldError message={errors.root?.server?.message} />

      <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={isSubmitting}>
        {isSubmitting ? "Planification..." : "Planifier l'intervention"}
      </Button>
    </form>
  );
}
