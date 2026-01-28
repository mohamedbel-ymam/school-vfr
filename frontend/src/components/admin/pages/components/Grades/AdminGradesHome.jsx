import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../../components/ui/card";
import { Button } from "../../../../../components/ui/button";
import { Separator } from "../../../../../components/ui/separator";
import { ClipboardEdit, Trophy } from "lucide-react";

function ActionCard({ icon, title, desc, cta, onClick, variant = "default" }) {
  return (
    <Card className="rounded-2xl hover:shadow-sm transition">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl border grid place-items-center bg-white/60 dark:bg-slate-900/40">
              {icon}
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <div className="text-xs text-muted-foreground mt-1">{desc}</div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <Separator className="mb-3" />
        <Button variant={variant} className="rounded-xl" onClick={onClick}>
          {cta}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AdminGradesHome() {
  const nav = useNavigate();

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Notes</h1>
          <p className="text-sm text-muted-foreground">
            Gérez l’attribution des notes et consultez les classements par degré.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ActionCard
          icon={<ClipboardEdit className="h-5 w-5" />}
          title="Attribution des notes"
          desc="Ajoutez, modifiez ou supprimez les notes d’un élève."
          cta="Attribuer des notes"
          onClick={() => nav("/admin/notes/attribution")}
        />

        <ActionCard
          icon={<Trophy className="h-5 w-5" />}
          title="Résultats et classement"
          desc="Affiche la moyenne générale sur 20, du meilleur au moins bon."
          cta="Voir les résultats"
          variant="secondary"
          onClick={() => nav("/admin/notes/resultats")}
        />
      </div>
    </div>
  );
}
