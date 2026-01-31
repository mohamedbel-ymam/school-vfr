import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../../../../../components/ui/card";
import { Button } from "../../../../../components/ui/button";
import { Users, Shield, GraduationCap, UserCog } from "lucide-react";

function Tile({ title, desc, icon, to }) {
  const nav = useNavigate();
  return (
    <Card className="rounded-2xl hover:shadow-sm transition">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl border bg-slate-50 grid place-items-center">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{title}</div>
            <div className="text-sm text-muted-foreground">{desc}</div>
          </div>
        </div>
        <Button className="rounded-xl w-full" variant="secondary" onClick={() => nav(to)}>
          Ouvrir
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AdminSettingsHub() {
  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Paramètres</h1>
        <p className="text-sm text-muted-foreground">
          Gestion du compte et des validations.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile
          title="Élèves"
          desc="Validation des photos (avatars)"
          icon={<GraduationCap className="h-5 w-5" />}
          to="/admin/parametres/eleves"
        />
        <Tile
          title="Enseignants"
          desc="(bientôt) paramètres enseignants"
          icon={<Users className="h-5 w-5" />}
          to="/admin/parametres/enseignants"
        />
        <Tile
          title="Parents"
          desc="(bientôt) paramètres parents"
          icon={<Users className="h-5 w-5" />}
          to="/admin/parametres/parents"
        />
        <Tile
          title="Admins"
          desc="Mot de passe & sécurité"
          icon={<Shield className="h-5 w-5" />}
          to="/admin/parametres/admins"
        />
      </div>
    </div>
  );
}
