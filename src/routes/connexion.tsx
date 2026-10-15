import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import logoSts from "@/assets/logo.png";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/token-storage";
import useAuth from "@/hooks/authUser";
import axios from "axios";
import { api } from "@/features/util/url";

export function ConnexionPage() {
  const login = useAuth((state) => state.login);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (getAuthToken()) {
      navigate("/");
    }
  }, [navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    console.log("body data : ",event)

    if (!email.trim() || !password) {
      setError("Renseignez votre adresse e-mail et votre mot de passe.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await axios.post(`${api}user/login`, {
        email,
        password,
      });

      if (res.data.success !== true) {
        toast.error(res.data.message);
        return;
      }

      toast.success(res.data.message);
      await login(res.data.token);
      localStorage.removeItem("redirectPath");

      const auth = useAuth.getState();
      if (auth.isSuperAdmin || auth.isAdmin) {
        navigate("/admin/home", { replace: true });
      } else if (auth.isCommercial) {
        navigate("/commercial/home", { replace: true });
      } else if (auth.isComptable) {
        navigate("/comptable/home", { replace: true });
      } else if (auth.isTechnicien) {
        navigate("/technicien/interventions", { replace: true });
      } else if (auth.isSecretaire) {
        navigate("/secretaire/home", { replace: true });
      }
    } catch (caughtError) {
      const message = axios.isAxiosError(caughtError)
        ? caughtError.response?.data?.message || caughtError.message
        : caughtError instanceof ApiError
          ? caughtError.message
          : "Connexion impossible. Vérifiez vos identifiants.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

return (
  <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-red-950 px-4 py-10">

    {/* Background */}
    <div className="absolute inset-0 bg-gradient-to-br from-red-950 via-slate-900 to-black" />

    <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-red-600/30 blur-3xl" />
    <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-red-600/20 blur-3xl" />


    <div className="relative grid w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl md:grid-cols-2">


      {/* Partie Branding */}
      <section className="hidden flex-col justify-between bg-gradient-to-br from-gray-700 via-red-800 to-red-950 p-12 text-white md:flex">

        <div>
          <div className="flex items-center gap-4">

            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg">
              <img
                src={logoSts}
                alt="STS SARL"
                className="h-full w-full object-contain"
              />
            </div>

            <div>
              <h1 className="text-2xl font-bold">
                STS SARL
              </h1>

              <p className="text-sm text-red-100">
                Synergie Tech Solutions
              </p>
            </div>

          </div>


          <h2 className="mt-16 text-4xl font-bold leading-tight">
            Une gestion
            <br />
            intelligente et sécurisée
          </h2>


          <p className="mt-6 max-w-md text-red-100">
            Centralisez vos clients, contrats, interventions
            et équipes techniques depuis une seule plateforme.
          </p>


          <div className="mt-10 flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">

            <div className="rounded-full bg-white/20 p-3">
              🔒
            </div>

            <div>
              <p className="font-medium">
                Plateforme sécurisée
              </p>

              <p className="text-sm text-red-100">
                Accès réservé au personnel autorisé
              </p>
            </div>

          </div>

        </div>


        <p className="text-sm text-red-200">
          © {new Date().getFullYear()} STS SARL. Tous droits réservés.
        </p>

      </section>



      {/* Formulaire */}
      <section className="flex items-center justify-center bg-white p-8 md:p-12">


        <Card className="w-full max-w-md border-0 shadow-none">


          <CardHeader className="space-y-4 text-center">


            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-red-50 shadow-inner md:hidden">

              <img
                src={logoSts}
                alt="STS"
                className="h-16 w-16 object-contain"
              />

            </div>


            <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">
              Bienvenue 👋
            </CardTitle>


            <CardDescription className="text-base">
              Connectez-vous à votre espace de gestion STS SARL.
            </CardDescription>


          </CardHeader>



          <CardContent>


            <form
              className="space-y-6"
              onSubmit={handleSubmit}
            >


              {error && (
                <Alert
                  variant="destructive"
                  className="rounded-xl"
                >
                  <AlertDescription>
                    {error}
                  </AlertDescription>
                </Alert>
              )}



              <div className="space-y-2">

                <Label htmlFor="email">
                  Adresse e-mail
                </Label>


                <div className="relative">

                  <Mail
                    className="
                      absolute left-3 top-1/2 
                      h-5 w-5 
                      -translate-y-1/2
                      text-slate-400
                    "
                  />


                  <Input
                    id="email"
                    type="email"
                    placeholder="vous@sts.ci"
                    className="
                      h-12 rounded-xl
                      pl-11
                      border-slate-200
                      focus:ring-2
                      focus:ring-red-500
                    "
                    value={email}
                    onChange={(e)=>setEmail(e.target.value)}
                    disabled={isSubmitting}
                  />

                </div>

              </div>





              <div className="space-y-2">

                <Label htmlFor="password">
                  Mot de passe
                </Label>


                <div className="relative">


                  <LockKeyhole
                    className="
                    absolute left-3 top-1/2
                    h-5 w-5
                    -translate-y-1/2
                    text-slate-400
                    "
                  />



                  <Input
                    id="password"
                    type={showPassword ? "text":"password"}
                    placeholder="Votre mot de passe"
                    className="
                      h-12 rounded-xl
                      px-11
                      border-slate-200
                      focus:ring-2
                      focus:ring-red-500
                    "
                    value={password}
                    onChange={(e)=>setPassword(e.target.value)}
                    disabled={isSubmitting}
                  />



                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                    className="
                      absolute right-3 top-1/2
                      -translate-y-1/2
                      text-slate-400
                      hover:text-slate-700
                    "
                  >

                    {
                      showPassword
                      ?
                      <EyeOff size={20}/>
                      :
                      <Eye size={20}/>
                    }

                  </button>


                </div>


              </div>




              <Button
                type="submit"
                disabled={isSubmitting}
                className="
                  h-12
                  w-full
                  rounded-xl
                  bg-red-700
                  text-base
                  font-semibold
                  shadow-lg
                  shadow-red-700/30
                  transition
                  hover:bg-red-800
                "
              >

                {
                  isSubmitting &&
                  <LoaderCircle
                    className="mr-2 animate-spin"
                  />
                }


                {
                  isSubmitting
                  ?
                  "Connexion..."
                  :
                  "Se connecter"
                }

              </Button>



            </form>


            <p className="mt-8 text-center text-xs text-slate-400">
              🔐 Accès réservé aux membres autorisés de STS SARL.
            </p>


          </CardContent>

        </Card>


      </section>


    </div>


  </main>
);
}
