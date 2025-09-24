import { Link } from "react-router-dom";

export default function Notfound() {
  return (
    <main className="min-h-[60vh] grid place-items-center px-6 py-16 text-center">
      <div>
        <h1 className="text-5xl font-bold tracking-tight">404</h1>
        <p className="mt-2 text-muted-foreground">Page introuvable.</p>

        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            ← Retour à l’accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
