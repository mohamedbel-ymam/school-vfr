// HomePageFR.jsx — version avec images (Hero + Bourse + Forums + Informatique + Équipe)
// Place tes fichiers dans /public/images et renomme ainsi :
//  - joker.jpg (HERO)
//  - bourse.jpg (section Bourse)
//  - forum-orientation.jpg (Forum d'orientation)
//  - forum-coach.jpg (Forum coaching)
//  - info-1.jpg, info-2.jpg (Informatique)
//  - enseignants.jpg (Photo profs / profs+élèves)

import React from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  QrCode,
  MessageSquare,
  BellRing,
  Award,
  Shield,
  FileText,
  Users,
  GraduationCap,
  Building2,
  Sparkles,
  ChevronRight,
} from "lucide-react";

/***********************************
 * Design Tokens & Utils
 ***********************************/
const tokens = {
  radius: "rounded-2xl",
  pill: "rounded-full",
  shadow: "shadow-[0_10px_40px_rgba(0,0,0,0.08)]",
  ring: "ring-1 ring-white/10",
  glass: "bg-white/5 backdrop-blur-md",
  card: "bg-gradient-to-b from-white/70 to-white/40 dark:from-white/10 dark:to-white/5",
  accent: "from-indigo-500 via-violet-500 to-sky-500",
  soft: "from-indigo-500/10 via-violet-500/10 to-sky-500/10",
  grid: "[background:radial-gradient(circle_at_1px_1px,theme(colors.white/8)_1px,transparent_1px)]",
};

const cn = (...c) => c.filter(Boolean).join(" ");

// centralise les chemins d'images
const imgs = {
  hero: "/Img/jokerInit.jpg",
  bourse: "/Img/bourse.jpg",
  forumOrientation: "/Img/forum-orientation.jpg",
  forumCoach: "/Img/forum-coach.jpg",
  info1: "/Img/info-1.jpeg",
  info2: "/Img/info-2.jpeg",
  enseignants: "/Img/enseignant-éleve.jpg",
  enseignants2:"Img/enseignant-etudiants.jpg",
};

/***********************************
 * Primitives
 ***********************************/
const Container = ({ className = "", children }) => (
  <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>
);

const Section = ({ id, className = "", children }) => (
  <section id={id} className={cn("relative py-12 sm:py-16 lg:py-24", className)}>{children}</section>
);

const Card = ({ className = "", children }) => (
  <div className={cn(tokens.card, tokens.radius, tokens.shadow, tokens.ring, "p-6", className)}>{children}</div>
);

const ButtonLink = ({ href = "#", className = "", children }) => (
  <a href={href} className={cn("inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white", tokens.pill, tokens.shadow, "bg-gradient-to-r", tokens.accent, "hover:brightness-110 active:scale-[.98]", className)}>{children}</a>
);

const Badge = ({ children, className = "" }) => (
  <span className={cn("inline-flex items-center gap-1 px-3 py-1 text-xs font-medium", tokens.pill, tokens.ring, tokens.glass, className)}>{children}</span>
);

const Heading = ({ kicker, title, subtitle, align = "center" }) => (
  <div className={cn("max-w-3xl", align === "center" ? "mx-auto text-center" : "")}> 
    {kicker && (
      <div className="mb-3">
        <Badge><Sparkles className="h-3.5 w-3.5" /> <span>{kicker}</span></Badge>
      </div>
    )}
    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
      <GradientText>{title}</GradientText>
    </h2>
    {subtitle && (<p className="mt-4 text-slate-600 dark:text-slate-300 text-base/7 sm:text-lg/8">{subtitle}</p>)}
  </div>
);

const GradientText = ({ children }) => (
  <span className="bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-indigo-200 dark:to-white bg-clip-text text-transparent">{children}</span>
);

/***********************************
 * Background décoratif doux
 ***********************************/
const Background = () => (
  <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
    <div className={cn("absolute -top-24 left-1/2 -translate-x-1/2 h-[35rem] w-[80rem] blur-3xl", "bg-gradient-to-tr", tokens.soft)} />
    <div className={cn("absolute inset-0 opacity-[.25]", tokens.grid)} style={{ backgroundSize: '20px 20px' }} />
  </div>
);

/***********************************
 * 1) Hero / Mission + photo "joker"
 ***********************************/
const Hero = () => (
  <Section id="hero" className="pt-6 sm:pt-10">
    <Background />
    <Container>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
            <Badge className="mb-3">Cours supplémentaires 100% gratuits</Badge>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Enseigner les collégiens & lycéens, gratuitement — avec exigence
            </h1>
            <p className="mt-4 text-slate-600 dark:text-slate-300 text-base sm:text-lg max-w-2xl">
              Notre établissement offre des cours d'appui sélectifs pour améliorer nettement les notes en <strong>sciences</strong>, <strong>mathématiques</strong>, <strong>langues</strong> et <strong>informatique</strong>. L'accès est <strong>gratuit</strong>, mais la sélection et les seuils d'assiduité sont stricts. Les meilleurs élèves (Top 5 après le baccalauréat ) reçoivent une <strong>bourse d'excellence</strong>.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/#plateforme">Voir la plateforme</ButtonLink>
              <a href="/#programmes" className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 border border-white/20 rounded-full hover:bg-white/10">Découvrir nos programmes</a>
            </div>
          </motion.div>
        </div>

        {/* Photo HERO */}
        <div className="lg:col-span-5">
          <motion.figure initial={{ opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.05 }} viewport={{ once: true }} className="relative overflow-hidden rounded-2xl ring-1 ring-white/15 shadow-xl">
            <img src={imgs.hero} alt="Nos élèves — sortie pédagogique" className="h-72 w-full object-cover sm:h-80" loading="lazy" />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent px-4 py-3 text-sm text-white">Engagement, entraide et excellence académique</figcaption>
          </motion.figure>
        </div>
      </div>
    </Container>
  </Section>
);

/***********************************
 * 2) Programmes (disciplines)
 ***********************************/
const Programmes = () => (
  <Section id="programmes">
    <Container>
      <Heading kicker="Programmes" title="Ce que nous enseignons" subtitle="Des bases solides et des méthodes efficaces pour performer au collège et au lycée." />
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 ">
        <ProgCard title="Mathématiques" points={["Algèbre • Analyse • Probabilités", "Méthodes et astuces d'examen"]} />
        <ProgCard title="Sciences" points={["Physique • Chimie", "TP, raisonnement et résolution"]} />
        <ProgCard title="Langues" points={["Français • Anglais •Arabe ","Expression, compréhension & étude"]} />
        <ProgCard title="Informatique" points={["Algorithmique • Python", "Web & culture numérique"]} />
        <ProgCard title="Sciences humaines" points={["Education Islamic  ", "Histoire Geographie"]} />

      </div>
    </Container>
  </Section>
);

const ProgCard = ({ title, points }) => (
  <Card>
    <div className="text-lg font-semibold">{title}</div>
    <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300 list-disc pl-5">
      {points.map((p, i) => (<li key={i}>{p}</li>))}
    </ul>
  </Card>
);

/***********************************
 * 3) Plateforme numérique (SMS)
 ***********************************/
const Plateforme = () => (
  <Section id="plateforme">
    <Container>
      <Heading kicker="Plateforme" title="Un outil moderne pour toute la communauté" subtitle="Une expérience cohérente et sécurisée pour l'admin, les professeurs, les élèves et les parents." />
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Feature icon={CalendarDays} title="Emploi du temps" desc="Vision claire par niveau et par classe." />
        <Feature icon={QrCode} title="Présence (QR)" desc="Pointage rapide et fiable à l'entrée." />
        <Feature icon={MessageSquare} title="Messagerie" desc="Annonces ciblées, messages directs." />
        <Feature icon={FileText} title="Évaluations" desc="QCM/Devoirs avec résultats en ligne." />
        <Feature icon={BellRing} title="Événements" desc="Réunions, sorties, examens — rappelés." />
        <Feature icon={Shield} title="Sécurité" desc="Accès par rôles et confidentialité." />
      </div>
    </Container>
  </Section>
);

const Feature = ({ icon: Icon, title, desc }) => (
  <Card className="h-full">
    <div className="flex items-start gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/15 to-sky-500/15">
        <Icon className="h-6 w-6 text-indigo-500" />
      </div>
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{desc}</p>
      </div>
    </div>
  </Card>
);

/***********************************
 * 4) Événements: Forum d'orientation & Coaching
 ***********************************/
const Forums = () => (
  <Section id="forums">
    <Container>
      <Heading kicker="Événements" title="Forums & Coaching" subtitle="Orientation, coaching émotionnel & rationnel — des rendez‑vous pour guider et motiver nos élèves." />
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MediaCard img={imgs.forumOrientation} title="Forum d'orientation" desc="Témoignages d'étudiants, parcours post‑bac, choix d'orientation.">
          <ButtonLink href="#" className="mt-4">Voir les prochaines dates <ChevronRight className="h-4 w-4" /></ButtonLink>
        </MediaCard>
        <MediaCard img={imgs.forumCoach} title="Forum coaching" desc="Ateliers 1–2 fois/an pour renforcer les compétences émotionnelles et rationnelles.">
          <ButtonLink href="/connexion" className="mt-4">Découvrir le programme <ChevronRight className="h-4 w-4" /></ButtonLink>
        </MediaCard>
      </div>
    </Container>
  </Section>
);

const MediaCard = ({ img, title, desc, children }) => (
  <Card className="overflow-hidden p-0">
    <figure className="relative">
      <img src={img} alt={title} className="h-64 w-full object-cover" loading="lazy" />
      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent px-4 py-3 text-sm text-white">{title}</figcaption>
    </figure>
    <div className="p-6">
      <p className="text-sm text-slate-600 dark:text-slate-300">{desc}</p>
      {children}
    </div>
  </Card>
);

/***********************************
 * 5) Parcours & Sélection
 ***********************************/
const Parcours = () => (
  <Section id="selection">
    <Container>
      <Heading kicker="Parcours" title="De la candidature à l'excellence" subtitle="Gratuit, mais exigeant — l'effort et l'assiduité priment." />
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <Step no="01" title="Candidature" desc="Dossier + test d'entrée. Sélection selon potentiel et motivation." />
        <Step no="02" title="Engagement" desc="Assiduité minimale et respect des seuils. Suivi personnalisé." />
        <Step no="03" title="Excellence" desc="Préparation Bac FR. Coaching et méthodes pour viser haut." />
      </div>
    </Container>
  </Section>
);

const Step = ({ no, title, desc }) => (
  <Card>
    <div className="text-xs font-mono text-slate-500">ÉTAPE {no}</div>
    <div className="mt-1 text-lg font-semibold">{title}</div>
    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{desc}</p>
  </Card>
);

/***********************************
 * 6) Gratuité & Bourse d'excellence (avec photo)
 ***********************************/
const GratuitBourse = () => (
  <Section id="bourse">
    <Container>
      <Heading kicker="Engagement social" title="100% gratuit — bourse pour les meilleurs" subtitle="Nous investissons dans le potentiel des jeunes, pas dans les frais." />
      <div className="mt-10 grid gap-6 md:grid-cols-5 items-stretch">
        <div className="md:col-span-3 order-2 md:order-1">
          <Card>
            <div className="text-lg font-semibold">Gratuité</div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Aucun frais d'inscription ni de scolarité. En contrepartie : présence, rigueur et progression mesurable.</p>
            <div className="mt-6 text-lg font-semibold">Bourse Top 5</div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Après le baccalauréat , les 5 meilleurs obtiennent une <strong>bourse d'excellence</strong> pour leurs études universitaires.</p>
          </Card>
        </div>
        <div className="md:col-span-2 order-1 md:order-2">
          <motion.figure initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative overflow-hidden rounded-2xl ring-1 ring-white/15 shadow-xl h-full">
            <img src={imgs.bourse} alt="Remise de bourses d'excellence" className="h-full w-full object-cover" loading="lazy" />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent px-4 py-3 text-sm text-white">Bourse d'excellence — Top 5</figcaption>
          </motion.figure>
        </div>
      </div>
    </Container>
  </Section>
);

/***********************************
 * 7) Informatique — en images (2 photos)
 ***********************************/
const InformatiqueImages = () => (
  <Section id="informatique-photos">
    <Container>
      <Heading kicker="Informatique" title="Apprendre par la pratique" subtitle="Algorithmique, Python, web — encadré par l'enseignant responsable de la plateforme." />
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Photo img={imgs.info1} caption="Atelier Python — logiques & algorithmes" />
        <Photo img={imgs.info2} caption="Initiation web — HTML/CSS/JS" />
      </div>
    </Container>
  </Section>
);

const Photo = ({ img, caption }) => (
  <figure className="relative overflow-hidden rounded-2xl ring-1 ring-white/15 shadow-xl">
    <img src={img} alt={caption} className="h-72 w-full object-cover" loading="lazy" />
    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent px-4 py-3 text-sm text-white">{caption}</figcaption>
  </figure>
);

/***********************************
 * 8) Portails par rôle (inchangé)
 ***********************************/
const Roles = () => (
  <Section id="roles">
    <Container>
      <Heading kicker="Accès" title="Un espace dédié pour chaque rôle" subtitle="Même langage visuel, objectifs différents — efficacité maximale." />
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <RoleCard icon={Shield} title="Admin" bullets={["Gestion globale", "Utilisateurs & rôles", "Paramètres"]} href="/connexion" />
        <RoleCard icon={Building2} title="Professeur" bullets={["Classes & notes", "Présence", "Devoirs"]} href="/connexion" />
        <RoleCard icon={GraduationCap} title="Élève" bullets={["Emploi du temps", "Messages", "Évaluations"]} href="/connexion" />
        <RoleCard icon={Users} title="Parent" bullets={["Vue enfant", "Événements", "Contact"]} href="/connexion" />
      </div>
    </Container>
  </Section>
);

const RoleCard = ({ icon: Icon, title, bullets, href }) => (
  <Card>
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/15 to-sky-500/15">
        <Icon className="h-5 w-5 text-indigo-500" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
    </div>
    <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300 list-disc pl-5">
      {bullets.map((b, i) => (<li key={i}>{b}</li>))}
    </ul>
    <div className="mt-5"><a href={href} className="inline-flex w-full justify-center px-4 py-2 text-sm font-medium text-white rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500 hover:brightness-110">Entrer</a></div>
  </Card>
);

/***********************************
 * 9) Équipe & étudiants (photo enseignants / mixte)
 ***********************************/
const Team = () => (
  <Section id="equipe">
    <Container>
      <Photo img={imgs.enseignants2} caption="Enseignants & étudiants — pendant les sessions" />
      <Heading kicker="Communauté" title="Équipe pédagogique & étudiants" subtitle="Une communauté soudée où l'on progresse ensemble." />
      <div className="mt-10">
        <Photo img={imgs.enseignants} caption="Enseignants & étudiants — journée d'échanges" />
      </div>
    </Container>
  </Section>
);

/***********************************
 * 10) FAQ (FR)
 ***********************************/
const FAQ = () => (
  <Section id="faq">
    <Container>
      <Heading kicker="FAQ" title="Questions fréquentes" />
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <FaqItem q="Est‑ce mobile ?" a="Oui. L'interface est responsive et s'adapte au téléphone, à la tablette et au bureau." />
        <FaqItem q="Qui peut s'inscrire ?" a="Collégiens et lycéens motivés. La sélection se fait sur dossier et test d'entrée." />
        <FaqItem q="Les cours sont‑ils vraiment gratuits ?" a="Oui, à condition de respecter l'assiduité et les objectifs de progression." />
        <FaqItem q="Comment fonctionne la bourse ?" a="Après le Bac FR, les 5 meilleurs obtiennent une bourse d'excellence pour l'université." />
      </div>
    </Container>
  </Section>
);

const FaqItem = ({ q, a }) => (
  <Card>
    <div className="text-sm font-semibold">{q}</div>
    <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{a}</div>
  </Card>
);

/***********************************
 * Footer minimal
 ***********************************/
const Footer = () => (
  <footer className="border-t border-white/10 py-10">
    <Container>
      <div className="text-center text-xs text-slate-500">© {new Date().getFullYear()} Takwa Établissement — Tous droits réservés.</div>
    </Container>
  </footer>
);

/***********************************
 * Export par défaut
 ***********************************/
export default function HomePageFR() {
  return (
    <div className="relative min-h-screen bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(99,102,241,.12),transparent)]">
      <main>
        <Hero />            {/* 1 */}
        <Programmes />      {/* 2 */}
        <Plateforme />      {/* 3 */}
        <Forums />          {/* 4 — nouveau */}
        <Parcours />        {/* 5 */}
        <GratuitBourse />   {/* 6 — avec image */}
        <InformatiqueImages /> {/* 7 — 2 photos */}
        <Team />            {/* 8 — photo groupe enseignants/élèves */}
        <Roles />           {/* 9 */}
        <FAQ />             {/* 10 */}
      </main>
      <Footer />
    </div>
  );
}

/***********************************
 * Guide de style (réutilisable Login/Dashboard)
 * — Cartes: `rounded-2xl ring-1 ring-white/10 bg-white/60 dark:bg-white/5 backdrop-blur p-6`
 * — Boutons: gradient + rounded-full + shadow doux
 * — Grilles: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` (mobile-first)
 * — Titres: utiliser <GradientText/> pour l'effet premium
 * — Animations: framer-motion entrée 0.6s, sobre
 ***********************************/
