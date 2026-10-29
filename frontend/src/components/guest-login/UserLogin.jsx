// src/components/guest-login/UserLogin.jsx
import * as z from "zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import {
  Loader,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowLeft,
  ShieldCheck,
  GraduationCap,
  Users,
  Building2,
  Sparkles,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { startPathForUser } from "../../router/pahts";
import Logo from "../Logo.jsx";
import { ModeToggle } from "../mode-toggle.jsx";

/* -------------------------------------------------------------------------- */
/* Schema: email OR phone                                                     */
/* -------------------------------------------------------------------------- */
const schema = z.object({
  login: z
    .string()
    .min(3, "Veuillez saisir votre email ou numéro de téléphone")
    .refine(
      (val) =>
        /^[0-9+ ]+$/.test(val) || // phone
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), // email
      "Format d'identifiant invalide (téléphone ou email)"
    ),
  password: z.string().min(6, "Le mot de passe doit comporter au moins 6 caractères"),
});

/* -------------------------------------------------------------------------- */
/* Rate limit                                                                 */
/* -------------------------------------------------------------------------- */
const LIMIT_KEY = "takwa_login_limit_v1";
const MAX_ATTEMPTS = 5;
const LOCK_SECONDS = 60;

function loadLimitState() {
  try {
    const raw = localStorage.getItem(LIMIT_KEY);
    if (!raw) return { fails: 0, lockedUntil: 0 };
    const parsed = JSON.parse(raw);
    return {
      fails: Number(parsed?.fails ?? 0),
      lockedUntil: Number(parsed?.lockedUntil ?? 0),
    };
  } catch {
    return { fails: 0, lockedUntil: 0 };
  }
}

function saveLimitState(state) {
  try {
    localStorage.setItem(LIMIT_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export default function UserLogin() {
  const { login: loginAction, loading } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);

  // limiter state
  const [limit, setLimit] = useState(() => loadLimitState());
  const [nowTs, setNowTs] = useState(() => Date.now());

  // tick countdown while locked
  useEffect(() => {
    if (limit.lockedUntil <= Date.now()) return;
    const t = setInterval(() => setNowTs(Date.now()), 500);
    return () => clearInterval(t);
  }, [limit.lockedUntil]);

  const locked = limit.lockedUntil > nowTs;
  const secondsLeft = useMemo(() => {
    if (!locked) return 0;
    return Math.max(0, Math.ceil((limit.lockedUntil - nowTs) / 1000));
  }, [locked, limit.lockedUntil, nowTs]);

  const attemptsLeft = Math.max(0, MAX_ATTEMPTS - (limit.fails || 0));

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { login: "", password: "" },
    mode: "onTouched",
  });

  const { isSubmitting, errors } = form.formState;

  // clear root error when user types again
  useEffect(() => {
    const sub = form.watch(() => {
      if (form.formState.errors.root?.message) {
        form.clearErrors("root");
      }
    });
    return () => sub.unsubscribe();
  }, [form]);

  function lockNow() {
    const next = { fails: MAX_ATTEMPTS, lockedUntil: Date.now() + LOCK_SECONDS * 1000 };
    setLimit(next);
    saveLimitState(next);
  }

  function registerFail() {
    const currentFails = Number(limit.fails || 0) + 1;
    if (currentFails >= MAX_ATTEMPTS) {
      lockNow();
      return { locked: true, fails: MAX_ATTEMPTS };
    }
    const next = { ...limit, fails: currentFails };
    setLimit(next);
    saveLimitState(next);
    return { locked: false, fails: currentFails };
  }

  function resetLimiter() {
    const next = { fails: 0, lockedUntil: 0 };
    setLimit(next);
    saveLimitState(next);
  }

  const onSubmit = async ({ login, password }) => {
    if (locked) {
      form.setError("root", {
        type: "rate_limit",
        message: `Trop de tentatives erronées. Veuillez patienter ${secondsLeft}s.`,
      });
      return;
    }

    try {
      const user = await loginAction({ login, password });
      resetLimiter();
      navigate(startPathForUser(user), { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      const shouldCount =
        status === 401 ||
        status === 422 ||
        /identifiants|connexion|unauthorized|invalid/i.test(
          String(err?.response?.data?.message ?? "")
        );

      if (shouldCount) {
        const after = registerFail();
        if (after.locked) {
          form.setError("root", {
            type: "rate_limit",
            message: `Compte temporairement bloqué suite à des erreurs répétées. Réessayez dans ${LOCK_SECONDS}s.`,
          });
          return;
        }

        form.setError("root", {
          type: "server",
          message: `Identifiants incorrects. Il vous reste ${Math.max(
            0,
            MAX_ATTEMPTS - after.fails
          )} tentative(s).`,
        });
        return;
      }

      const apiMsg =
        err?.response?.data?.message ||
        "Impossible d'établir la connexion. Veuillez vérifier vos identifiants.";
      form.setError("root", { type: "server", message: apiMsg });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader className="size-8 animate-spin text-primary" />
          <span className="text-sm font-medium">Chargement de votre session…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden bg-background">
      {/* Soft background ambient glows */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-10 left-1/4 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-10 right-1/4 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Top bar: Back to Home + Brand */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Retour à l'accueil</span>
          </Link>
          <div className="flex items-center gap-2">
            <ModeToggle />
          </div>
        </div>

        {/* Card Header & Brand */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-slate-900 dark:bg-white/10 p-2 shadow-lg border border-slate-800/20 dark:border-white/15 mx-auto">
            <Logo />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Espace Numérique
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Portail unique pour Élèves, Parents, Enseignants et Administration
            </p>
          </div>
        </div>

        {/* Unified Card */}
        <div className="rounded-3xl border border-border bg-card/95 backdrop-blur-md p-6 sm:p-8 shadow-xl">
          {/* Quick role badges guide */}
          <div className="mb-6 p-3 rounded-2xl bg-muted/50 border border-border/70">
            <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>Accès sécurisé par profil :</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-[11px] font-medium text-center">
              <span className="px-2 py-1 rounded-lg bg-background border border-border text-foreground">Élève</span>
              <span className="px-2 py-1 rounded-lg bg-background border border-border text-foreground">Parent</span>
              <span className="px-2 py-1 rounded-lg bg-background border border-border text-foreground">Professeur</span>
              <span className="px-2 py-1 rounded-lg bg-background border border-border text-foreground">Admin</span>
            </div>
          </div>

          {/* Feedback & error alerts */}
          {errors.root?.message && (
            <div className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive flex items-start gap-2.5 animate-in fade-in-50">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="font-medium">{errors.root.message}</div>
            </div>
          )}

          {locked && (
            <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
              <Clock className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                Compte momentanément verrouillé. Prochain essai autorisé dans{" "}
                <strong className="font-mono">{secondsLeft}s</strong>.
              </div>
            </div>
          )}

          {!locked && limit.fails > 0 && (
            <div className="mb-4 text-[11px] text-muted-foreground text-center">
              Attention : il vous reste <strong className="text-foreground">{attemptsLeft}</strong> sur {MAX_ATTEMPTS} tentative(s).
            </div>
          )}

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Login Field */}
              <FormField
                name="login"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-foreground">
                      Email ou numéro de téléphone
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          {...field}
                          className="pl-10 h-11 rounded-xl bg-background border-border text-sm"
                          placeholder="ex: 0612345678 ou email@ecole.ma"
                          disabled={isSubmitting || locked}
                          autoComplete="username"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Password Field */}
              <FormField
                name="password"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-xs font-semibold text-foreground">
                        Mot de passe
                      </FormLabel>
                      {capsOn && (
                        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          Verr. Maj actif
                        </span>
                      )}
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          className="pl-10 pr-10 h-11 rounded-xl bg-background border-border text-sm"
                          placeholder="••••••••"
                          disabled={isSubmitting || locked}
                          autoComplete="current-password"
                          onKeyUp={(e) =>
                            setCapsOn(
                              e.getModifierState && e.getModifierState("CapsLock")
                            )
                          }
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          disabled={locked}
                          aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                        >
                          {showPassword ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting || locked}
                className="w-full h-11 rounded-xl font-semibold text-sm shadow-md transition-all active:scale-[0.98] mt-2"
              >
                {isSubmitting && <Loader className="mr-2 size-4 animate-spin" />}
                {locked ? `Patientez (${secondsLeft}s)` : "Ouvrir ma session"}
              </Button>

              {/* Reset attempts limiter link if locked in test */}
              {limit.fails > 0 && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      resetLimiter();
                      form.clearErrors("root");
                    }}
                    className="text-[11px] text-muted-foreground hover:underline"
                  >
                    Réinitialiser le compteur de tentatives
                  </button>
                </div>
              )}
            </form>
          </Form>
        </div>

        {/* Footer info */}
        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            Vous n'avez pas encore d'identifiant ?{" "}
            <Link to="/waiting-list" className="font-semibold text-primary hover:underline">
              Déposer une candidature
            </Link>
          </p>
          <p className="text-[11px] text-muted-foreground/70">
            © {new Date().getFullYear()} Takwa Établissement — Plateforme Scolaire Sécurisée
          </p>
        </div>
      </div>
    </div>
  );
}
