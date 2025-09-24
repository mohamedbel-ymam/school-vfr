import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import AccountApi from "../../services/api/AccountApi.js";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";

import { Card, CardContent } from "../../components/ui/card.tsx";
import { Button } from "../../components/ui/button.tsx";
import { Input } from "../../components/ui/input.tsx";
import { Label } from "../../components/ui/label.tsx";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "../../components/ui/form.tsx";
import { useToast } from "../../components/ui/use-toast.js";

const schema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    password: z.string().min(8, "New password must be at least 8 characters"),
    password_confirmation: z
      .string()
      .min(1, "Please confirm your new password"),
  })
  .refine((vals) => vals.password === vals.password_confirmation, {
    message: "Passwords do not match",
    path: ["password_confirmation"],
  });

export default function AccountSettings() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [submitting, setSubmitting] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");   // success banner text
  const [errorMsg, setErrorMsg] = useState("");   // error banner text

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      current_password: "",
      password: "",
      password_confirmation: "",
    },
  });

  const onSubmit = async (values) => {
    setSubmitting(true);
    setSavedMsg("");
    setErrorMsg("");

    try {
      const res = await AccountApi.changePassword(values);
      const msg = res?.data?.message || "Mot de passe updated ✅";
      setSavedMsg(msg);                   // inline banner
      toast({ title: msg });              // toast (if Toaster is mounted)
      form.reset();
      // auto-hide success banner after 3s (optional)
      setTimeout(() => setSavedMsg(""), 3000);
    } catch (err) {
      // Prefer field-level errors if present
      const status = err?.response?.status;
      const data = err?.response?.data;

      if (status === 422 && data?.errors) {
        Object.entries(data.errors).forEach(([field, messages]) => {
          const message = Array.isArray(messages) ? messages[0] : String(messages);
          form.setError(field, { message });
        });
        setErrorMsg("Please fix the highlighted fields.");
        toast({ title: "Validation error", description: "Check your inputs." });
      } else {
        const msg = data?.message || "Unable to update password";
        setErrorMsg(msg);
        toast({ title: "Error", description: msg });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold mb-4">Account settings</h1>

      {/* Inline success / error banners */}
      {savedMsg ? (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800"
        >
          {savedMsg}
        </div>
      ) : null}
      {errorMsg ? (
        <div
          role="alert"
          className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {errorMsg}
        </div>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>User</Label>
                <div className="text-sm text-muted-foreground">
                  {user?.firstname} {user?.lastname} ({user?.role})
                </div>
              </div>

              <FormField
                name="current_password"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="current-password"
                        {...field}
                      />
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
                    <FormLabel>New password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="password_confirmation"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm new password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Saving…" : "Enregistrer changes"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
