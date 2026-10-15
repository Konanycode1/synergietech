import { AppLayout } from "@/components/AppLayout";
import { Dashboard } from "@/routes";
import { ClientsPage } from "@/routes/clients";
import { ContratsPage } from "@/routes/contrats";
import { EquipePage } from "@/routes/equipe";
import { InterventionsPage } from "@/routes/interventions";
import { StockPage } from "@/routes/stock";
import { ProspectsPage } from "@/routes/prospects";
import { Navigate, Route, Routes } from "react-router-dom";

const SecretaireRoutes = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<Dashboard />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="client" element={<Navigate to="/secretaire/clients" replace />} />
        <Route path="contracts" element={<ContratsPage />} />
        <Route path="equipes" element={<EquipePage />} />
        <Route path="interventions" element={<InterventionsPage />} />
        <Route path="stock" element={<StockPage />} />
        <Route path="prospects" element={<ProspectsPage />} />
      </Route>
    </Routes>
  );
};
export default SecretaireRoutes;
