import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Building2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  CircleUserRound,
  UserCog,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useSWRConfig } from "swr";

import logoSts from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { getAppSection, NAVIGATION_BY_SECTION, type NavigationIcon } from "@/config/navigation";
import useAuth from "@/hooks/authUser";

const NAVIGATION_ICONS: Record<NavigationIcon, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  prospects: Users,
  contracts: FileText,
  clients: Building2,
  interventions: Wrench,
  team: UserCog,
  stock: Package,
  applicants: ClipboardList,
};

export function AppLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { mutate } = useSWRConfig();
  const logout = useAuth((state) => state.logout);
  const user = useAuth((state) => state.user);
  const userName = useAuth((state) => state.userName);
  const [mobileOpen, setMobileOpen] = useState(false);

  const section = getAppSection(pathname);
  const basePath = `/${section}`;
  // Les techniciens travaillent sur le terrain : sur téléphone, navigation par onglets en bas.
  const isFieldMode = section === "technicien";
  const displayName = user?.name || userName || user?.email || "Utilisateur";
  const role = user?.role || section.toLocaleUpperCase("fr-FR");
  const roleLabel =
    {
      SUPERADMIN: "Super administrateur",
      ADMIN: "Administrateur",
      SECRETAIRE: "Secrétaire",
      COMMERCIAL: "Commercial",
      TECHNICIEN: "Technicien",
      COMPTABLE: "Comptable",
    }[role] || role;
  const navItems = NAVIGATION_BY_SECTION[section].map((item) => ({
    ...item,
    to: `${basePath}/${item.path}`,
    icon: NAVIGATION_ICONS[item.icon],
  }));

  const handleLogout = () => {
    logout();
    void mutate(() => true, undefined, { revalidate: false });
    navigate("/", { replace: true });
  };

  const NavContent = (
    <>
      <div className="px-5 py-6 border-b border-sidebar-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-lg bg-white grid place-items-center overflow-hidden ring-1 ring-sidebar-border">
            <img src={logoSts} alt="STS SARL" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="font-semibold tracking-tight">STS SARL</div>
            <div className="text-[11px] text-sidebar-foreground/60">Synergie Tech Solutions</div>
          </div>
        </div>

        <button
          className="lg:hidden text-sidebar-foreground/70"
          onClick={() => setMobileOpen(false)}
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((n) => {
          const active = pathname === n.to || pathname.startsWith(`${n.to}/`);
          return (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              }`}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-sidebar-border">
        <div className="mb-3 flex items-center gap-2.5 rounded-md bg-sidebar-accent/50 px-3 py-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
            <CircleUserRound className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium" title={displayName}>
              {displayName}
            </div>
            <div className="truncate text-[11px] text-sidebar-foreground/60">{roleLabel}</div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-3 w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Se déconnecter
        </Button>
        <div className="text-[10px] text-sidebar-foreground/50 px-2">
          Application connectée à l’API · Cocody Angré, Abidjan
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        {NavContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex w-72 max-w-[85vw] flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
            {NavContent}
          </aside>
        </div>
      )}

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card sticky top-0 z-40">
          {!isFieldMode && (
            <button
              className="p-1.5 -ml-1.5 rounded-md hover:bg-muted"
              onClick={() => setMobileOpen(true)}
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-white grid place-items-center overflow-hidden ring-1 ring-border">
              <img src={logoSts} alt="STS" className="h-full w-full object-contain" />
            </div>

            <div className="font-semibold text-sm">STS SARL</div>
          </div>
          <div className="ml-auto min-w-0 text-right">
            <div className="max-w-36 truncate text-xs font-medium">{displayName}</div>
            <div className="text-[10px] text-muted-foreground">{roleLabel}</div>
          </div>
          {isFieldMode && (
            <button
              className="p-2 -mr-2 rounded-md text-muted-foreground hover:bg-muted"
              onClick={handleLogout}
              aria-label="Se déconnecter"
            >
              <LogOut className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className={`flex-1 min-w-0 ${isFieldMode ? "pb-20 lg:pb-0" : ""}`}>
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tabs (technicien) */}
      {isFieldMode && (
        <nav
          className="lg:hidden fixed inset-x-0 bottom-0 z-40 grid border-t border-border bg-card pb-[env(safe-area-inset-bottom)]"
          style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
        >
          {navItems.map((n) => {
            const active = pathname === n.to || pathname.startsWith(`${n.to}/`);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <n.icon className="h-5 w-5" />
                {n.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
