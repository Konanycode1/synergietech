import { User } from "@/features/interface/user.type";
import { api } from "@/features/util/url";
import axios from "axios";
import { toast } from "sonner";
import { create } from "zustand";

interface AuthStore {
  token: string;
  url: string;
  user: User;
  isLogin: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isTechnicien: boolean;
  isCommercial: boolean;
  isSecretaire: boolean;
  isComptable: boolean;
  loginPending: boolean;
  userName: string;
  userId: string;
  fetchUser: (token: string) => Promise<void>;
  login: (token: string) => Promise<void>;
  logout: () => void;
  loginOnStart: () => void;
}
const useAuth = create<AuthStore>((set) => ({
  token: "",
  url: "admin",
  user: {} as User,
  userName: "" as string,
  userId: "" as string,
  isLogin: false,
  loginPending: true,
  isAdmin: false,
  isSuperAdmin: false,
  isTechnicien: false,
  isCommercial: false,
  isSecretaire: false,
  isComptable: false,
  fetchUser: async (token) => {
    set({ loginPending: true });
    console.log("fetch encours .......");
    try {
      const response = await axios.get(`${api}user/auth`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
          Accept: "application/json",
        },
        withCredentials: false,
      });
      console.log("retour-server: ", response.data);
      if (response.data.success === true) {
        const { data } = response.data;
        set({
          token: token,
          user: data.user ?? data,
          isLogin: true,
          loginPending: false,
          isSuperAdmin: data.role === "SUPERADMIN",
          isAdmin: data.role === "ADMIN",
          isTechnicien: data.role === "TECHNICIEN",
          userName: data.nom ?? data.name,
          userId: data.id,
          isCommercial: data.role === "COMMERCIAL",
          isSecretaire: data.role === "SECRETAIRE",
          isComptable: data.role === "COMPTABLE",
          url:
            data.role === "SUPERADMIN"
              ? "admin"
              : data.role === "ADMIN"
                ? "admin"
                : data.role === "COMMERCIAL"
                  ? "prospects"
                  : data.role === "TECHNICIEN"
                    ? "interventions"
                    : data.role === "SECRETAIRE"
                      ? "admin"
                      : (data.user ?? data).poste === "COMPTABLE"
                        ? "comptable"
                        : "admin",
        });
      } else {
        set({
          token: "",
          user: {} as User,
          isLogin: false,
          loginPending: false,
        });
      }
    } catch (error) {
      console.log(error);
      set({ token: "", user: {} as User, isLogin: false, loginPending: false });
    } finally {
      set({ loginPending: false });
    }
  },

  login: async (token) => {
    console.log("token-server", token);
    localStorage.setItem("token", token);
    set({ loginPending: true });
    await useAuth.getState().fetchUser(token);
  },

  logout: () => {
    localStorage.clear();
    set({
      token: "",
      url: "admin",
      user: {} as User,
      userName: "",
      userId: "",
      isLogin: false,
      loginPending: false,
      isSuperAdmin: false,
      isAdmin: false,
      isTechnicien: false,
      isCommercial: false,
      isSecretaire: false,
      isComptable: false,
    });
    toast.success("Déconnexion réussie");
  },
  loginOnStart: () => {
    const token = localStorage.getItem("token");
    useAuth.getState().fetchUser(token as string);
  },
}));

export default useAuth;
