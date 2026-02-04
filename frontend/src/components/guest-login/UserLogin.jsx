// src/components/auth/UserLogin.jsx
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
import { Loader, Eye, EyeOff, Mail, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { startPathForUser } from "../../router/pahts";

/* -------------------------------------------------------------------------- */
/* Schema: email OR phone                                                     */
/* -------------------------------------------------------------------------- */
const schema = z.object({
  login: z
    .string()
    .min(3, "Email ou numéro invalide")
    .refine(
      (val) =>
        /^[0-9+ ]+$/.test(val) || // phone
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), // email
      "Email ou numéro de téléphone invalide"
    ),
  password: z.string().min(8, "Au moins 8 caractères"),
});

/* -------------------------------------------------------------------------- */
/* Simple front-only rate limit                                               */
/* - blocks after N failed attempts                                           */
/* - cooldown with countdown                                                  */
/* - persisted in localStorage                                                */
/* -------------------------------------------------------------------------- */
const LIMIT_KEY = "takwa_login_limit_v1";
const MAX_ATTEMPTS = 5;
const LOCK_SECONDS = 60; // 1 minute

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Helpers                                                                  */
  /* ------------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------------ */
  /* Submit                                                                   */
  /* ------------------------------------------------------------------------ */
  const onSubmit = async ({ login, password }) => {
    if (locked) {
      form.setError("root", {
        type: "rate_limit",
        message: `Trop de tentatives. Réessayez dans ${secondsLeft}s.`,
      });
      return;
    }

    try {
      const user = await loginAction({ login, password });

      // ✅ success => reset limiter
      resetLimiter();

      navigate(startPathForUser(user), { replace: true });
    } catch (err) {
      const status = err?.response?.status;

      // Count only real auth failures (401/422). Ignore network/500.
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
            message: `Trop de tentatives. Réessayez dans ${LOCK_SECONDS}s.`,
          });
          return;
        }

        form.setError("root", {
          type: "server",
          message: `Échec de connexion. Il vous reste ${Math.max(
            0,
            MAX_ATTEMPTS - after.fails
          )} tentative(s).`,
        });
        return;
      }

      // generic
      const apiMsg =
        err?.response?.data?.message ||
        "Échec de connexion. Vérifiez vos identifiants.";
      form.setError("root", { type: "server", message: apiMsg });
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Loading                                                                  */
  /* ------------------------------------------------------------------------ */
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="flex items-center gap-2 text-slate-600">
          <Loader className="size-5 animate-spin" />
          <span>Chargement…</span>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* UI                                                                       */
  /* ------------------------------------------------------------------------ */
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Connexion</h1>
          <p className="mt-1 text-sm text-slate-600">
            Email ou numéro de téléphone
          </p>
        </header>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="p-6 sm:p-8">
            {errors.root?.message && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errors.root.message}
              </div>
            )}

            {locked && (
              <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Trop de tentatives. Réessayez dans <b>{secondsLeft}s</b>.
              </div>
            )}

            {!locked && limit.fails > 0 && (
              <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                Tentatives restantes: <b>{attemptsLeft}</b> / {MAX_ATTEMPTS}
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* Login */}
                <FormField
                  name="login"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email ou téléphone</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                          <Input
                            {...field}
                            className="pl-9"
                            placeholder="email@exemple.com ou 06xxxxxxxx"
                            disabled={isSubmitting || locked}
                            autoComplete="username"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password */}
                <FormField
                  name="password"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mot de passe</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            className="pl-9 pr-10"
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
                            className="absolute right-2.5 top-1/2 -translate-y-1/2"
                            disabled={locked}
                            aria-label={showPassword ? "Masquer" : "Afficher"}
                          >
                            {showPassword ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      {capsOn && (
                        <p className="text-xs text-amber-600 mt-1">Verr. Maj activé</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isSubmitting || locked}
                  className="w-full bg-slate-800 hover:bg-slate-700"
                >
                  {isSubmitting && <Loader className="mr-2 size-4 animate-spin" />}
                  {locked ? `Bloqué (${secondsLeft}s)` : "Se connecter"}
                </Button>

                {/* Optional: allow admin/dev to reset limiter quickly */}
                {limit.fails > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      resetLimiter();
                      form.clearErrors("root");
                    }}
                    className="w-full text-xs text-slate-500 underline"
                  >
                    Réinitialiser le compteur (local)
                  </button>
                )}
              </form>
            </Form>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} — Takwa Établissement
        </p>
      </div>
    </div>
  );
}
