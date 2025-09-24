import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "../ui/form.js";
import { Input } from "../ui/input.js";
import { Button } from "../ui/button.js";
import { Loader } from "lucide-react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { startPathForUser } from "../../router/index.jsx";

const schema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Au moins 8 caractères"),
});

export default function UserLogin() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "email@exemple.com",
      password: "********",
    },
  });

  // While bootstrapping session
  if (loading) return <div>Chargement…</div>;

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

  const { isSubmitting } = form.formState;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-sm mx-auto space-y-4">
        {form.formState.errors.root?.message && (
          <div className="text-sm text-red-500">{form.formState.errors.root.message}</div>
        )}

        <FormField
          name="email"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} autoComplete="username" disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="password"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mot de passe</FormLabel>
              <FormControl>
                <Input type="password" {...field} autoComplete="current-password" disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting && <Loader className="mr-2 animate-spin" />}
          Se connecter
        </Button>
      </form>
    </Form>
  );
}
