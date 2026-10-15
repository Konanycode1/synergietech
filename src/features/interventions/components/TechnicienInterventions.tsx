import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  PlayCircle,
  Plus,
  RefreshCw,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { StatutIntervention } from "@/features/interface/enum";
import {
  useInterventionActions,
  useInterventions,
} from "@/features/interventions/api/use-interventions";
import { NouvelleInterventionTechnicien } from "@/features/interventions/components/NouvelleInterventionTechnicien";
import { STATUT_LABEL, TYPE_LABEL } from "@/features/interventions/labels";
import useAuth from "@/hooks/authUser";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { Intervention, InterventionStatut } from "@/types";

const STATUT_STYLE: Record<InterventionStatut, string> = {
  PLANIFIEE: "bg-chart-1/15 text-chart-1 border-chart-1/30",
  EN_COURS: "bg-warning/15 text-warning border-warning/30",
  TERMINEE: "bg-success/15 text-success border-success/30",
  ANNULEE: "bg-muted text-muted-foreground",
};

type Filtre = "a_faire" | "terminees";

const startOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

function dayLabel(iso: string) {
  const diff = Math.round(
    (startOfDay(new Date(iso)).getTime() - startOfDay(new Date()).getTime()) / 86_400_000,
  );
  if (diff < 0) return "En retard";
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Demain";
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

const formatHeure = (iso: string) =>
  new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

const isOpen = (i: Intervention) => i.statut === "PLANIFIEE" || i.statut === "EN_COURS";

/** Vue terrain du technicien : pensée pour le téléphone, utilisable aussi sur desktop. */
export function TechnicienInterventions() {
  const { interventions, isLoading, mutate } = useInterventions();
  const userId = useAuth((state) => state.userId || state.user?.id);
  const userName = useAuth((state) => state.user?.name || state.userName);
  const [filtre, setFiltre] = useState<Filtre>("a_faire");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);

  const mine = useMemo(
    () => (userId ? interventions.filter((i) => i.technicienId === userId) : interventions),
    [interventions, userId],
  );

  const aFaire = useMemo(
    () => mine.filter(isOpen).sort((a, b) => +new Date(a.dateHeure) - +new Date(b.dateHeure)),
    [mine],
  );
  const terminees = useMemo(
    () =>
      mine
        .filter((i) => !isOpen(i))
        .sort((a, b) => +new Date(b.dateHeure) - +new Date(a.dateHeure)),
    [mine],
  );
  const aujourdhui = aFaire.filter((i) => dayLabel(i.dateHeure) === "Aujourd'hui").length;
  const enCours = aFaire.find((i) => i.statut === "EN_COURS");

  const groupes = useMemo(() => {
    const list = filtre === "a_faire" ? aFaire : terminees;
    const map = new Map<string, Intervention[]>();
    list.forEach((i) => {
      const key = filtre === "a_faire" ? dayLabel(i.dateHeure) : "Historique";
      map.set(key, [...(map.get(key) ?? []), i]);
    });
    return [...map.entries()];
  }, [aFaire, filtre, terminees]);

  const detail = mine.find((i) => i.id === detailId) ?? null;

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Bonjour{userName ? `, ${userName.split(" ")[0]}` : ""} 👋
          </p>
          <h1 className="text-xl font-semibold tracking-tight">
            {aujourdhui
              ? `${aujourdhui} intervention${aujourdhui > 1 ? "s" : ""} aujourd'hui`
              : "Aucune intervention aujourd'hui"}
          </h1>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button className="hidden sm:inline-flex" onClick={() => setCreating(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Nouvelle intervention
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Actualiser"
            disabled={refreshing}
            onClick={async () => {
              setRefreshing(true);
              await mutate();
              setRefreshing(false);
            }}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {enCours && (
        <button
          onClick={() => setDetailId(enCours.id)}
          className="mb-4 flex w-full items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 p-3 text-left"
        >
          <Wrench className="h-5 w-5 shrink-0 text-warning" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-warning">En cours</div>
            <div className="truncate font-semibold">{enCours.clientNom}</div>
          </div>
          <span className="text-xs font-medium text-warning">Reprendre →</span>
        </button>
      )}

      <div className="mb-4 grid grid-cols-2 rounded-lg bg-muted p-1 text-sm">
        {(
          [
            ["a_faire", `À faire (${aFaire.length})`],
            ["terminees", `Terminées (${terminees.length})`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFiltre(value)}
            className={cn(
              "rounded-md py-2 font-medium transition-colors",
              filtre === value ? "bg-background shadow-sm" : "text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && groupes.length === 0 && (
        <div className="py-16 text-center text-sm text-muted-foreground">
          <ClipboardCheck className="mx-auto mb-2 h-10 w-10 opacity-40" />
          {filtre === "a_faire" ? "Rien à faire pour le moment" : "Aucune intervention terminée"}
          {filtre === "a_faire" && (
            <div className="mt-4">
              <Button variant="outline" onClick={() => setCreating(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> Créer depuis un contrat
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-5">
        {groupes.map(([label, items]) => (
          <section key={label}>
            <h2
              className={cn(
                "mb-2 text-xs font-semibold uppercase tracking-wide",
                label === "En retard" ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {label}
            </h2>
            <div className="space-y-2">
              {items.map((i) => (
                <InterventionCard
                  key={i.id}
                  intervention={i}
                  showDate={filtre === "terminees" || label === "En retard"}
                  onOpen={() => setDetailId(i.id)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <Sheet open={!!detail} onOpenChange={(open) => !open && setDetailId(null)}>
        <SheetContent
          side="bottom"
          className="max-h-[92dvh] overflow-y-auto rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:mx-auto sm:max-w-2xl sm:p-6"
        >
          {detail && (
            <InterventionTerrain intervention={detail} onClose={() => setDetailId(null)} />
          )}
        </SheetContent>
      </Sheet>

      {/* Bouton flottant mobile, au-dessus de la barre d'onglets */}
      <Button
        size="icon"
        aria-label="Nouvelle intervention"
        onClick={() => setCreating(true)}
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-30 h-14 w-14 rounded-full shadow-lg sm:hidden"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <Sheet open={creating} onOpenChange={setCreating}>
        <SheetContent
          side="bottom"
          className="max-h-[92dvh] overflow-y-auto rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:mx-auto sm:max-w-2xl sm:p-6"
        >
          {creating && <NouvelleInterventionTechnicien onClose={() => setCreating(false)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function InterventionCard({
  intervention: i,
  showDate,
  onOpen,
}: {
  intervention: Intervention;
  showDate: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className={cn(
        "flex w-full gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors active:bg-muted",
        i.statut === "EN_COURS" && "border-warning/50",
      )}
    >
      <div className="w-14 shrink-0 text-center">
        <div className="text-base font-semibold tabular-nums">{formatHeure(i.dateHeure)}</div>
        {showDate && (
          <div className="text-[11px] text-muted-foreground">
            {new Date(i.dateHeure).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 border-l border-border pl-3">
        <div className="flex items-start justify-between gap-2">
          <div className="truncate font-medium">{i.clientNom || "Client"}</div>
          <Badge variant="outline" className={cn("shrink-0 text-[10px]", STATUT_STYLE[i.statut])}>
            {STATUT_LABEL[i.statut]}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">{TYPE_LABEL[i.type]}</div>
        {i.description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{i.description}</p>
        )}
      </div>
    </button>
  );
}

function InterventionTerrain({
  intervention: i,
  onClose,
}: {
  intervention: Intervention;
  onClose: () => void;
}) {
  const { updateIntervention, endIntervention } = useInterventionActions();
  const [rapport, setRapport] = useState(i.rapport ?? "");
  const [materielRemplace, setMaterielRemplace] = useState(i.materielRemplace ?? false);
  const [pending, setPending] = useState<"start" | "save" | "end" | null>(null);

  const editable = isOpen(i);

  useEffect(() => {
    setRapport(i.rapport ?? "");
    setMaterielRemplace(i.materielRemplace ?? false);
  }, [i.id, i.rapport, i.materielRemplace]);

  const run = async (
    kind: "start" | "save" | "end",
    action: () => Promise<unknown>,
    ok: string,
  ) => {
    setPending(kind);
    try {
      await action();
      toast.success(ok);
      return true;
    } catch (error) {
      toast.error(getApiErrorMessage(error, "L'opération a échoué."));
      return false;
    } finally {
      setPending(null);
    }
  };

  const cloturer = async () => {
    if (!rapport.trim()) {
      toast.error("Rédigez le rapport avant de clôturer l'intervention.");
      return;
    }
    const done = await run(
      "end",
      () => endIntervention(i.id, { rapport: rapport.trim(), materielRemplace }),
      "Intervention clôturée",
    );
    if (done) onClose();
  };

  return (
    <div className="space-y-5">
      <SheetHeader className="text-left">
        <div className="flex flex-wrap items-center gap-2 pr-8">
          <SheetTitle>{i.clientNom || "Client"}</SheetTitle>
          <Badge variant="outline" className={STATUT_STYLE[i.statut]}>
            {STATUT_LABEL[i.statut]}
          </Badge>
        </div>
        <SheetDescription className="flex items-center gap-1.5">
          <CalendarClock className="h-4 w-4" />
          {TYPE_LABEL[i.type]} ·{" "}
          {new Date(i.dateHeure).toLocaleString("fr-FR", {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </SheetDescription>
      </SheetHeader>

      {i.description && (
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <div className="mb-1 text-xs font-medium text-muted-foreground">Travail à réaliser</div>
          {i.description}
        </div>
      )}

      {i.statut === "PLANIFIEE" && (
        <Button
          size="lg"
          className="h-12 w-full text-base"
          disabled={!!pending}
          onClick={() =>
            void run(
              "start",
              () => updateIntervention(i.id, { statut: StatutIntervention.EN_COURS }),
              "Intervention démarrée",
            )
          }
        >
          <PlayCircle className="mr-2 h-5 w-5" />
          {pending === "start" ? "Démarrage..." : "Démarrer l'intervention"}
        </Button>
      )}

      <section className="space-y-2">
        <Label className="text-sm font-semibold">Rapport d'intervention</Label>
        {editable ? (
          <>
            <Textarea
              rows={5}
              value={rapport}
              onChange={(event) => setRapport(event.target.value)}
              placeholder="Travail effectué, tests réalisés, observations..."
              className="text-base sm:text-sm"
            />
            <label className="flex items-center gap-2 py-1 text-sm">
              <Checkbox
                checked={materielRemplace}
                onCheckedChange={(value) => setMaterielRemplace(value === true)}
              />
              Matériel remplacé
            </label>
          </>
        ) : (
          <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm">
            {i.rapport || "Aucun rapport."}
          </p>
        )}
      </section>

      {editable && (
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            variant="outline"
            size="lg"
            className="h-12"
            disabled={!!pending}
            onClick={() =>
              void run(
                "save",
                () => updateIntervention(i.id, { rapport: rapport.trim(), materielRemplace }),
                "Rapport enregistré",
              )
            }
          >
            {pending === "save" ? "Enregistrement..." : "Enregistrer le brouillon"}
          </Button>
          <Button
            size="lg"
            className="h-12 bg-success text-white hover:bg-success/90"
            disabled={!!pending}
            onClick={() => void cloturer()}
          >
            <CheckCircle2 className="mr-2 h-5 w-5" />
            {pending === "end" ? "Clôture..." : "Clôturer"}
          </Button>
        </div>
      )}
    </div>
  );
}
