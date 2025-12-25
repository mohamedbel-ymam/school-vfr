import React, { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../components/ui/select";

import {
  fetchMe,
  fetchMyContributions,
  createMyContribution,
} from "../../services/boursier/selfApi";

import {
  GraduationCap,
  Calendar,
  Sparkles,
  LogOut,
  KeyRound,
  User as UserIcon,
} from "lucide-react";

import { useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

export default function BoursierDashboard() {
  const [me, setMe] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingContribs, setLoadingContribs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  /* ---------------- Contribution form ---------------- */
  const [contribType, setContribType] = useState("teaching");
  const [contribTitle, setContribTitle] = useState("");
  const [contribDetails, setContribDetails] = useState("");
  const [contribDate, setContribDate] = useState("");

  const notify = (msg) => alert(msg);

  const navigate = useNavigate();
  const { logout } = useAuth();

  /* ---------------- Load data ---------------- */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchMe();
        setMe(data);
      } catch (e) {
        console.error(e);
        setError("Erreur lors du chargement de vos informations.");
      } finally {
        setLoading(false);
      }
    };

    const loadContribs = async () => {
      setLoadingContribs(true);
      try {
        const data = await fetchMyContributions();
        setContributions(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingContribs(false);
      }
    };

    load();
    loadContribs();
  }, []);

  /* ---------------- Identity ---------------- */
  const user = me?.user;
  const profile = me?.profile;

  const fullName = user
    ? `${user.firstname ?? ""} ${user.lastname ?? ""}`.trim()
    : "";

  const email = user?.email ?? "";

  const university = profile?.university ?? "Université non renseignée";
  const field = profile?.field_of_study ?? "Filière non renseignée";
  const finalSchoolYear =
    profile?.final_school_year ?? "Année finale non renseignée";

  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0]?.toUpperCase())
      .slice(0, 2)
      .join("") || "?";

  /* ---------------- Actions ---------------- */
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/connexion", { replace: true });
    } catch {
      notify("Erreur lors de la déconnexion.");
    }
  };

  const handleGoToAccount = () => {
    navigate("paramètres");
  };

  const handleSubmitContribution = async (e) => {
    e.preventDefault();

    if (!contribDetails.trim()) {
      notify("Merci de décrire votre contribution.");
      return;
    }

    setSubmitting(true);
    try {
      await createMyContribution({
        type: contribType,
        title: contribTitle || null,
        details: contribDetails,
        scheduled_at: contribDate || null,
      });

      notify("Merci pour votre contribution 💙");
      setContribTitle("");
      setContribDetails("");
      setContribDate("");

      const updated = await fetchMyContributions();
      setContributions(updated || []);
    } catch (e) {
      console.error(e);
      notify("Erreur lors de l’envoi.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- Render ---------------- */
  return (
    <div className="space-y-6">
      {/* Header / Account bar */}
      <header className="flex items-center justify-between rounded-xl border bg-white/70 px-4 py-3 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold">{fullName || "Boursier Takwa"}</p>
            <p className="text-xs text-muted-foreground">{email}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGoToAccount}
            className="flex items-center gap-1"
          >
            <KeyRound className="h-4 w-4" />
            <span className="text-xs">Mon compte</span>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleLogout}
            className="flex items-center gap-1"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-xs">Déconnexion</span>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <Card className="border-none bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-400 text-white">
        <CardHeader>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs">
            <Sparkles className="h-3 w-3" />
            Communauté des boursiers Takwa
          </div>
          <CardTitle className="mt-3 text-2xl">
            Bienvenue {fullName || "cher boursier"}
          </CardTitle>
          <CardDescription className="text-white/80">
            Cet espace est dédié aux anciens élèves boursiers.
            Vous pouvez y présenter votre parcours universitaire
            et proposer des contributions éducatives, humaines ou professionnelles.
          </CardDescription>

          <div className="mt-4 space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              {university}
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {field}
            </div>
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              Dernière année à Takwa : {finalSchoolYear}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Contributions */}
      <Card>
        <CardHeader>
          <CardTitle>Contribuer à la communauté</CardTitle>
          <CardDescription>
            Partagez votre expérience, proposez un atelier, un mentorat
            ou un don de matériel. Aucune contribution financière n’est demandée.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={handleSubmitContribution} className="space-y-3">
            <Select value={contribType} onValueChange={setContribType}>
              <SelectTrigger>
                <SelectValue placeholder="Type de contribution" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="teaching">Cours / enseignement</SelectItem>
                <SelectItem value="mentoring">Mentorat</SelectItem>
                <SelectItem value="meetup">Conférence / rencontre</SelectItem>
                <SelectItem value="material">Don de matériel</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Titre (optionnel)"
              value={contribTitle}
              onChange={(e) => setContribTitle(e.target.value)}
            />

            <Textarea
              rows={4}
              placeholder="Décrivez votre contribution"
              value={contribDetails}
              onChange={(e) => setContribDetails(e.target.value)}
            />

            <Input
              type="date"
              value={contribDate}
              onChange={(e) => setContribDate(e.target.value)}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Envoi…" : "Envoyer"}
              </Button>
            </div>
          </form>

          <div className="border-t pt-3">
            <p className="text-xs font-semibold mb-2">
              Vos contributions précédentes
            </p>

            {loadingContribs ? (
              <p className="text-xs text-muted-foreground">Chargement…</p>
            ) : contributions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Aucune contribution pour le moment.
              </p>
            ) : (
              <div className="space-y-2 text-xs">
                {contributions.map((c) => (
                  <div key={c.id} className="rounded-md border p-2">
                    <p className="font-medium">
                      [{c.type}] {c.title || "Sans titre"}
                    </p>
                    {c.details && (
                      <p className="text-muted-foreground mt-1">
                        {c.details}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-xs text-red-600">{error}</p>}
      <Outlet />
    </div>
  );
}
