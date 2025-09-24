// src/components/Student/DegreeSelector.jsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { DEGREES, DEGREE_ROUTE_BY_SLUG } from "../../../constants/degrees";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";

export default function DegreeSelector() {
  const nav = useNavigate();
  const { setSelectedDegree } = useAuth();

  const onSelect = (slug) => {
    setSelectedDegree?.(slug); // prod: vérifier autorisation serveur
    nav(DEGREE_ROUTE_BY_SLUG[slug]);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {DEGREES.map((d) => (
        <Card key={d.slug} className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{d.label}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Button variant="secondary" onClick={() => onSelect(d.slug)}>
              Accéder
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
