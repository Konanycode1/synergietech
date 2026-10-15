import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, CalendarDays, List } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { type Intervention } from "@/types";
import { useContrats } from "@/features/contrats/api/use-contrats";
import { useClients } from "@/features/clients/api/use-client";
import { useUsers } from "@/features/equipe/api/use-equipe";
import { RoleSTS, StatutIntervention, TypeIntervention } from "@/features/interface/enum";
import {
  useIntervention,
  useInterventionActions,
  useInterventions,
} from "@/features/interventions/api/use-interventions";
import { FieldError } from "@/components/PhoneField";
import { getAppSection } from "@/config/navigation";
import { TechnicienInterventions } from "@/features/interventions/components/TechnicienInterventions";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatDate, formatDateTime } from "@/lib/formatters";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

const TYPES: TypeIntervention[] = [
  TypeIntervention.CONTROLE_PERIODIQUE,
  TypeIntervention.INSTALLATION,
  TypeIntervention.MAINTENANCE_PREVENTIVE,
  TypeIntervention.DEPANNAGE,
];
const STATUTS: StatutIntervention[] = [
  StatutIntervention.PLANIFIEE,
  StatutIntervention.EN_COURS,
  StatutIntervention.TERMINEE,
  StatutIntervention.ANNULEE,
];

const interventionFormSchema = z.object({
  type: z.custom<TypeIntervention>(
    (value) => TYPES.includes(value as TypeIntervention),
    "Type d'intervention invalide",
  ),
  dateHeurePrevue: z
    .string()
    .min(1, "La date et l'heure sont obligatoires")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "Date invalide"),

  description: z.string().trim().max(1000, "La description est trop longue"),

  clientNom: z.string().min(1, "Le nom du client est obligatoire").max(120),

  clientId: z.string().optional(),

  contratId: z.string().optional(),

  technicienId: z.string().min(1, "Veuillez sélectionner un technicien"),

  // statut: z.custom<StatutIntervention>(
  //   (value) => STATUTS.includes(value as StatutIntervention),
  //   "Statut d'intervention invalide",
  // ),
});

// const interventionFormSchema = z.object({
//   clientNom: z.string().trim().min(1, "Le nom du client est obligatoire").max(120),
//   contratId: z.string().optional(),
//   type: z.custom<InterventionType>(
//     (value) => TYPES.includes(value as InterventionType),
//     "Type d'intervention invalide",
//   ),
//   technicien: z.string().min(1, "Veuillez sélectionner un technicien"),
//   dateHeure: z
//     .string()
//     .min(1, "La date et l'heure sont obligatoires")
//     .refine((value) => !Number.isNaN(new Date(value).getTime()), "Date invalide"),
//   description: z.string().trim().max(1000, "La description est trop longue"),
// });
type InterventionFormValues = z.infer<typeof interventionFormSchema>;

const STATUT_STYLE: Record<StatutIntervention, string> = {
  PLANIFIEE: "bg-chart-1/15 text-chart-1 border-chart-1/30",
  EN_COURS: "bg-warning/15 text-warning border-warning/30",
  TERMINEE: "bg-success/15 text-success border-success/30",
  ANNULEE: "bg-muted text-muted-foreground",
};

export function InterventionsPage() {
  const { pathname } = useLocation();
  if (getAppSection(pathname) === "technicien") return <TechnicienInterventions />;
  return <InterventionsBoard />;
}

function InterventionsBoard() {
  const { interventions } = useInterventions();
  const [openNew, setOpenNew] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...interventions].sort((a, b) => +new Date(a.dateHeure) - +new Date(b.dateHeure)),
    [interventions],
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Interventions"
        subtitle="Planning et suivi des installations, maintenances et dépannages"
        actions={
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1.5" /> Nouvelle intervention
              </Button>
            </DialogTrigger>
            <NewInterventionDialog onClose={() => setOpenNew(false)} />
          </Dialog>
        }
      />

      <Tabs defaultValue="liste">
        <TabsList>
          <TabsTrigger value="liste">
            <List className="h-4 w-4 mr-1.5" /> Liste
          </TabsTrigger>
          <TabsTrigger value="cal">
            <CalendarDays className="h-4 w-4 mr-1.5" /> Semaine
          </TabsTrigger>
        </TabsList>

        <TabsContent value="liste">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & heure</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Technicien</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((i) => (
                  <TableRow key={i.id} onClick={() => setDetailId(i.id)} className="cursor-pointer">
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatDateTime(i.dateHeure)}
                    </TableCell>
                    <TableCell className="font-medium">{i.clientNom}</TableCell>
                    <TableCell className="text-xs">{i.type}</TableCell>
                    <TableCell className="text-xs">{i.technicien}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUT_STYLE[i.statut]}>
                        {i.statut}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="cal">
          <WeekCalendar onOpen={setDetailId} />
        </TabsContent>
      </Tabs>

      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        {detailId && <InterventionDetail id={detailId} onClose={() => setDetailId(null)} />}
      </Dialog>
    </div>
  );
}

function WeekCalendar({ onOpen }: { onOpen: (id: string) => void }) {
  const { interventions } = useInterventions();
  const [offset, setOffset] = useState(0);

  const start = useMemo(() => {
    const d = new Date();
    const day = (d.getDay() + 6) % 7; // Monday=0
    d.setDate(d.getDate() - day + offset * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [offset]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="text-sm text-muted-foreground">
          Semaine du {formatDate(days[0].toISOString())} au {formatDate(days[6].toISOString())}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setOffset(offset - 1)}>
            ← Précédente
          </Button>
          <Button variant="outline" size="sm" onClick={() => setOffset(0)}>
            Cette semaine
          </Button>
          <Button variant="outline" size="sm" onClick={() => setOffset(offset + 1)}>
            Suivante →
          </Button>
        </div>
      </div>
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="grid min-w-[840px] grid-cols-7 gap-2">
          {days.map((d) => {
            const items = interventions.filter((i) => {
              const di = new Date(i.dateHeure);
              return di.toDateString() === d.toDateString();
            });
            return (
              <Card key={d.toISOString()} className="min-h-[220px]">
                <CardContent className="p-2.5">
                  <div className="text-[11px] uppercase text-muted-foreground">
                    {d.toLocaleDateString("fr-FR", { weekday: "short" })}
                  </div>
                  <div className="text-lg font-semibold mb-2">{d.getDate()}</div>
                  <div className="space-y-1.5">
                    {items.map((i) => (
                      <button
                        key={i.id}
                        onClick={() => onOpen(i.id)}
                        className="w-full text-left bg-muted/60 hover:bg-muted rounded px-2 py-1.5 text-[11px]"
                      >
                        <div className="font-medium truncate">{i.clientNom}</div>
                        <div className="text-muted-foreground">
                          {new Date(i.dateHeure).toLocaleTimeString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          · {i.type}
                        </div>
                        <Badge
                          variant="outline"
                          className={`${STATUT_STYLE[i.statut]} mt-1 text-[9px]`}
                        >
                          {i.statut}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function InterventionDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { intervention: i } = useIntervention(id);
  const { updateIntervention: update } = useInterventionActions();
  const { users } = useUsers();
  const [rapport, setRapport] = useState("");
  const [materielRemplace, setMaterielRemplace] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const techniciens = useMemo(
    () =>
      users
        .filter((user) => user.role === RoleSTS.TECHNICIEN && user.isActive)
        .map((user) => user.name)
        .filter((name): name is string => name !== null),
    [users],
  );

  useEffect(() => {
    setRapport(i?.rapport ?? "");
    setMaterielRemplace(i?.materielRemplace ?? false);
  }, [id, i?.materielRemplace, i?.rapport]);

  if (!i) return null;

  const updateStatus = async (statut: StatutIntervention) => {
    const normalizedReport = rapport.trim();

    if (statut === StatutIntervention.TERMINEE && !normalizedReport) {
      toast.error("Renseignez le rapport avant de clôturer l'intervention.");
      return false;
    }

    setIsSaving(true);
    try {
      await update(id, {
        statut,
        ...(statut === StatutIntervention.TERMINEE
          ? { rapport: normalizedReport, materielRemplace }
          : {}),
      });
      toast.success("Statut mis à jour");
      return true;
    } catch (error) {
      toast.error(getApiErrorMessage(error, "La mise à jour du statut a échoué."));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const saveReport = async () => {
    setIsSaving(true);
    try {
      await update(id, { rapport: rapport.trim(), materielRemplace });
      toast.success("Modifications enregistrées");
      return true;
    } catch (error) {
      toast.error(getApiErrorMessage(error, "L'enregistrement du rapport a échoué."));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {i.clientNom}
          <Badge variant="outline" className={STATUT_STYLE[i.statut]}>
            {i.statut}
          </Badge>
        </DialogTitle>
        <DialogDescription>
          {i.type} — {formatDateTime(i.dateHeure)}
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Statut</Label>
          <Select
            value={i.statut}
            onValueChange={(statut: StatutIntervention) => void updateStatus(statut)}
            disabled={isSaving}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Technicien</Label>
          <Select value={i.technicien} onValueChange={(v) => update(id, { technicienId: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {techniciens.map((t: string) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label>Date & heure</Label>
          <Input
            type="datetime-local"
            value={i.dateHeure.slice(0, 16)}
            onChange={(e) =>
              update(id, { dateHeurePrevue: new Date(e.target.value).toISOString() })
            }
          />
        </div>
        <div className="col-span-2">
          <Label>Description du travail</Label>
          <Textarea
            rows={2}
            value={i.description}
            onChange={(e) => update(id, { description: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-2 space-y-2 border-t border-border pt-3">
        <Label className="text-sm">Rapport de fin d'intervention</Label>
        <Textarea
          rows={4}
          placeholder="Résumé du travail effectué, tests réalisés, observations..."
          value={rapport}
          onChange={(event) => setRapport(event.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={materielRemplace}
            onCheckedChange={(value) => setMaterielRemplace(value === true)}
          />
          Matériel remplacé
        </label>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Fermer
        </Button>
        <Button
          variant="secondary"
          disabled={isSaving}
          onClick={async () => {
            if (await saveReport()) {
              onClose();
            }
          }}
        >
          {isSaving ? "Enregistrement..." : "Enregistrer"}
        </Button>
        {i.statut !== "TERMINEE" && (
          <Button
            disabled={isSaving}
            onClick={async () => {
              if (await updateStatus(StatutIntervention.TERMINEE)) {
                onClose();
              }
            }}
          >
            Marquer terminée
          </Button>
        )}
      </DialogFooter>
    </DialogContent>
  );
}

function NewInterventionDialog({ onClose }: { onClose: () => void }) {
  const { addIntervention: add } = useInterventionActions();
  const { contrats } = useContrats();
  const { clients } = useClients();
  const { users } = useUsers();
  const clientsById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients],
  );
  const getContractClientName = (contrat: (typeof contrats)[number]) => {
    const client = contrat.client ?? clientsById.get(contrat.clientId);
    return client?.companyName || client?.name || "Client non renseigné";
  };
  const techniciens = useMemo(
    () => users.filter((user) => user.role === RoleSTS.TECHNICIEN && user.isActive),
    [users],
  );
  const {
    clearErrors,
    control,
    getValues,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InterventionFormValues>({
    resolver: zodResolver(interventionFormSchema),
    defaultValues: {
      contratId: undefined,
      clientId: "",
      type: TypeIntervention.INSTALLATION,
      technicienId: techniciens[0]?.id ?? "",
      dateHeurePrevue: new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16),
      description: "",
    },
  });

  useEffect(() => {
    const firstTechnicienId = techniciens[0]?.id;

    if (firstTechnicienId && !getValues("technicienId")) {
      setValue("technicienId", firstTechnicienId, { shouldValidate: true });
    }
  }, [getValues, setValue, techniciens]);

  const submit = async (values: InterventionFormValues) => {
    console.log("submit appelé");
    console.log(values);

    clearErrors("root.server");
    try {
      await add({
        type: values.type,
        dateHeurePrevue: new Date(values.dateHeurePrevue).toISOString(),
        description: values.description,
        clientId: values.clientId!,
        contratId: values.contratId || undefined,
        technicienId: values.technicienId,
        statut: StatutIntervention.PLANIFIEE,
      });
      toast.success("Intervention planifiée");
      onClose();
    } catch (error) {
      console.error(error);

      const message = getApiErrorMessage(error, "La création de l'intervention a échoué.");

      setError("root.server", {
        type: "server",
        message,
      });

      toast.error(message);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Nouvelle intervention</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={handleSubmit(submit, (errors) => {
          console.log("Erreurs RHF :", errors);
        })}
        className="grid grid-cols-2 gap-3"
      >
        <div className="col-span-2">
          <Label>Client / contrat existant</Label>
          <Controller
            name="contratId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value || "none"}
                onValueChange={(value) => {
                  if (value === "none") {
                    field.onChange(undefined);
                    return;
                  }

                  field.onChange(value);
                  const contrat = contrats.find((item) => item.id === value);
                  setValue("clientId", contrat?.clientId ?? "", {
                    shouldDirty: true,
                    shouldValidate: true,
                  });

                  setValue("clientNom", contrat ? getContractClientName(contrat) : "", {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Client hors contrat —</SelectItem>
                  {contrats.map((contrat) => (
                    <SelectItem key={contrat.id} value={contrat.id}>
                      {getContractClientName(contrat)} — {contrat.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="col-span-2">
          <Label>Nom client</Label>
          <Controller
            name="clientNom"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="Nom du client" aria-invalid={!!errors.clientNom} />
            )}
          />
          <FieldError message={errors.clientNom?.message} />
        </div>
        <div>
          <Label>Type</Label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-invalid={!!errors.type}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.type?.message} />
        </div>
        <div>
          <Label>Technicien</Label>
          <Controller
            name="technicienId"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {techniciens.map((technicien) => (
                    <SelectItem key={technicien.id} value={technicien.id}>
                      {technicien.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.technicienId?.message} />
        </div>
        <div className="col-span-2">
          <Label>Date & heure</Label>
          <Controller
            name="dateHeurePrevue"
            control={control}
            render={({ field }) => (
              <Input {...field} type="datetime-local" aria-invalid={!!errors.dateHeurePrevue} />
            )}
          />
          <FieldError message={errors.dateHeurePrevue?.message} />
        </div>
        <div className="col-span-2">
          <Label>Description</Label>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <Textarea {...field} rows={2} aria-invalid={!!errors.description} />
            )}
          />
          <FieldError message={errors.description?.message} />
        </div>
        <div className="col-span-2">
          <FieldError message={errors.root?.server?.message} />
        </div>
        <DialogFooter className="col-span-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Planification..." : "Créer"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
