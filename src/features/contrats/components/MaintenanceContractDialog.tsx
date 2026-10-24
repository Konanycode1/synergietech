import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import {
  defaultMaintenanceContractTitle,
  exportMaintenanceContractPDF,
} from "@/features/contrats/maintenance-contract-pdf";
import { useClient } from "@/features/clients/api/use-client";
import type { Contrat } from "@/features/interface/contrats.type";
import { BESOINS, type BesoinType } from "@/types";
import { formatFCFA } from "@/lib/formatters";
import { FieldError } from "@/components/PhoneField";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

const BILLING_PERIOD_MONTHS = { MENSUELLE: 1, TRIMESTRIELLE: 3, ANNUELLE: 12 } as const;

const BILLING_PERIOD_UNIT = {
  MENSUELLE: "mois",
  TRIMESTRIELLE: "trimestre",
  ANNUELLE: "an",
} as const;

const maintenanceSchema = z.object({
  title: z.string().trim().min(1, "Le titre du contrat est obligatoire").max(200),
  service: z.custom<BesoinType>(
    (value) => BESOINS.includes(value as BesoinType),
    "Sélectionnez le système à entretenir",
  ),
  siteDescription: z.string().trim().min(1, "Le site concerné est obligatoire").max(250),
  frequency: z.string().trim().min(1, "La fréquence est obligatoire").max(120),
  billingPeriod: z.enum(["MENSUELLE", "TRIMESTRIELLE", "ANNUELLE"]),
  periodAmount: z
    .number({ invalid_type_error: "Montant invalide" })
    .positive("Le montant doit être supérieur à zéro"),
  durationMonths: z.number().int().min(1).max(120),
  startDate: z.string().min(1, "La date de début est obligatoire"),
  tacitRenewal: z.boolean(),
  outOfContractFee: z.number().min(0),
});

type MaintenanceFormValues = z.infer<typeof maintenanceSchema>;

export function MaintenanceContractDialog({
  source,
  onClose,
}: {
  source: Contrat;
  onClose: () => void;
}) {
  const { client: linkedClient, isLoading: isClientLoading } = useClient(source.clientId);
  const client = linkedClient ?? source.client;
  const clientName = client?.companyName || client?.name || "Client";

  const {
    control,
    clearErrors,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      title: defaultMaintenanceContractTitle("TRIMESTRIELLE", "vidéosurveillance"),
      service: "vidéosurveillance",
      siteDescription: client?.address || "",
      frequency: "Un passage mensuel",
      billingPeriod: "TRIMESTRIELLE",
      periodAmount: 50_000,
      durationMonths: 12,
      startDate: new Date().toISOString().slice(0, 10),
      tacitRenewal: true,
      outOfContractFee: 50_000,
    },
  });

  const [service, billingPeriod, periodAmount, durationMonths] = watch([
    "service",
    "billingPeriod",
    "periodAmount",
    "durationMonths",
  ]);
  const periodCount = Math.max(
    1,
    Math.round(durationMonths / BILLING_PERIOD_MONTHS[billingPeriod]),
  );
  const contractTotal = (periodAmount || 0) * periodCount;

  // Tant que l'utilisateur n'a pas modifié le titre, il suit le système et la périodicité.
  useEffect(() => {
    if (!dirtyFields.title) {
      setValue("title", defaultMaintenanceContractTitle(billingPeriod, service));
    }
  }, [billingPeriod, service, dirtyFields.title, setValue]);

  // Pré-remplit le site avec l'adresse du client sans écraser une saisie de l'utilisateur.
  useEffect(() => {
    if (linkedClient?.address && !dirtyFields.siteDescription) {
      setValue("siteDescription", linkedClient.address, { shouldValidate: true });
    }
  }, [linkedClient, dirtyFields.siteDescription, setValue]);

  const submit = (values: MaintenanceFormValues) => {
    clearErrors("root.server");

    if (!source.clientId) {
      setError("root.server", {
        type: "server",
        message: "Ce devis n'est associé à aucun client.",
      });
      return;
    }

    // Le contrat d'entretien est généré à partir du devis existant : aucun nouvel
    // enregistrement n'est créé côté API, le devis source reste inchangé.
    try {
      exportMaintenanceContractPDF({
        title: values.title,
        clientName,
        clientRepresentative: client?.companyName ? client.name : undefined,
        clientAddress: values.siteDescription || client?.address,
        service: values.service,
        siteDescription: values.siteDescription,
        frequency: values.frequency,
        periodAmount: values.periodAmount,
        billingPeriod: values.billingPeriod,
        durationMonths: values.durationMonths,
        startDate: new Date(`${values.startDate}T00:00:00`).toISOString(),
        tacitRenewal: values.tacitRenewal,
        outOfContractFee: values.outOfContractFee,
      });

      toast.success("Contrat d'entretien généré en PDF");
      onClose();
    } catch {
      const message = "La génération du PDF du contrat d'entretien a échoué.";
      setError("root.server", { type: "server", message });
      toast.error(message);
    }
  };

  return (
    <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Contrat d’entretien</DialogTitle>
        <DialogDescription>
          Les informations de {clientName} sont reprises du devis. Le montant de l’entretien est
          indépendant du devis.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(submit)} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Titre du contrat</Label>
          <Controller
            name="title"
            control={control}
            render={({ field }) => <Input {...field} aria-invalid={!!errors.title} />}
          />
          <FieldError message={errors.title?.message} />
        </div>

        <div>
          <Label>Système à entretenir</Label>
          <Controller
            name="service"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-invalid={!!errors.service}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BESOINS.map((service) => (
                    <SelectItem key={service} value={service} className="capitalize">
                      {service}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.service?.message} />
        </div>

        <div>
          <Label>Site concerné</Label>
          <Controller
            name="siteDescription"
            control={control}
            render={({ field }) => <Input {...field} aria-invalid={!!errors.siteDescription} />}
          />
          <FieldError message={errors.siteDescription?.message} />
        </div>

        <div>
          <Label>Fréquence des interventions</Label>
          <Controller
            name="frequency"
            control={control}
            render={({ field }) => <Input {...field} aria-invalid={!!errors.frequency} />}
          />
          <FieldError message={errors.frequency?.message} />
        </div>

        <div>
          <Label>Périodicité de facturation</Label>
          <Controller
            name="billingPeriod"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MENSUELLE">Mensuelle</SelectItem>
                  <SelectItem value="TRIMESTRIELLE">Trimestrielle</SelectItem>
                  <SelectItem value="ANNUELLE">Annuelle</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div>
          <Label>Montant TTC par {BILLING_PERIOD_UNIT[billingPeriod]} (FCFA)</Label>
          <Controller
            name="periodAmount"
            control={control}
            render={({ field }) => (
              <Input
                type="number"
                min={0}
                value={field.value}
                aria-invalid={!!errors.periodAmount}
                onChange={(event) => field.onChange(Number(event.target.value))}
              />
            )}
          />
          <FieldError message={errors.periodAmount?.message} />
        </div>

        <div>
          <Label>Durée du contrat (mois)</Label>
          <Controller
            name="durationMonths"
            control={control}
            render={({ field }) => (
              <Input
                type="number"
                min={1}
                max={120}
                value={field.value}
                onChange={(event) => field.onChange(Number(event.target.value))}
              />
            )}
          />
        </div>

        <div>
          <Label>Date de début</Label>
          <Controller
            name="startDate"
            control={control}
            render={({ field }) => <Input {...field} type="date" />}
          />
          <FieldError message={errors.startDate?.message} />
        </div>

        <div>
          <Label>Montant du NB — déplacement hors contrat (FCFA)</Label>
          <Controller
            name="outOfContractFee"
            control={control}
            render={({ field }) => (
              <Input
                type="number"
                min={0}
                value={field.value}
                onChange={(event) => field.onChange(Number(event.target.value))}
              />
            )}
          />
        </div>

        <Controller
          name="tacitRenewal"
          control={control}
          render={({ field }) => (
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <Checkbox
                checked={field.value}
                onCheckedChange={(value) => field.onChange(!!value)}
              />
              Renouvellement par tacite reconduction
            </label>
          )}
        />

        <div className="rounded-md border bg-muted/30 p-3 text-sm sm:col-span-2">
          Montant total du contrat : <strong>{formatFCFA(contractTotal)}</strong> ({periodCount} ×{" "}
          {formatFCFA(periodAmount || 0)})
        </div>

        <div className="sm:col-span-2">
          <FieldError message={errors.root?.server?.message} />
        </div>

        <DialogFooter className="sm:col-span-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting || (isClientLoading && !source.client)}>
            {isClientLoading && !source.client
              ? "Chargement du client..."
              : isSubmitting
                ? "Génération..."
                : "Générer le PDF"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
