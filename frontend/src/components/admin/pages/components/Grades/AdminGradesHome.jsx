import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../../components/ui/card";
import { Button } from "../../../../../components/ui/button";

export default function AdminGradesHome() {
  const nav = useNavigate();

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Notes — Administration</h1>
        <p className="text-sm text-muted-foreground">
          Attribuer des notes ou consulter les résultats par degré.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Attribution */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">➕ Attribution des notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Choisissez un degré, puis un élève, et ajoutez / modifiez / supprimez des notes.
            </p>
            <Button onClick={() => nav("/admin/notes/attribution")}>
              Commencer
            </Button>
          </CardContent>
        </Card>

        {/* Résultats */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">📊 Résultats des notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Classement par degré (moyenne générale sur 20).
            </p>
            <Button variant="secondary" onClick={() => nav("/admin/notes/resultats")}>
              Voir les résultats
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
