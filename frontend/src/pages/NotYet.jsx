// src/pages/NotYet.jsx
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Button } from "../components/ui/button";
import { Clock, ArrowRight } from "lucide-react";

const ROLE_PRIORITY = ["admin", "teacher", "student", "parent"];
const ROLE_TO_ROUTE = {
  admin:   "/admin/tableau de bord",
  teacher: "/enseignant/tableau de bord",
  student: "/élève/tableau de bord",
  parent:  "/parent/tableau de bord",
};

export default function NotYet({ to }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const target = useMemo(() => {
    if (to) return to; // optional override
    const roles = Array.isArray(user?.roles) ? user.roles : (user?.role ? [user.role] : []);
    const top = ROLE_PRIORITY.find((r) => roles.includes(r));
    return top ? ROLE_TO_ROUTE[top] : "/connexion";
  }, [to, user]);

  return (
    <div className="min-h-[60vh] grid place-items-center p-6">
      <div className="max-w-xl w-full rounded-2xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="bg-gradient-to-tr from-primary/15 to-primary/5 p-10 text-center">
          <div className="mx-auto mb-4 h-14 w-14 grid place-items-center rounded-full bg-primary/10">
            <Clock className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Service bientôt disponible
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Cette section n’est pas encore prête. Nous y travaillons activement — merci pour votre patience ✨
          </p>
        </div>

        <div className="p-6 flex flex-wrap gap-3 justify-center">
          <Button onClick={() => navigate(target)} className="gap-2">
            Continuer vers votre tableau de bord
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Retour
          </Button>
          <Button variant="ghost" onClick={() => navigate("/")}>
            Accueil
          </Button>
        </div>
      </div>
    </div>
  );
}
