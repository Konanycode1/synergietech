export type NavigationIcon =
  | "dashboard"
  | "prospects"
  | "contracts"
  | "clients"
  | "interventions"
  | "stock"
  | "team"
  | "applicants";

export type AppSection = "admin" | "secretaire" | "commercial" | "technicien";

export interface NavigationItem {
  path: string;
  label: string;
  icon: NavigationIcon;
}

export const NAVIGATION_BY_SECTION: Record<AppSection, readonly NavigationItem[]> = {
  admin: [
    { path: "home", label: "Tableau de bord", icon: "dashboard" },
    { path: "prospects", label: "Prospects", icon: "prospects" },
    { path: "contracts", label: "Contrats", icon: "contracts" },
    { path: "clients", label: "Clients", icon: "clients" },
    { path: "interventions", label: "Interventions", icon: "interventions" },
    { path: "stock", label: "Stock", icon: "stock" },
    { path: "equipes", label: "Équipe", icon: "team" },
    { path: "applicants", label: "Candidatures", icon: "applicants" },
  ],
  secretaire: [
    { path: "home", label: "Tableau de bord", icon: "dashboard" },
    { path: "prospects", label: "Prospects", icon: "prospects" },
    { path: "contracts", label: "Contrats", icon: "contracts" },
    { path: "clients", label: "Clients", icon: "clients" },
    { path: "stock", label: "Stock", icon: "stock" },
  ],
  commercial: [
    { path: "home", label: "Tableau de bord", icon: "dashboard" },
    { path: "prospects", label: "Prospects", icon: "prospects" },
    { path: "contracts", label: "Contrats", icon: "contracts" },
    { path: "clients", label: "Clients", icon: "clients" },
    { path: "stock", label: "Stock", icon: "stock" },
  ],
  technicien: [{ path: "interventions", label: "Interventions", icon: "interventions" }],
};

export function getAppSection(pathname: string): AppSection {
  if (pathname.startsWith("/secretaire")) return "secretaire";
  if (pathname.startsWith("/commercial")) return "commercial";
  if (pathname.startsWith("/technicien")) return "technicien";
  return "admin";
}
