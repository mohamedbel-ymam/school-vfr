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
  Save,
  User,
  HeartHandshake,
} from "lucide-react";

import { useNavigate, Outlet, useMatch } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

export default function BoursierDashboard() {
  const [me, setMe] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingContribs, setLoadingContribs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState("");

  /* -------- Editable academic profile -------- */
  const [university, setUniversity] = useState("");
  const [field, setField] = useState("");

  /* -------- Contribution form -------- */
  const [contribType, setContribType] = useState("teaching");
  const [contribTitle, setContribTitle] = useState("");
  const [contribDetails, setContribDetails] = useState("");
  const [contribDate, setContribDate] = useState("");

  const navigate = useNavigate();
  const { logout } = useAuth();
  const isSettingsPage = useMatch("/boursier/paramètres");

  const notify = (msg) => alert(msg);

  /* -------- Load data -------- */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchMe();
        setMe(data);
        setUniversity(data?.profile?.university ?? "");
        setField(data?.profile?.field_of_study ?? "");
      } catch {
        setError("Erreur lors du chargement.");
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

  /* -------- Identity -------- */
  const user = me?.user;
  const profile = me?.profile;

  const fullName = user
    ? `${user.firstname ?? ""} ${user.lastname ?? ""}`.trim()
    : "";

  const email = user?.email ?? "";

  const finalSchoolYear =
    profile?.final_school_year ?? "—";

  const universityLabel =
    university || "Université non renseignée";

  const fieldLabel =
    field || "Filière non renseignée";

  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0]?.toUpperCase())
      .slice(0, 2)
      .join("") || "?";

  /* -------- Actions -------- */
  const handleLogout = async () => {
    await logout();
    navigate("/connexion", { replace: true });
  };

  const handleSaveProfile = async () => {
    if (!university || !field) {
      notify("Université et filière obligatoires.");
      return;
    }

    setSavingProfile(true);
    try {
      await updateMyProfile({
        university,
        field_of_study: field,
      });

      setMe((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          university,
          field_of_study: field,
        },
      }));

      notify("Profil mis à jour ✔");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSubmitContribution = async (e) => {
    e.preventDefault();

    if (!contribDetails.trim()) {
      notify("Description requise.");
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

      setContribTitle("");
      setContribDetails("");
      setContribDate("");

      setContributions(await fetchMyContributions());
      notify("Contribution envoyée ✔");
    } finally {
      setSubmitting(false);
    }
  };

  /* -------- Render -------- */
  return (
    <div className="space-y-6">
      {/* ===== NAVBAR ===== */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-xl border bg-white/70 px-4 py-3 shadow-sm backdrop-blur">
        {/* LEFT */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white font-semibold">
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold">{fullName}</p>
            <p className="text-xs text-muted-foreground">{email}</p>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <GraduationCap className="h-4 w-4" />
            {universityLabel}
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {fieldLabel}
          </div>
          <div className="italic">
            Promo Takwa {finalSchoolYear}
          </div>
        </div>

        <Button variant="destructive" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-1" />
          Déconnexion
        </Button>
      </header>

      {/* ===== SETTINGS PAGE ===== */}
      {isSettingsPage ? (
        <Outlet />
      ) : (
        <>
          {/* HERO */}
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
                Valorisez votre parcours universitaire et vos contributions.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* ACADEMIC PROFILE */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Parcours universitaire
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Université"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
              />
              <Input
                placeholder="Filière"
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
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* CONTRIBUTIONS */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HeartHandshake className="h-5 w-5" />
                Contributions
              </CardTitle>
              <CardDescription>
                Aucune contribution financière n’est demandée.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSubmitContribution} className="space-y-3">
                <Select value={contribType} onValueChange={setContribType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teaching">Cours</SelectItem>
                    <SelectItem value="mentoring">Mentorat</SelectItem>
                    <SelectItem value="meetup">Conférence</SelectItem>
                    <SelectItem value="material">Don matériel</SelectItem>
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
                  placeholder="Description"
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
                    Envoyer
                  </Button>
                </div>
              </form>

              <div className="border-t pt-3">
                <p className="text-xs font-semibold mb-2">Historique</p>
                {loadingContribs ? (
                  <p className="text-xs text-muted-foreground">Chargement…</p>
                ) : contributions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Aucune contribution.
                  </p>
                ) : (
                  <div className="space-y-2 text-xs">
                    {contributions.map((c) => (
                      <div key={c.id} className="border rounded-md p-2">
                        <p className="font-medium">
                          [{c.type}] {c.title || "Sans titre"}
                        </p>
                        <p className="text-muted-foreground mt-1">
                          {c.details}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
