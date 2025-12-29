import * as z from "zod";
import { useState } from "react";
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
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { startPathForUser } from "../../router/pahts";

/* -------------------------------------------------------------------------- */
/* Schema                                                                     */
/* -------------------------------------------------------------------------- */
const schema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Au moins 8 caractères"),
  remember: z.boolean().optional(),
});

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */
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

  /* ------------------------------------------------------------------------ */
  /* Loading / Redirect                                                       */
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

  if (user) {
    return <Navigate to={startPathForUser(user)} replace />;
  }

  /* ------------------------------------------------------------------------ */
  /* Submit                                                                   */
  /* ------------------------------------------------------------------------ */
  const onSubmit = async ({ email, password }) => {
    try {
      const me = await login({ email, password });
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

  /* ------------------------------------------------------------------------ */
  /* UI                                                                       */
  /* ------------------------------------------------------------------------ */
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">
            Connexion
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Accédez à votre espace personnel
          </p>
        </header>

        {/* Card */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="p-6 sm:p-8">
            {/* Server error */}
            {errors.root?.message && (
              <div
                role="alert"
                className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {errors.root.message}
              </div>
            )}

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5"
              >
                {/* Email */}
                <FormField
                  name="email"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                          <Input
                            type="email"
                            placeholder="email@exemple.com"
                            autoComplete="username"
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
                        <FormLabel>Mot de passe</FormLabel>
                        {capsOn && (
                          <span className="text-xs text-amber-600">
                            Verr. Maj activé
                          </span>
                        )}
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            disabled={isSubmitting}
                            aria-invalid={!!errors.password}
                            className="pl-9 pr-10"
                            onKeyUp={(e) =>
                              setCapsOn(
                                e.getModifierState &&
                                  e.getModifierState("CapsLock")
                              )
                            }
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
                            aria-label={
                              showPassword
                                ? "Masquer le mot de passe"
                                : "Afficher le mot de passe"
                            }
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Remember + Forgot */}
                <div className="flex items-center justify-between">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      {...form.register("remember")}
                      disabled={isSubmitting}
                    />
                    Se souvenir de moi
                  </label>

                  <a
                    href="/mot-de-passe-oublie"
                    className="text-sm text-slate-700 hover:underline"
                  >
                    Mot de passe oublié ?
                  </a>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-slate-800 hover:bg-slate-700"
                >
                  {isSubmitting && (
                    <Loader className="mr-2 size-4 animate-spin" />
                  )}
                  Se connecter
                </Button>

                <p className="text-center text-xs text-slate-500">
                  Accès réservé aux utilisateurs autorisés.
                </p>
              </form>
            </Form>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} — Takwa Établissement
        </p>
      </div>
    </div>
  );
}
