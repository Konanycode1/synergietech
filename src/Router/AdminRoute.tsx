import { AppLayout } from "@/components/AppLayout";
import { Dashboard } from "@/routes";
import { ContratsPage } from "@/routes/contrats";
import { ClientsPage } from "@/routes/clients";
import { EquipePage } from "@/routes/equipe";
import { InterventionsPage } from "@/routes/interventions";
import { StockPage } from "@/routes/stock";
import { ProspectsPage } from "@/routes/prospects";
import { ApplicantsPage } from "@/routes/applicants";
import { Navigate, Route, Routes } from "react-router-dom";

const AdminRoutes = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<Dashboard />} />
        <Route path="contracts" element={<ContratsPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="equipes" element={<EquipePage />} />
        <Route path="interventions" element={<InterventionsPage />} />
        <Route path="stock" element={<StockPage />} />
        <Route path="prospects" element={<ProspectsPage />} />
        <Route path="applicants" element={<ApplicantsPage />} />
      </Route>
    </Routes>
  );
};
export default AdminRoutes;
