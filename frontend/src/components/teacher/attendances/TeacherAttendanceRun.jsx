import React from "react";
import { Navigate } from "react-router-dom";

/**
 * Ancienne méthode unitaire d'appel ("Reels / Swipe call") - OBSOLÉTÉE
 * Remplacée par le module officiel d'émargement hebdomadaire papier scanné.
 */
export default function TeacherAttendanceRun() {
  return <Navigate to="/enseignant/attendance" replace />;
}
