import React, { useEffect, useState, useMemo } from "react";
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
  KeyRound,
  Coins,
  Clock,
  CheckCircle2,
} from "lucide-react";

import { useNavigate, Outlet, useMatch } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

export default function BoursierDashboard() {
  const [me, setMe] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [university, setUniversity] = useState("");
  const [field, setField] = useState("");

  const [contribType, setContribType] = useState("teaching");
  const [contribTitle, setContribTitle] = useState("");
  const [contribDetails, setContribDetails] = useState("");
  const [contribDate, setContribDate] = useState("");

  const navigate = useNavigate();
  const { logout } = useAuth();
  const isSettingsPage = useMatch("/boursier/paramètres");

  /* ---------------- Load data ---------------- */
  useEffect(() => {
    (async () => {
      const data = await fetchMe();
      setMe(data);
      setUniversity(data?.profile?.university ?? "");
      setField(data?.profile?.field_of_study ?? "");
      setContributions(await fetchMyContributions());
      setLoading(false);
    })();
  }, []);

  const user = me?.user;
  const profile = me?.profile;
  const disbursements = me?.disbursements || [];

  const fullName = user
    ? `${user.firstname ?? ""} ${user.lastname ?? ""}`.trim()
    : "";

  const initials =
    fullName
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2) || "?";

  /* ---------------- Disbursement summary ---------------- */
  const disbSummary = useMemo(() => {
    const total = disbursements.reduce((s, d) => s + (d.amount || 0), 0);
    const paid = disbursements.filter((d) => d.paid_at).reduce((s, d) => s + d.amount, 0);
    const next = disbursements.find((d) => !d.paid_at);
    return { total, paid, next };
  }, [disbursements]);

  /* ---------------- Actions ---------------- */
  const handleLogout = async () => {
    await logout();
    navigate("/connexion", { replace: true });
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    await updateMyProfile({ university, field_of_study: field });
    setSavingProfile(false);
  };

  const handleSubmitContribution = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await createMyContribution({
      type: contribType,
      title: contribTitle || null,
      details: contribDetails,
      scheduled_at: contribDate || null,
    });
    setContributions(await fetchMyContributions());
    setSubmitting(false);
  };

  /* ================= RENDER ================= */
  return (
    <div className="space-y-6">
      {/* ===== NAVBAR ===== */}
      <header className="flex items-center justify-between rounded-xl border bg-white/70 px-4 py-3 shadow-sm">
        
        {/* 🔁 CLICKABLE AVATAR → BACK TO DASHBOARD */}
        <button
          onClick={() => navigate("/boursier")}
          className="flex items-center gap-3 text-left hover:opacity-80 transition"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white font-semibold">
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold">{fullName}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </button>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("paramètres")}>
            <KeyRound className="h-4 w-4 mr-1" />
            Mot de passe
          </Button>
          <Button variant="destructive" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-1" />
            Déconnexion
          </Button>
        </div>
      </header>

      {/* ===== SETTINGS ===== */}
      {isSettingsPage ? (
        <Outlet />
      ) : (
        <>
          {/* HERO */}
          <Card className="border-none bg-gradient-to-r from-indigo-600 to-emerald-400 text-white">
            <CardHeader>
              <CardTitle>Bienvenue {fullName}</CardTitle>
              <CardDescription>Suivi de votre bourse et contributions</CardDescription>
            </CardHeader>
          </Card>

          {/* ECHEANCES */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" /> Échéances
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>Total reçu : <b>{disbSummary.paid} DH</b></p>
              <p>Total prévu : <b>{disbSummary.total} DH</b></p>
              {disbSummary.next && (
                <p className="flex items-center gap-2 text-amber-600">
                  <Clock className="h-4 w-4" />
                  Prochaine tranche : {disbSummary.next.amount} DH
                </p>
              )}
              {!disbSummary.next && (
                <p className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Toutes les tranches réglées
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
