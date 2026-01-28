import { createBrowserRouter, Navigate } from "react-router-dom";
import { RequireAuth, RequireRole, GuestOnly } from "./guards";

/* ===================== PAGES ===================== */
import Home from "@/pages/Home.jsx";
import Notfound from "@/pages/Notfound.jsx";
import Login from "@/pages/Login.jsx";
import Unauthorized from "@/pages/Unauthorized.jsx";
import PublicWaitingList from "@/pages/PublicWaitingList.jsx";
import NotYet from "@/pages/NotYet.jsx";

/* ===================== LAYOUTS ===================== */
import Layout from "@/layouts/Layout.jsx";
import GuestLayout from "@/layouts/GeustLayout.jsx";
import StudentDashboardLayout from "@/layouts/StudentDashboardLayout.jsx";
import AdminDashboardLayout from "@/layouts/AdminDashboardLayout.jsx";
import TeacherDashboardLayout from "@/layouts/TeacherDashboardLayout.jsx";
import ParentDashboardLayout from "@/layouts/ParentDashboardLayout.jsx";

/* ===================== SETTINGS ===================== */
import AccountSettings from "@/components/settings/Account.jsx";

/* ===================== STUDENT ===================== */
import StudentDashboard from "@/components/student/StudentDashboard.jsx";
import StudentTimetable from "@/components/student/StudentTimeTable.jsx";
import StudentEvents from "@/components/student/StudentEvents.jsx";
import StudentDocuments from "@/components/student/StudentDocuments.jsx";
import StudentDevoirs from "@/components/student/StudentDevoirs.jsx";
/* Student rating & grades*/
import StudentNotesPage from "@/components/student/StudentNotesPage";
import StudentDisciplinePage from "@/components/student/StudentDisciplinePage"; 

/* Student tests */
import StudentTestsList from "@/components/student/tests/StudentTestsList.jsx";
import StartTest from "@/components/student/tests/StartTest.jsx";
import TestScreen from "@/components/student/tests/TestScreen.jsx";
import TestResult from "@/components/student/tests/TestResult.jsx";

/* ===================== TEACHER ===================== */
import TeacherDashboard from "@/components/teacher/TeacherDashboard.jsx";
import TeacherTimetable from "@/components/teacher/TeacherTimeTable.jsx";
import TeacherEvents from "@/components/teacher/TeacherEvents.jsx";
import TeacherDocuments from "@/components/teacher/TeacherDocuments.jsx";
import TeacherDevoirs from "@/components/teacher/TeacherDevoirs.jsx";
import TeacherGradesDashboard from "@/components/teacher/grades/TeacherGradesDashboard.jsx";
import TeacherDisciplineDashboard from "@/components/teacher/rates/TeacherDisciplineDashboard.jsx";

/* Teacher tests */
import TeacherTestsList from "@/components/teacher/tests/TeacherTestsList.jsx";
import CreateTestForm from "@/components/teacher/tests/CreateTestForm.jsx";
import AddQuestions from "@/components/teacher/tests/AddQuestions.jsx";
import AssignStudents from "@/components/teacher/tests/AssignStudents.jsx";
import ReviewAndActivate from "@/components/teacher/tests/ReviewAndActivate.jsx";
import TestResults from "@/components/teacher/tests/TestResults.jsx";

/* ===================== PARENT ===================== */
import ParentDashboard from "@/components/parent/ParentDashboard.jsx";
import ParentOverview from "@/components/parent/ParentOveriew.jsx";
import ParentEvents from "@/components/parent/ParentEvents.jsx";
import ParentTimetable from "@/components/parent/ParentTimeTable.jsx";

/* ===================== ADMIN ===================== */
import AdminDashboard from "@/components/admin/pages/AdminDashboard.jsx";
import ManageParents from "@/components/admin/pages/ManageParents.jsx";
import ManageStudents from "@/components/admin/pages/ManageStudents.jsx";
import ManageTeachers from "@/components/admin/pages/ManageTeachers.jsx";
import ManageBoursier from "@/components/admin/pages/ManageBoursiers.jsx";
import ManageTimetables from "@/components/admin/pages/ManageTimeTables.jsx";
import ManageEvents from "@/components/admin/pages/ManageEvents.jsx";
import ManageGroups from "@/components/admin/pages/ManageGroups.jsx";
import ManageWaitingList from "@/components/admin/pages/ManageWaitingList.jsx";
import ManageMonthlyPlans from "@/components/admin/pages/ManageMonthlyPlans.jsx";
import ManagePresence from "@/components/admin/pages/ManagePresence.jsx";
import AdminDocuments from "@/components/admin/pages/AdminDocuments.jsx";
import AdminDevoirs from "@/components/admin/pages/AdminDevoirs.jsx";
import SendNotification from "@/components/admin/pages/SendNotification.jsx";
import AdminsPage from "@/components/admin/pages/AdminsPage.jsx";
import AdminDisciplineDashboard from "@/components/admin/pages/AdminDisciplineDashboard";
import AdminGradesHome from "../components/admin/pages/components/Grades/AdminGradesHome";
import AdminGradesDegrees from "../components/admin/pages/components/Grades/AdminGradesDegree";
import AdminGradesAttributionDegree from "../components/admin/pages/components/Grades/AdminGradesAttributionDegree";
import AdminGradesResultsDegree from "../components/admin/pages/components/Grades/AdminGradesResultsDegree";
/* Admin tests */
import AdminTestsList from "@/components/admin/pages/AdminTestsList.jsx";
import AdminTestDetails from "@/components/admin/pages/AdminTestsDetails.jsx";

/* ===================== BOURSIER ===================== */
import BoursierDashboard from "@/components/boursier/BoursierDashboard.jsx";

/* ===================== CONSTANT ===================== */
export const LOGIN_ROUTE = "/connexion";

/* ===================== ROUTER ===================== */

export const router = createBrowserRouter([
  /* ---------- PUBLIC ---------- */
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/unauthorized", element: <Unauthorized /> },
      { path: "*", element: <Notfound /> },
    ],
  },

  /* ---------- GUEST ONLY ---------- */
  {
    element:<GuestLayout />,
      
    children: [
      { path: LOGIN_ROUTE, element: <Login /> },
      { path: "/waiting-list", element: <PublicWaitingList /> },
    ],
  },

  /* ---------- STUDENT ---------- */
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireRole roles={["student"]} />,
        children: [
          {
            path: "/élève",
            element: <StudentDashboardLayout />,
            children: [
              { index: true, element: <Navigate to="tableau de bord" replace /> },
              { path: "tableau de bord", element: <StudentDashboard /> },
              { path: "tableau de bord/:degree", element: <StudentDashboard /> },
              { path: "emploi du temps", element: <StudentTimetable /> },
              { path: "événements", element: <StudentEvents /> },
              { path: "documents", element: <StudentDocuments /> },
              { path: "devoirs", element: <StudentDevoirs /> },
              { path: "paramètres", element: <AccountSettings /> },
              { path: "notes", element: <StudentNotesPage /> },
              { path: "discipline", element: <StudentDisciplinePage /> },

              {
                path: "tests",
                children: [
                  { index: true, element: <StudentTestsList /> },
                  { path: ":id/start", element: <StartTest /> },
                  { path: "attempt/:id", element: <TestScreen /> },
                  { path: "resultat/:id", element: <TestResult /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  /* ---------- TEACHER ---------- */
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireRole roles={["teacher", "admin"]} />,
        children: [
          {
            path: "/enseignant",
            element: <TeacherDashboardLayout />,
            children: [
              { index: true, element: <Navigate to="tableau de bord" replace /> },
              { path: "tableau de bord", element: <TeacherDashboard /> },
              { path: "emploi du temps", element: <TeacherTimetable /> },
              { path: "événements", element: <TeacherEvents /> },
              { path: "documents", element: <TeacherDocuments /> },
              { path: "devoirs", element: <TeacherDevoirs /> },
              { path: "paramètres", element: <AccountSettings /> },

              { path: "tests", element: <TeacherTestsList /> },
              { path: "tests/create", element: <CreateTestForm /> },
              { path: "tests/:id/questions", element: <AddQuestions /> },
              { path: "tests/:id/assign", element: <AssignStudents /> },
              { path: "tests/:id/review", element: <ReviewAndActivate /> },
              { path: "tests/:id/results", element: <TestResults /> },
              { path: "notes", element: <TeacherGradesDashboard /> },
              { path: "discipline", element: <TeacherDisciplineDashboard /> },
            ],
          },
        ],
      },
    ],
  },

  /* ---------- ADMIN ---------- */
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireRole roles={["admin"]} />,
        children: [
          {
            path: "/admin",
            element: <AdminDashboardLayout />,
            children: [
              { path: "tableau de bord", element: <AdminDashboard /> },
              { path: "admins", element: <AdminsPage /> },
              { path: "manage-parents", element: <ManageParents /> },
              { path: "manage-élèves", element: <ManageStudents /> },
              { path: "manage-enseignants", element: <ManageTeachers /> },
              { path: "manage-boursiers", element: <ManageBoursier /> },
              { path: "manage-timetables", element: <ManageTimetables /> },
              { path: "manage-événements", element: <ManageEvents /> },
              { path: "groupes", element: <ManageGroups /> },
              { path: "plans", element: <ManageMonthlyPlans /> },
              { path: "waiting-list", element: <ManageWaitingList /> },
              { path: "documents", element: <AdminDocuments /> },
              { path: "devoirs", element: <AdminDevoirs /> },
              { path: "presences", element: <ManagePresence /> },
              { path: "notifications", element: <SendNotification /> },
              { path: "paramètres", element: <AccountSettings /> },
              { path: "tests", element: <AdminTestsList /> },
              { path: "tests/:id", element: <AdminTestDetails /> },
              // Notes / Admin
{
  path: "/notes",
  element: <AdminGradesHome />,
},
{
  path: "notes/attribution",
  element: <AdminGradesDegrees />,
},
{
  path: "notes/resultats",
  element: <AdminGradesDegrees />,
},
{
  path: "notes/attribution/:degreeId",
  element: <AdminGradesAttributionDegree />,
},
{
  path: "notes/resultats/:degreeId",
  element: <AdminGradesResultsDegree />,},
              { path: "discipline", element: <AdminDisciplineDashboard /> }

            ],
          },
        ],
      },
    ],
  },

  /* ---------- PARENT ---------- */
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireRole roles={["parent"]} />,
        children: [
          {
            path: "/parent",
            element: <ParentDashboardLayout />,
            children: [
              { index: true, element: <ParentOverview /> },
              { path: "tableau de bord", element: <ParentDashboard /> },
              { path: "événements", element: <ParentEvents /> },
              { path: "emploi du temps", element: <ParentTimetable /> },
              { path: "paramètres", element: <AccountSettings /> },
              //{path: "notes",element: <ParentGradesDashboard />},
              //{ path: "discipline", element: <ParentDisciplineDashboard /> },
            ],
          },
        ],
      },
    ],
  },

  /* ---------- BOURSIER ---------- */
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireRole roles={["boursier"]} />,
        children: [
          {
            path: "/boursier",
            element: <BoursierDashboard />,
            children: [
              { path: "paramètres", element: <AccountSettings /> },
            ],
          },
        ],
      },
    ],
  },
]);

export default router;
