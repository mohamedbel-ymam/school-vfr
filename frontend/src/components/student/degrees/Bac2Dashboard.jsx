// src/components/Student/Dashboards/Bac2Dashboard.jsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext.jsx";
import DashboardScaffold from "../DashboardScaffold.jsx";

export default function Bac2Dashboard() {
  const { setSelectedDegree } = useAuth();
  const nav = useNavigate();
  const stats = [{ title:"Séances du jour",value:6 },{ title:"Présences",value:5 },{ title:"Messages non lus",value:2 }];
  const shortcuts = [
    { label:"Ressources (SM)", onClick:()=>nav("/élève/documents") },
    { label:"Examens",         onClick:()=>nav("/élève/exams") },
    { label:"Emploi du temps", onClick:()=>nav("/élève/emploi du temps") },
  ];
  return (
    <DashboardScaffold
      title="2ème année Bac — Tableau de bord"
      images={["/images/bac1-se/1.jpg","/images/bac1-se/2.jpg","/images/bac1-se/3.jpg"]}
      stats={stats}
      shortcuts={shortcuts}
      onBack={()=>{ setSelectedDegree?.(null); nav("/élève/select-degree"); }}
    />
  );
}
