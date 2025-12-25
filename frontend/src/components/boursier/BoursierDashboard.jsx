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
  updateMyProfile,
} from "../../services/boursier/selfApi";

import {
  GraduationCap,
  Calendar,
  Sparkles,
  LogOut,
  KeyRound,
  User,
  Save,
  HeartHandshake,
} from "lucide-react";

import { useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

export default function BoursierDashboard() {
  const [me, setMe] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingContribs, setLoadingContribs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState("");

  /* ---------- Editable academic profile ---------- */
  const [university, setUniversity] = useState("");
  const [field, setField] = useState("");

  /* ---------- Contribution form ---------- */
  const [contribType, setContribType] = useState("teaching");
  const [contribTitle, setContribTitle] = useState("");
  const [contribDetails, setContribDetails] = useState("");
  const [contribDate, setContribDate] = useState("");

  const notify = (msg) => alert(msg);
  const navigate = useNavigate();
  const { logout } = useAuth();

  /* ---------- Load data ---------- */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchMe();
        setMe(data);

        setUniversity(data?.profile?.university ?? "");
        setField(data?.profile?.field_of_study ?? "");
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
      } finally {
        setLoadingContribs(false);
      }
    };

    load();
    loadContribs();
  }, []);

  /* ---------- Identity ---------- */
  const userData = me?.user;
  const profile = me?.profile;

  const fullName = userData
    ? `${userData.firstname ?? ""} ${userData.lastname ?? ""}`.trim()
    : "";

  const email = userData?.email ?? "";
  const finalSchoolYear =
    profile?.final_school_year ?? "Année finale non renseignée";

  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0]?.toUpperCase())
      .slice(0, 2)
      .join("") || "?";

  /* ---------- Actions ---------- */
  const handleLogout = async () => {
    await logout();
    navigate("/connexion", { replace: true });
  };

  const handleGoToAccount = () => {
    navigate("paramètres");
  };

  const handleSaveProfile = async () => {
    if (!university || !field) {
      notify("Merci de renseigner l’université et la filière.");
      return;
    }
    setSavingProfile(true);
    try {
      await updateMyProfile({
        university,
        field_of_study: field,
      });
      notify("Parcours universitaire mis à jour ✔");
    } catch {
      notify("Erreur lors de l’enregistrement.");
    } finally {
      setSavingProfile(false);
    }
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

      notify("Contribution envoyée à l’administration ✔");
      setContribTitle("");
      setContribDetails("");
      setContribDate("");

      const updated = await fetchMyContributions();
      setContributions(updated || []);
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Render ---------- */
  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-xl border bg-white/70 px-4 py-3 shadow-sm backdrop-blur">
        {/* Left */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white font-semibold">
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold">{fullName}</p>
            <p className="text-xs text-muted-foreground">{email}</p>
          </div>
        </div>

        {/* Right */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <GraduationCap className="h-4 w-4" />
            <span>{university || "Université non renseignée"}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{field || "Filière non renseignée"}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleGoToAccount}
            className="flex items-center gap-1"
          >
            <KeyRound className="h-4 w-4" />
            <span>Modifier mot de passe</span>
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleLogout}
            className="flex items-center gap-1"
          >
            <LogOut className="h-4 w-4" />
            <span>Déconnexion</span>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <Card className="border-none bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-400 text-white">
        <CardHeader>
          <div className="inline-flex items-center gap-2 bg-white/15 px-3 py-1 rounded-full text-xs">
            <Sparkles className="h-3 w-3" />
            Communauté Boursiers Takwa
          </div>
          <CardTitle className="mt-3 text-2xl">
            Bienvenue {fullName || "cher boursier"}
          </CardTitle>
          <CardDescription className="text-white/80">
            Cet espace valorise votre parcours universitaire et vos contributions
            à la communauté éducative Takwa.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Academic profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Parcours universitaire
          </CardTitle>
          <CardDescription>
            Ces informations sont visibles par l’administration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Université"
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
          />
          <Input
            placeholder="Filière / spécialité"
            value={field}
            onChange={(e) => setField(e.target.value)}
          />
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <User className="h-4 w-4" />
            Dernière année à Takwa : {finalSchoolYear}
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} disabled={savingProfile}>
              <Save className="h-4 w-4 mr-1" />
              {savingProfile ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contributions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HeartHandshake className="h-5 w-5" />
            Contributions à la communauté
          </CardTitle>
          <CardDescription>
            Aucune contribution financière n’est demandée.
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
                {submitting ? "Envoi…" : "Envoyer à l’administration"}
              </Button>
            </div>
          </form>

          <div className="border-t pt-3">
            <p className="text-xs font-semibold mb-2">
              Historique de vos contributions
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
                  <div key={c.id} className="border rounded-md p-2">
                    <p className="font-medium">
                      [{c.type}] {c.title || "Sans titre"}
                    </p>
                    <p className="text-muted-foreground mt-1">{c.details}</p>
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
