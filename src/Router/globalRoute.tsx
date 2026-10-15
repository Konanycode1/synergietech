import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import useAuth from "@/hooks/authUser";
import { ConnexionPage } from "@/routes/connexion";
import NotAuthorized from "@/screens/notAuthorized";
import AdminRoutes from "./AdminRoute";
import CommercialRoutes from "./commercialRoute";
import SecretaireRoutes from "./secretaireRoute";
import TechnicienRoutes from "./technicienRoute";

type Access = "admin" | "secretaire" | "commercial" | "technicien";

function ProtectedRoute({ access, children }: { access: Access; children: ReactNode }) {
  console.log("access: ",access)
  const location = useLocation();
  const { isLogin, isSuperAdmin, isAdmin, isSecretaire, isCommercial, isTechnicien } = useAuth();
  console.log(isSecretaire)

  if (!isLogin) {
    localStorage.setItem("redirectPath", location.pathname + location.search);
    return <Navigate to="/" replace />;
  }

  const isAllowed =
    isSuperAdmin ||
    (access === "admin" && isAdmin) ||
    (access === "secretaire" && isSecretaire) ||
    (access === "commercial" && isCommercial) ||
    (access === "technicien" && isTechnicien);

  return isAllowed ? children : <NotAuthorized />;
}

export default function GlobalRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ConnexionPage />} />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute access="admin">
            <AdminRoutes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/secretaire/*"
        element={
          <ProtectedRoute access="secretaire">
            <SecretaireRoutes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/commercial/*"
        element={
          <ProtectedRoute access="commercial">
            <CommercialRoutes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/technicien/*"
        element={
          <ProtectedRoute access="technicien">
            <TechnicienRoutes />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
