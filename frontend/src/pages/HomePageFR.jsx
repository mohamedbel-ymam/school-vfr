import React from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Shield,
  Users,
  Building2,
  Sparkles,
  ChevronRight,
  CalendarDays,
  QrCode,
  MessageSquare,
  BellRing,
  FileText,
} from "lucide-react";

/* ================= DESIGN TOKENS ================= */
const cn = (...c) => c.filter(Boolean).join(" ");

const tokens = {
  card:
    "rounded-2xl bg-white/70 backdrop-blur shadow-[0_12px_40px_rgba(0,0,0,.08)] ring-1 ring-black/5",
  section: "py-16 sm:py-20",
  title:
    "text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight",
  subtitle: "mt-4 text-slate-600 max-w-2xl",
};

/* ================= IMAGES ================= */
const imgs = {
  hero: "/Img/jokerInit.jpg",
  bourse: "/Img/bourse.jpg",
  forumOrientation: "/Img/forum-orientation.jpg",
  forumCoach: "/Img/forum-coach.jpg",
  enseignants: "/Img/enseignant-éleve.jpg",
  enseignants2: "/Img/enseignant-etudiants.jpg",
  info1: "/Img/info-1.jpeg",
  info2: "/Img/info-2.jpeg",
};

/* ================= LAYOUT ================= */
const Container = ({ children }) => (
  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
);

const Section = ({ id, children }) => (
  <section id={id} className={tokens.section}>
    <Container>{children}</Container>
  </section>
);

/* ================= HERO ================= */
const Hero = () => (
  <section className="relative overflow-hidden pt-10 pb-20">
    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-sky-500/10 to-emerald-500/10" />

    <Container>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative">
        {/* TEXT */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-7"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-600/10 px-4 py-1 text-xs font-semibold text-indigo-600">
            <Sparkles className="h-4 w-4" />
            Éducation gratuite & exigeante
          </span>

          <h1 className="mt-6 text-4xl sm:text-5xl font-extrabold text-slate-900">
            Former aujourd’hui, <br />
            <span className="text-indigo-600">réussir demain</span>
          </h1>

          <p className="mt-6 text-slate-600 max-w-xl text-lg">
            Takwa accompagne les élèves du collège jusqu’à l’université
            grâce à un enseignement rigoureux, un suivi humain
            et une bourse d’excellence pour les meilleurs.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="/connexion"
              className="rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-700"
            >
              Accéder à mon espace
            </a>
            <a
              href="#programmes"
              className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Découvrir Takwa
            </a>
          </div>
        </motion.div>

        {/* IMAGE */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="lg:col-span-5"
        >
          <img
            src={imgs.hero}
            alt="Élèves Takwa"
            className="rounded-2xl shadow-xl object-cover h-[420px] w-full"
          />
        </motion.div>
      </div>
    </Container>
  </section>
);

/* ================= PROGRAMMES ================= */
const Programmes = () => (
  <Section id="programmes">
    <div className="text-center">
      <h2 className={tokens.title}>Nos programmes</h2>
      <p className={tokens.subtitle}>
        Un enseignement structuré, orienté résultats et progression durable.
      </p>
    </div>

    <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {[
        "Mathématiques",
        "Physique – Chimie",
        "Langues",
        "Informatique",
      ].map((title) => (
        <div key={title} className={cn(tokens.card, "p-6")}>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="mt-2 text-sm text-slate-600">
            Méthodes, raisonnement, entraînement ciblé.
          </p>
        </div>
      ))}
    </div>
  </Section>
);

/* ================= PLATEFORME ================= */
const Plateforme = () => (
  <Section id="plateforme">
    <div className="text-center">
      <h2 className={tokens.title}>Une plateforme moderne</h2>
      <p className={tokens.subtitle}>
        Un espace sécurisé pour chaque acteur de l’établissement.
      </p>
    </div>

    <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <Feature icon={CalendarDays} title="Emplois du temps" />
      <Feature icon={QrCode} title="Présence QR" />
      <Feature icon={MessageSquare} title="Messagerie" />
      <Feature icon={FileText} title="Évaluations" />
      <Feature icon={BellRing} title="Événements" />
      <Feature icon={Shield} title="Sécurité par rôles" />
    </div>
  </Section>
);

const Feature = ({ icon: Icon, title }) => (
  <div className={cn(tokens.card, "p-6 flex gap-4 items-start")}>
    <Icon className="h-6 w-6 text-indigo-600" />
    <div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-slate-600 mt-1">
        Gestion claire et centralisée.
      </p>
    </div>
  </div>
);

/* ================= ROLES ================= */
const Roles = () => (
  <Section id="roles">
    <div className="text-center">
      <h2 className={tokens.title}>Un espace pour chacun</h2>
      <p className={tokens.subtitle}>
        Chaque rôle dispose d’outils adaptés à ses besoins.
      </p>
    </div>

    <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <Role icon={Shield} title="Admin" />
      <Role icon={Building2} title="Professeurs" />
      <Role icon={GraduationCap} title="Élèves" />
      <Role icon={Users} title="Parents" />
    </div>
  </Section>
);

const Role = ({ icon: Icon, title }) => (
  <div className={cn(tokens.card, "p-6 text-center")}>
    <Icon className="mx-auto h-8 w-8 text-indigo-600" />
    <h3 className="mt-4 font-semibold">{title}</h3>
    <a
      href="/connexion"
      className="mt-4 inline-flex items-center justify-center gap-2 text-sm text-indigo-600 hover:underline"
    >
      Accéder <ChevronRight className="h-4 w-4" />
    </a>
  </div>
);

/* ================= FOOTER ================= */
const Footer = () => (
  <footer className="border-t py-8 text-center text-xs text-slate-500">
    © {new Date().getFullYear()} Takwa Établissement — Tous droits réservés
  </footer>
);

/* ================= EXPORT ================= */
export default function HomePageFR() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Hero />
      <Programmes />
      <Plateforme />
      <Roles />
      <Footer />
    </div>
  );
}
