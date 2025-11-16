import React, { useEffect, useMemo, useState } from "react";
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
  Calendar,
  GraduationCap,
  HeartHandshake,
  Coins,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  LogOut,
  KeyRound,
  User as UserIcon,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

const CURRENT_YEAR = new Date().getFullYear();

export default function BoursierDashboard() {
  const [me, setMe] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [loadingMe, setLoadingMe] = useState(true);
  const [loadingContribs, setLoadingContribs] = useState(true);
  const [submittingContrib, setSubmittingContrib] = useState(false);
  const [error, setError] = useState("");

  // Contribution form state
  const [contribType, setContribType] = useState("teaching");
  const [contribTitle, setContribTitle] = useState("");
  const [contribDetails, setContribDetails] = useState("");
  const [contribDate, setContribDate] = useState("");

  const notify = (msg) => {
    // plug into your toast system if you have one
    // eslint-disable-next-line no-alert
    alert(msg);
  };

  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/connexion", { replace: true });
    } catch (e) {
      console.error(e);
      notify("Erreur lors de la déconnexion.");
    }
  };

  const handleGoToAccount = () => {
    navigate("/parametres");
  };

  useEffect(() => {
    const load = async () => {
      setLoadingMe(true);
      setError("");
      try {
        const data = await fetchMe();
        setMe(data);
      } catch (e) {
        console.error(e);
        setError("Erreur lors du chargement de vos informations.");
      } finally {
        setLoadingMe(false);
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

  const disbursements = me?.disbursements || [];
  const profile = me?.profile;

  const {
    totalPaid,
    totalScheduled,
    paidPercent,
    quartersPaid,
    quartersTotal,
    nextDisbursement,
  } = useMemo(() => {
    if (!disbursements.length) {
      return {
        totalPaid: 0,
        totalScheduled: 0,
        paidPercent: 0,
        quartersPaid: 0,
        quartersTotal: 0,
        nextDisbursement: null,
      };
    }

    const total = disbursements.reduce((sum, d) => sum + (d.amount || 0), 0);
    const paid = disbursements
      .filter((d) => d.paid_at)
      .reduce((sum, d) => sum + (d.amount || 0), 0);

    const qp = disbursements.filter((d) => d.paid_at).length;
    const qt = disbursements.length;

    const unpaidSorted = [...disbursements]
      .filter((d) => !d.paid_at)
      .sort((a, b) => new Date(a.period_start) - new Date(b.period_start));

    return {
      totalPaid: paid,
      totalScheduled: total,
      paidPercent: total > 0 ? Math.round((paid / total) * 100) : 0,
      quartersPaid: qp,
      quartersTotal: qt,
      nextDisbursement: unpaidSorted[0] || null,
    };
  }, [disbursements]);

  const handleSubmitContribution = async (e) => {
    e.preventDefault();
    if (!contribDetails.trim()) {
      notify("Merci de décrire un minimum votre contribution.");
      return;
    }
    setSubmittingContrib(true);
    try {
      await createMyContribution({
        type: contribType,
        title: contribTitle || null,
        details: contribDetails,
        scheduled_at: contribDate || null,
      });
      notify("Merci ! Votre proposition de contribution a été envoyée.");
      setContribTitle("");
      setContribDetails("");
      setContribDate("");
      const updated = await fetchMyContributions();
      setContributions(updated || []);
    } catch (e) {
      console.error(e);
      notify("Erreur lors de l’envoi de votre contribution.");
    } finally {
      setSubmittingContrib(false);
    }
  };

  const fullName = me?.user?.name ?? "";
  const email = me?.user?.email ?? "";
  const uni = profile?.university ?? "Université non renseignée";
  const field = profile?.field_of_study ?? "Filière non renseignée";
  const yearNumber = profile?.year_number ?? null;
  const startYear = profile?.start_year ?? null;

  const initials =
    fullName
      ?.split(" ")
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .slice(0, 2)
      .join("") || "?";

  return (
    <div className="space-y-6">
      {/* Petite navbar / barre de compte */}
      <header className="flex items-center justify-between rounded-xl border bg-white/70 px-4 py-3 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
            {initials}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight">
              {fullName || "Boursier Takwa"}
            </span>
            <span className="text-xs text-muted-foreground">{email}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGoToAccount}
            className="flex items-center gap-1"
          >
            <KeyRound className="h-4 w-4" />
            <span className="text-xs">Modifier mon mot de passe</span>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleLogout}
            className="flex items-center gap-1"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-xs">Se déconnecter</span>
          </Button>
        </div>
      </header>

      {/* Hero / header card */}
      <Card className="relative overflow-hidden border-none bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-400 text-white">
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <div className="absolute -top-10 -right-20 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-10 -left-16 h-72 w-72 rounded-full bg-black/20 blur-3xl" />
        </div>
        <CardHeader className="relative z-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <Sparkles className="h-3 w-3" />
              <span>Communauté Boursiers Takwa</span>
            </div>
            <CardTitle className="mt-3 text-2xl font-semibold md:text-3xl">
              Bonjour, {fullName || "cher boursier"}
            </CardTitle>
            <CardDescription className="text-slate-100/80">
              Merci de représenter l&apos;établissement à l&apos;université. Ce
              tableau de bord est votre espace dédié : suivi de la bourse et
              contributions à la communauté.
            </CardDescription>
          </div>
          <div className="flex flex-col items-start gap-2 text-sm md:items-end">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              <span>{uni}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{field}</span>
            </div>
            {yearNumber && (
              <div className="inline-flex items-center gap-2 rounded-full bg-black/20 px-3 py-1 text-xs">
                <Clock className="h-3 w-3" />
                <span>
                  Année universitaire {yearNumber} • {startYear} →{" "}
                  {CURRENT_YEAR}
                </span>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium">
                Bourse reçue
              </CardTitle>
              <CardDescription className="text-xs">
                Total des versements validés
              </CardDescription>
            </div>
            <Coins className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {totalPaid.toLocaleString("fr-MA")} DH
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Sur {totalScheduled.toLocaleString("fr-MA")} DH programmés.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium">
                Tranches de bourse
              </CardTitle>
              <CardDescription className="text-xs">
                3 tranches par an universitaire
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {quartersPaid} / {quartersTotal}
            </p>
            <div className="mt-2 h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-emerald-500 transition-all"
                style={{ width: `${paidPercent}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {paidPercent}% des tranches déjà reçues.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium">
                Prochaine échéance
              </CardTitle>
              <CardDescription className="text-xs">
                Prochaine tranche planifiée
              </CardDescription>
            </div>
            <Clock className="h-5 w-5 text-indigo-500" />
          </CardHeader>
          <CardContent>
            {nextDisbursement ? (
              <>
                <p className="text-sm font-medium">
                  {nextDisbursement.period_start} →{" "}
                  {nextDisbursement.period_end}
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {nextDisbursement.amount.toLocaleString("fr-MA")} DH
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Statut :{" "}
                  <span className="font-medium text-amber-600">En attente</span>
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucune tranche en attente. Vérifiez auprès de
                l&apos;administration en cas de question.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main grid: disbursement timeline + contributions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Disbursement timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Historique des tranches de bourse</CardTitle>
            <CardDescription>
              Vision globale de toutes les tranches planifiées et payées.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingMe ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : disbursements.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun versement de bourse n&apos;est encore enregistré.
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto text-sm">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="py-2 pr-2 text-left">Période</th>
                      <th className="py-2 pr-2 text-left">Montant</th>
                      <th className="py-2 text-left">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {disbursements
                      .slice()
                      .sort(
                        (a, b) =>
                          new Date(b.period_start) - new Date(a.period_start)
                      )
                      .map((d) => {
                        const paid = !!d.paid_at;
                        const isNext =
                          nextDisbursement && nextDisbursement.id === d.id;
                        return (
                          <tr
                            key={d.id}
                            className={`border-b last:border-0 ${
                              isNext ? "bg-emerald-50/60" : ""
                            }`}
                          >
                            <td className="py-2 pr-2">
                              {d.period_start} → {d.period_end}
                            </td>
                            <td className="py-2 pr-2">
                              {d.amount.toLocaleString("fr-MA")} DH
                            </td>
                            <td className="py-2">
                              <div className="inline-flex items-center gap-1 text-xs">
                                {paid ? (
                                  <>
                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                    <span className="text-emerald-700">
                                      Payé le {d.paid_at}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-3 w-3 text-amber-500" />
                                    <span className="text-amber-700">
                                      En attente
                                    </span>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contributions zone */}
        <Card>
          <CardHeader>
            <CardTitle>Contributions à l&apos;établissement</CardTitle>
            <CardDescription>
              Proposez un atelier, un soutien, un don ou un partage
              d&apos;expérience.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmitContribution} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium">
                    Type de contribution
                  </label>
                  <Select value={contribType} onValueChange={setContribType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teaching">
                        Enseignement / cours
                      </SelectItem>
                      <SelectItem value="mentoring">
                        Mentorat / coaching
                      </SelectItem>
                      <SelectItem value="meetup">
                        Meetup / visioconférence
                      </SelectItem>
                      <SelectItem value="donation">
                        Don matériel ou financier
                      </SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">
                    Date proposée (optionnelle)
                  </label>
                  <Input
                    type="date"
                    value={contribDate}
                    onChange={(e) => setContribDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">
                  Titre (optionnel)
                </label>
                <Input
                  placeholder="Ex: Atelier Python pour les Terminales"
                  value={contribTitle}
                  onChange={(e) => setContribTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Description</label>
                <Textarea
                  placeholder="Décrivez en quelques lignes ce que vous souhaitez proposer (contenu, durée, format, public visé…)."
                  value={contribDetails}
                  onChange={(e) => setContribDetails(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={submittingContrib}>
                  {submittingContrib
                    ? "Envoi en cours…"
                    : "Envoyer ma proposition"}
                </Button>
              </div>
            </form>

            <div className="border-t pt-3">
              <p className="mb-2 text-xs font-semibold">
                Historique de vos contributions
              </p>
              {loadingContribs ? (
                <p className="text-xs text-muted-foreground">Chargement…</p>
              ) : contributions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Aucune contribution proposée pour l&apos;instant. Soyez le
                  premier à lancer un projet !
                </p>
              ) : (
                <div className="max-h-40 space-y-2 overflow-y-auto text-xs">
                  {contributions.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-md border px-2 py-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          [{c.type}] {c.title || "Contribution sans titre"}
                        </span>
                        <span
                          className={`text-[10px] uppercase tracking-wide ${
                            c.status === "approved"
                              ? "text-emerald-600"
                              : c.status === "rejected"
                              ? "text-red-600"
                              : c.status === "done"
                              ? "text-sky-600"
                              : "text-amber-600"
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>
                      {c.details && (
                        <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                          {c.details}
                        </p>
                      )}
                      {c.scheduled_at && (
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          Prévu le {c.scheduled_at}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
