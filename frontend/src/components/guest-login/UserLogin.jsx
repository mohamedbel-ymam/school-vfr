// src/components/auth/UserLogin.jsx
import * as z from "zod";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "../ui/form.js";
import { Input } from "../ui/input.js";
import { Button } from "../ui/button.js";
import { Loader, Eye, EyeOff, Mail, Lock } from "lucide-react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { startPathForUser } from "../../router/index.jsx";

// ──────────────────────────────────────────────────────────────────────────────
// Schema
// ──────────────────────────────────────────────────────────────────────────────
const schema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Au moins 8 caractères"),
  remember: z.boolean().optional(),
});

export default function UserLogin() {
  
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
    mode: "onTouched",
  });

  // While bootstrapping session
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-white to-slate-50 dark:from-slate-950 dark:to-slate-900">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <Loader className="size-5 animate-spin" />
          <span>Chargement…</span>
        </div>
      </div>
    );
  }

  // If already logged in, route them away from /connexion with role priority
  if (user) {
    return <Navigate to={startPathForUser(user)} replace />;
  }

  const onSubmit = async ({ email, password }) => {
    try {
      const me = await login({ email, password }); // normalized with roles[]
      navigate(startPathForUser(me), { replace: true });
    } catch (err) {
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Échec de connexion. Vérifiez vos identifiants.";
      form.setError("root", { type: "server", message: apiMsg });
    }
  };

  const { isSubmitting, errors } = form.formState;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white to-slate-50 dark:from-slate-950 dark:to-slate-900">
      {/* Responsive shell with decorative header */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">
            Bienvenue
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-500 dark:text-slate-400">
            Connectez-vous pour accéder à votre espace.
          </p>
        </header>

        {/* Centered card */}
        <div className="mx-auto w-full max-w-md">
          <div
            className="
              rounded-2xl border border-slate-200/60 bg-white/70 shadow-xl backdrop-blur
              dark:border-slate-800/80 dark:bg-slate-900/60
            "
          >
            {/* Accent top bar */}
            <div className="h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500" />

            <div className="p-6 sm:p-8">
              {/* Server error banner */}
              {form.formState.errors.root?.message && (
                <div
                  className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300"
                  role="alert"
                  aria-live="polite"
                >
                  {form.formState.errors.root.message}
                </div>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  {/* Email */}
                  <FormField
                    name="email"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 dark:text-slate-200">Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                            <Input
                              type="email"
                              inputMode="email"
                              placeholder="email@exemple.com"
                              autoComplete="username"
                              autoFocus
                              disabled={isSubmitting}
                              aria-invalid={!!errors.email}
                              className="pl-9"
                              {...field}
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
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-slate-700 dark:text-slate-200">Mot de passe</FormLabel>
                          {capsOn && (
                            <span className="text-xs text-amber-600 dark:text-amber-400">
                              Verr. Maj activé
                            </span>
                          )}
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              autoComplete="current-password"
                              disabled={isSubmitting}
                              aria-invalid={!!errors.password}
                              className="pl-9 pr-10"
                              onKeyUp={(e) =>
                                setCapsOn(
                                  e.getModifierState && e.getModifierState("CapsLock")
                                )
                              }
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((v) => !v)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:text-slate-400 dark:hover:text-slate-200 dark:focus:ring-slate-600"
                              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                              tabIndex={-1}
                            >
                              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Remember + Forgot */}
                  <div className="flex items-center justify-between gap-3">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 dark:border-slate-600"
                        {...form.register("remember")}
                        disabled={isSubmitting}
                      />
                      Se souvenir de moi
                    </label>

                    <a
                      href="/mot-de-passe-oublie"
                      className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      Mot de passe oublié ?
                    </a>
                  </div>

                  {/* Submit */}
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="
                      w-full select-none
                      bg-gradient-to-r from-indigo-600 to-sky-600
                      hover:from-indigo-500 hover:to-sky-500
                      dark:from-indigo-500 dark:to-sky-500
                    "
                  >
                    {isSubmitting && <Loader className="mr-2 size-4 animate-spin" />}
                    Se connecter
                  </Button>

                  {/* Subtext */}
                  <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                    Accès réservé aux utilisateurs autorisés.
                  </p>
                </form>
              </Form>
            </div>
          </div>

          {/* Footer brand / legal */}
          <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
            © {new Date().getFullYear()} — TAKWA ETABLISSEMENT
          </p>
        </div>
      </div>
    </div>
  );
}
