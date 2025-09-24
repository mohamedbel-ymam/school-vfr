// src/components/Student/Dashboards/TroncCommunDashboard.jsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext.jsx";
import DashboardScaffold from "../DashboardScaffold.jsx";

export default function TroncCommunDashboard() {
  const { setSelectedDegree } = useAuth();
  const nav = useNavigate();
  const stats = [{ title:"Séances du jour",value:4 },{ title:"Présences",value:3 },{ title:"Messages non lus",value:2 }];
  const shortcuts = [
    { label:"Ressources (SM)", onClick:()=>nav("/élève/documents") },
    { label:"Examens",         onClick:()=>nav("/élève/exams") },
    { label:"Emploi du temps", onClick:()=>nav("/élève/emploi du temps") },
  ];
  return (
    <DashboardScaffold
      title="Tronc Commun — Tableau de bord"
      images={["/images/bac1-se/1.jpg","/images/bac1-se/2.jpg","/images/bac1-se/3.jpg"]}
      stats={stats}
      shortcuts={shortcuts}
      onBack={()=>{ setSelectedDegree?.(null); nav("/élève/select-degree"); }}
    />
  );
}
