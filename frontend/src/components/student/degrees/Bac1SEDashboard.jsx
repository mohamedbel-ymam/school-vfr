// src/components/Student/Dashboards/Bac1SEDashboard.jsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext.jsx";
import DashboardScaffold from "../DashboardScaffold.jsx";

export default function Bac1SEDashboard() {
  const { setSelectedDegree } = useAuth();
  const nav = useNavigate();
  const stats = [{ title:"Séances du jour",value:5 },{ title:"Présences",value:4 },{ title:"Nouveaux messages",value:1 }];
  const shortcuts = [
    { label:"Ressources (SM)", onClick:()=>nav("/élève/documents") },
    { label:"Examens",         onClick:()=>nav("/élève/exams") },
    { label:"Emploi du temps", onClick:()=>nav("/élève/emploi du temps") },
  ];
  return (
    <DashboardScaffold
      title="1er année Bac (SE) — Tableau de bord"
      images={["/images/bac1-se/1.jpg","/images/bac1-se/2.jpg","/images/bac1-se/3.jpg"]}
      stats={stats}
      shortcuts={shortcuts}
      onBack={()=>{ setSelectedDegree?.(null); nav("/élève/select-degree"); }}
    />
  );
}
