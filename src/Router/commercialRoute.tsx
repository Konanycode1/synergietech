import { AppLayout } from "@/components/AppLayout";
import { Dashboard } from "@/routes";
import { ContratsPage } from "@/routes/contrats";
import { ClientsPage } from "@/routes/clients";
import { ProspectsPage } from "@/routes/prospects";
import { StockPage } from "@/routes/stock";
import { Navigate, Route, Routes } from "react-router-dom";

const CommercialRoutes = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<Dashboard />} />
        <Route path="contracts" element={<ContratsPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="prospects" element={<ProspectsPage />} />
        <Route path="stock" element={<StockPage />} />
      </Route>
    </Routes>
  );
};
export default CommercialRoutes;
