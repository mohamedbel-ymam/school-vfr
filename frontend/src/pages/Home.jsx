import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap,
  BookOpen,
  Users,
  ShieldCheck,
  CalendarDays,
  QrCode,
  Award,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Laptop,
  Compass,
  FileText,
  HelpCircle,
  School,
  Activity,
  Layers,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { LOGIN_ROUTE } from "../router/pahts.js";

/******************************************************************************
 * Photographies Réelles de l'Établissement Takwa
 ******************************************************************************/
const imgs = {
  hero: "/Img/jokerInit.jpg",
  bourse: "/Img/bourse.jpg",
  forumOrientation: "/Img/forum-orientation.jpg",
  forumCoach: "/Img/forum-coach.jpg",
  info1: "/Img/info-1.jpeg",
  info2: "/Img/info-2.jpeg",
  enseignants: "/Img/enseignants.jpg",
  enseignantEleve: "/Img/enseignant-etudiants.jpg",
};

/******************************************************************************
 * Données Pédagogiques Réelles par Cycle (Évolutif)
 ******************************************************************************/
const CYCLES_DATA = [
  {
    id: "college",
    badge: "Collège • 1AC, 2AC & 3AC",
    title: "Cycle Collégial & Préparation au Brevet",
    description:
      "La période charnière où se construisent les automatismes de raisonnement. Notre encadrement consolide la rigueur de calcul en mathématiques, la démarche expérimentale et la fluidité d'expression écrite.",
    schedule: "Mercredi après-midi & Samedi après-midi",
    targetExam: "Examen Normalisé Local & Brevet de 3ème Année Collégiale",
    subjects: [
      { name: "Mathématiques", focus: "Calcul algébrique, géométrie plane, théorèmes de Pythagore & Thalès, équations." },
      { name: "Physique - Chimie", focus: "Matière, circuits électriques, solutions aqueuses et réactions chimiques fondamentales." },
      { name: "Sciences de la Vie et de la Terre", focus: "Géodynamique interne et externe, biologie humaine et démarche d'investigation." },
      { name: "Langues Fondamentales", focus: "Compréhension de texte, grammaire appliquée et expression en Français et Arabe." },
    ],
    features: [
      "Petits groupes de 18 à 22 élèves pour un suivi rapproché",
      "Évaluations formatives hebdomadaires et corrigés détaillés",
      "Séances d'initiation à la méthodologie de prise de notes",
    ],
  },
  {
    id: "tronc-commun",
    badge: "Lycée • Tronc Commun",
    title: "Tronc Commun Scientifique & Technologique",
    description:
      "Le grand saut méthodologique vers l'abstraction. Nous formons les élèves à structurer une démonstration rigoureuse et à appréhender les sciences sous forme de modèles mathématiques cohérents.",
    schedule: "Samedi matin & Dimanche matin",
    targetExam: "Orientation décisive vers 1ère Bac Sciences Mathématiques ou Expérimentales",
    subjects: [
      { name: "Mathématiques Approfondies", focus: "Arithmétique, calcul vectoriel, ordre dans R, trigonométrie et étude de fonctions." },
      { name: "Physique - Chimie", focus: "Mécanique du point, gravitation, équilibre d'un solide, dosage et mole." },
      { name: "SVT & Géologie", focus: "Phénomènes géologiques, écologie, analyse documentaire et synthèse." },
      { name: "Expression & Synthèse", focus: "Techniques de dissertation et résumé de textes pour préparer le cycle du Bac." },
    ],
    features: [
      "Entraînement régulier au raisonnement par disjonction de cas et récurrence",
      "Ateliers de résolution de problèmes non guidés",
      "Conseil personnalisé pour le choix de la filière de 1ère Bac",
    ],
  },
  {
    id: "1bac",
    badge: "Lycée • 1ère Année Bac",
    title: "1ère Année Baccalauréat (SM & SE)",
    description:
      "Une année charnière à double enjeu : préparer activement l'Examen Régional tout en bâtissant les socles conceptuels lourds indispensables pour réussir la 2ème année du Bac.",
    schedule: "Samedi après-midi & Dimanche matin",
    targetExam: "Examen Régional Unifié (Français, Histoire-Géo, Éducation Islamique, Arabe)",
    subjects: [
      { name: "Matières Régionales Clés", focus: "Étude des œuvres prescrites (La Boîte à Merveilles, Antigone, Le Dernier Jour d'un Condamné)." },
      { name: "Mathématiques de Spécialité", focus: "Logique formelle, barycentres, dérivabilité, limites et suites numériques." },
      { name: "Sciences Physiques & Chimie", focus: "Travail et énergie cinétique, électrostatique, cinétique chimique et conductimétrie." },
      { name: "SVT (Filière Sciences Exp.)", focus: "Phénomènes géologiques externes, sédimentation et ressources hydriques." },
    ],
    features: [
      "4 sessions complètes d'Examens Blancs Régionaux avec notation type académique",
      "Fiches de méthodologie pour l'analyse littéraire et la production écrite",
      "Point d'étape individuel avec la famille à mi-parcours",
    ],
  },
  {
    id: "2bac",
    badge: "Lycée • 2ème Année Bac & Concours",
    title: "Terminale Baccalauréat : Sciences Maths, PC & SVT",
    description:
      "L'année de la consécration académique. Notre dispositif conjugue la maîtrise intégrale du programme de l'Examen National et un entraînement spécifique aux concours d'accès aux grandes écoles (CPGE, Médecine, ENSA, ENSAM).",
    schedule: "Séances intensives le week-end & révisions du soir ciblées",
    targetExam: "Examen National du Baccalauréat & Concours Post-Bac",
    subjects: [
      { name: "Mathématiques Expertes", focus: "Fonctions exponentielles et logarithmes, équations différentielles, intégration, probabilités, nombres complexes." },
      { name: "Sciences Physiques Avancées", focus: "Ondes, mécanique de Newton, circuits RLC, transformations nucléaires, équilibres chimiques acido-basiques." },
      { name: "SVT & Génétique", focus: "Transmission de l'information génétique, génétique des populations et immunologie." },
      { name: "Philosophie & Anglais", focus: "Maîtrise du commentaire de texte philosophique et fluidité de la rédaction argumentée." },
    ],
    features: [
      "Simulations hebdomadaires sur épreuves authentiques des sessions nationales passées",
      "Modules spéciaux de préparation aux QCM des concours d'entrée aux grandes écoles",
      "Éligibilité directe au programme de Parrainage d'Excellence & Bourse Top 3",
    ],
  },
];

/******************************************************************************
 * Portails d'Accès par Rôle
 ******************************************************************************/
const ROLES_INFO = [
  {
    role: "Élève",
    tag: "Espace Apprenant",
    desc: "Un carnet de bord numérique complet pour organiser son travail personnel, suivre son assiduité et consolider ses acquis.",
    features: [
      "Accès aux devoirs surveillés et fiches d'exercices hebdomadaires",
      "Entraînement en autonomie sur banques de questions et QCM",
      "Relevé d'assiduité horodaté et historique des présences",
      "Emploi du temps personnalisé et alertes des rattrapages",
    ],
    color: "from-blue-600 to-indigo-600",
  },
  {
    role: "Enseignant",
    tag: "Espace Pédagogique",
    desc: "Des outils simples et sans superflu pour se concentrer sur l'essentiel : la transmission des savoirs et le suivi de chaque élève.",
    features: [
      "Appel numérique instantané avec scan QR code à l'entrée",
      "Publication des devoirs, supports polycopiés et corrigés",
      "Saisie des évaluations, appréciations et plans mensuels",
      "Messagerie directe avec l'administration et suivi de classe",
    ],
    color: "from-emerald-600 to-teal-600",
  },
  {
    role: "Parent",
    tag: "Espace Famille",
    desc: "Une visibilité continue sur le parcours de votre enfant, pour accompagner ses efforts sans rupture d'information.",
    features: [
      "Notification immédiate en cas de retard ou d'absence imprévue",
      "Consultation du calendrier des épreuves et des devoirs",
      "Visualisation des appréciations de l'équipe enseignante",
      "Canal direct de communication avec la direction pédagogique",
    ],
    color: "from-amber-600 to-orange-600",
  },
  {
    role: "Administration",
    tag: "Espace Direction",
    desc: "Pilotage centralisé de la structure : organisation des groupes, assiduité globale, gestion des listes d'attente et bourses.",
    features: [
      "Supervision en temps réel des flux de présences et absences",
      "Affectation des créneaux, des salles et des enseignants",
      "Traitement des dossiers de candidatures et liste d'attente",
      "Gestion du programme de Bourse d'Excellence Top 3",
    ],
    color: "from-purple-600 to-indigo-700",
  },
];

/******************************************************************************
 * FAQ Humanisée & Réelle
 ******************************************************************************/
const FAQ_ITEMS = [
  {
    q: "Qu'est-ce qui caractérise l'accompagnement de Takwa Établissement ?",
    a: "Takwa est une structure d'appui scolaire à vocation d'excellence. Nous ne proposons pas une simple aide aux devoirs, mais un encadrement méthodologique approfondi dirigé par des enseignants chevronnés, destiné à maîtriser les exigences fondamentales du collège et du lycée marocain.",
  },
  {
    q: "Les cours sont-ils réellement gratuits pour les élèves ?",
    a: "Oui, la totalité des cours d'appui dispensés dans l'établissement est gratuite. Cette gratuité repose sur un contrat de confiance et d'engagement mutuel : chaque élève admis s'engage à être ponctuel, à rendre tous ses devoirs et à faire preuve d'un comportement exemplaire.",
  },
  {
    q: "Quelle est la règle en matière d'assiduité et d'absences ?",
    a: "L'assiduité est rigoureusement contrôlée à chaque séance via un badge numérique et un scan QR à l'entrée de la salle. Deux absences non justifiées de manière recevable par les parents entraînent automatiquement la réattribution de la place à un élève inscrit sur notre liste d'attente.",
  },
  {
    q: "Comment fonctionne la Bourse d'Excellence Top 3 ?",
    a: "Chaque année, à la publication des résultats officiels du Baccalauréat, les trois meilleurs élèves ayant suivi avec constance notre dispositif bénéficient d'un parrainage d'honneur et d'une allocation d'études pour faciliter leur installation et leur réussite dans l'enseignement supérieur (CPGE, facultés de médecine, écoles d'ingénieurs).",
  },
  {
    q: "À quel rythme se déroulent les séances hebdomadaires ?",
    a: "Les créneaux sont spécialement positionnés pour ne pas surcharger l'emploi du temps scolaire régulier des élèves : le mercredi après-midi, le samedi et le dimanche matin selon le niveau. Des séances ponctuelles de consolidation ou de simulation d'examens peuvent être programmées lors des congés scolaires.",
  },
  {
    q: "Comment s'inscrire ou postuler sur la liste d'attente ?",
    a: "Les admissions se font en début d'année scolaire ainsi qu'au début du second semestre selon les places libérées. Un dossier de candidature et un test de positionnement permettent d'orienter chaque élève dans le groupe le plus adapté à ses besoins. Vous pouvez déposer votre demande directement depuis l'onglet Liste d'attente.",
  },
];

export default function Home() {
  const [activeCycle, setActiveCycle] = useState("2bac");
  const [activeRole, setActiveRole] = useState(0);
  const [openFaq, setOpenFaq] = useState(null);

  const currentCycle = CYCLES_DATA.find((c) => c.id === activeCycle) || CYCLES_DATA[0];

  return (
    <div className="w-full overflow-hidden bg-background">
      {/* =========================================================================
       * 1) HERO SECTION AVEC FOND ÉLÉGANT & MICRO-DÉTAILS INSTITUTIONNELS
       * ========================================================================= */}
      <section className="relative pt-10 pb-16 md:pt-16 md:pb-24 border-b border-border/50">
        {/* Soft background accents */}
        <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute -top-40 right-1/4 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute top-1/2 -left-40 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Heading, Proposition, CTAs */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Pédagogie d'Exigence & Égalité des Chances</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
                L’exigence académique au service de la réussite de chaque élève.
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl font-normal">
                Takwa Établissement dispense un enseignement d'appui rigoureux aux collégiens
                et lycéens en mathématiques, sciences, informatique et langues. Un cadre gratuit,
                structuré par des évaluations régulières, une assiduité scrupuleusement suivie et
                un programme de parrainage post-bac pour nos meilleurs lauréats.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to={LOGIN_ROUTE}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-3.5 text-sm font-semibold shadow-md hover:opacity-90 active:scale-95 transition-all"
                >
                  <GraduationCap className="h-4 w-4" />
                  <span>Accéder à l'Espace Numérique</span>
                </Link>

                <a
                  href="#cycles"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground px-5 py-3.5 text-sm font-semibold shadow-sm transition-all"
                >
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span>Consulter nos Cycles</span>
                </a>

                <Link
                  to="/waiting-list"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-3.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>Liste d'attente</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Verified Institutional Pillars */}
              <div className="pt-4 border-t border-border/60 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-medium text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Assiduité vérifiée par scan</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Bourse d'Excellence Top 3</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Orientation & coaching actif</span>
                </div>
              </div>
            </div>

            {/* Right Column: Authentic Image with Interactive Badge Overlays */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card shadow-2xl">
                  <img
                    src={imgs.hero}
                    alt="Séance de cours et d'accompagnement à Takwa Établissement"
                    className="h-80 sm:h-96 w-full object-cover transition-transform duration-700 hover:scale-105"
                    loading="eager"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                  {/* Caption badge */}
                  <div className="absolute bottom-4 left-4 right-4 p-3 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 text-white">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>Groupe Scolaire Takwa</span>
                      <span className="text-emerald-400 font-mono">En présentiel</span>
                    </div>
                    <p className="mt-1 text-[11px] text-white/80 line-clamp-1">
                      Séances de consolidation méthodologique et d'entraînement aux examens
                    </p>
                  </div>
                </div>

                {/* Floating Card: Assiduité */}
                <div className="hidden sm:flex absolute -top-5 -left-6 items-center gap-3 rounded-2xl border border-border bg-card/95 backdrop-blur-md p-3.5 shadow-xl">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">Pointage par QR Code</div>
                    <div className="text-[11px] text-muted-foreground">Notification immédiate aux parents</div>
                  </div>
                </div>

                {/* Floating Card: Bourse */}
                <div className="hidden sm:flex absolute -bottom-5 -right-6 items-center gap-3 rounded-2xl border border-border bg-card/95 backdrop-blur-md p-3.5 shadow-xl">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">Top 3 Bacheliers</div>
                    <div className="text-[11px] text-muted-foreground">Bourses d'études supérieures</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Institutional Key Figures Bar */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-2xl border border-border/80 bg-card/60 backdrop-blur shadow-sm">
            <div className="space-y-1 border-r border-border/60 last:border-r-0 pl-2">
              <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">100 %</div>
              <div className="text-xs font-medium text-muted-foreground">Gratuité des cours d'appui</div>
            </div>
            <div className="space-y-1 border-r border-border/60 last:border-r-0 pl-2">
              <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">Top 3</div>
              <div className="text-xs font-medium text-muted-foreground">Parrainage d'excellence post-bac</div>
            </div>
            <div className="space-y-1 border-r border-border/60 last:border-r-0 pl-2">
              <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">4 Espaces</div>
              <div className="text-xs font-medium text-muted-foreground">Élève, Professeur, Parent, Direction</div>
            </div>
            <div className="space-y-1 pl-2">
              <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">98.2 %</div>
              <div className="text-xs font-medium text-muted-foreground">Taux de présence moyen vérifié</div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
       * 2) EXPLORATEUR DE CYCLES & FILIÈRES (UX ÉVOLUTIF INTERACTIF)
       * ========================================================================= */}
      <section id="cycles" className="py-16 md:py-24 bg-muted/30 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Organisation Pédagogique
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Des programmes ciblés, du collège à la terminale
            </h2>
            <p className="text-base text-muted-foreground">
              Chaque cycle dispose d’objectifs précis, d'un calendrier adapté aux examens
              officiels et d’enseignants spécialistes de chaque discipline.
            </p>
          </div>

          {/* Interactive Cycle Tabs */}
          <div className="flex flex-wrap justify-center gap-2 p-1.5 rounded-2xl bg-card border border-border max-w-3xl mx-auto shadow-sm">
            {CYCLES_DATA.map((c) => {
              const isActive = activeCycle === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCycle(c.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm scale-100"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  }`}
                >
                  {c.badge.split("•")[0].trim()}
                </button>
              );
            })}
          </div>

          {/* Active Cycle Detailed Panel */}
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-lg transition-all duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Overview */}
              <div className="lg:col-span-5 space-y-5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  <School className="h-3.5 w-3.5" />
                  <span>{currentCycle.badge}</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {currentCycle.title}
                </h3>

                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {currentCycle.description}
                </p>

                <div className="space-y-3 pt-2 border-t border-border/60">
                  <div className="flex items-start gap-3">
                    <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-foreground">Rythme des cours</div>
                      <div className="text-xs text-muted-foreground">{currentCycle.schedule}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <TargetIcon className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-foreground">Échéance certificative</div>
                      <div className="text-xs text-muted-foreground">{currentCycle.targetExam}</div>
                    </div>
                  </div>
                </div>

                {/* Specific features checklist */}
                <div className="pt-2 space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Engagements du cycle :
                  </div>
                  {currentCycle.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-foreground/90 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Subjects Breakdown Cards */}
              <div className="lg:col-span-7">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {currentCycle.subjects.map((sub, i) => (
                    <div
                      key={i}
                      className="p-5 rounded-2xl border border-border/80 bg-background/50 hover:bg-background transition-all hover:shadow-md space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-foreground">{sub.name}</h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          Module {i + 1}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {sub.focus}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-muted/50 border border-border text-xs">
                  <div className="text-muted-foreground font-medium">
                    Vous souhaitez inscrire votre enfant pour ce niveau ?
                  </div>
                  <Link
                    to="/waiting-list"
                    className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
                  >
                    Postuler pour {currentCycle.badge.split("•")[0].trim()} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
       * 3) PILIERS PÉDAGOGIQUES TAKWA (AUTHENTIQUE & RIGOUREUX)
       * ========================================================================= */}
      <section id="pedagogie" className="py-16 md:py-24 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Notre Méthode
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Quatre exigences qui font progresser durablement
            </h2>
            <p className="text-base text-muted-foreground">
              Ni bachotage superficiel, ni théorie déconnectée. Notre enseignement s'appuie sur
              un travail régulier, structuré et constamment évalué.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <PillarCard
              num="01"
              icon={Activity}
              title="Diagnostic Initial"
              desc="Dès l'admission, un test de positionnement identifie avec clarté les lacunes conceptuelles et les points forts de l'élève pour le placer dans le groupe de travail pertinent."
            />
            <PillarCard
              num="02"
              icon={FileText}
              title="Devoirs Hebdomadaires"
              desc="Pas de progrès sans confrontation à l'exercice autonome. Chaque séance est prolongée par un devoir à rendre, corrigé et annoté méthodiquement par l'enseignant."
            />
            <PillarCard
              num="03"
              icon={QrCode}
              title="Contrôle de l'Assiduité"
              desc="La présence à chaque séance est un prérequis non négociable. Un système de pointage par badge et scan QR informe immédiatement les parents en cas d'absence injustifiée."
            />
            <PillarCard
              num="04"
              icon={Compass}
              title="Orientation & Coaching"
              desc="Des forums réguliers avec d'anciens lauréats et des professionnels aident chaque lycéen à mûrir son projet post-bac, choisir sa filière et aborder les épreuves avec sérénité."
            />
          </div>
        </div>
      </section>

      {/* =========================================================================
       * 4) BOURSE D'EXCELLENCE & CONTRAT SOCIAL (AVEC PHOTO BOURSE)
       * ========================================================================= */}
      <section id="bourse" className="py-16 md:py-24 bg-muted/30 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left: Presentation */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                <Award className="h-4 w-4" />
                <span>Méritocratie & Solidarité</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                La gratuité totale adossée à une Bourse d'Excellence pour le Top 3
              </h2>

              <p className="text-base text-muted-foreground leading-relaxed font-normal">
                Notre établissement a été fondé sur un principe fondateur : aucun élève motivé ne
                doit être freiné par des barrières financières. Les cours d'appui sont entièrement
                gratuits. En contrepartie, nous demandons une rigueur absolue, le respect des consignes
                et le dépassement de soi.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-2">
                  <div className="text-sm font-bold text-foreground">Le Contrat d'Engagement</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    L'assiduité est obligatoire. Toute place non honorée par deux absences
                    injustifiées est réattribuée à un candidat méritant sur liste d'attente.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 shadow-sm space-y-2">
                  <div className="text-sm font-bold text-amber-800 dark:text-amber-300">
                    Bourse d'Études Supérieures
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Les 3 meilleurs lauréats de notre cycle terminal reçoivent une bourse
                    financière et un mentorat pour réussir leur entrée en prépa, fac ou grande école.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to="/waiting-list"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                >
                  Découvrir les critères de sélection et la liste d'attente
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Right: Authentic Photograph */}
            <div className="lg:col-span-5">
              <figure className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
                <img
                  src={imgs.bourse}
                  alt="Remise solennelle des Bourses d'Excellence aux bacheliers lauréats"
                  className="h-80 sm:h-96 w-full object-cover"
                  loading="lazy"
                />
                <figcaption className="p-4 bg-card/95 border-t border-border text-xs text-muted-foreground">
                  <strong className="text-foreground">Cérémonie Annuelle des Lauréats :</strong>{" "}
                  Remise officielle des allocations de parrainage aux 3 meilleurs bacheliers de la promotion.
                </figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
       * 5) ÉVÉNEMENTS & VIE DE L'ÉTABLISSEMENT (PHOTOS RÉELLES)
       * ========================================================================= */}
      <section id="evenements" className="py-16 md:py-24 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                La Vie à Takwa
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Forums, ateliers pratiques et temps forts
              </h2>
              <p className="text-base text-muted-foreground">
                L’apprentissage ne se limite pas à la salle de cours : il s’enrichit de rencontres
                avec des professionnels, d'ateliers numériques et de séances de préparation mentale.
              </p>
            </div>

            <Link
              to={LOGIN_ROUTE}
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline shrink-0"
            >
              Consulter l'agenda complet <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <EventShowcaseCard
              img={imgs.forumOrientation}
              tag="Orientation"
              title="Forum Post-Bac & Grandes Écoles"
              desc="Rencontres avec des élèves-ingénieurs, étudiants en médecine et lauréats de CPGE pour éclairer les choix de filières."
            />
            <EventShowcaseCard
              img={imgs.forumCoach}
              tag="Méthodologie"
              title="Ateliers de Coaching & Gestion du Stress"
              desc="Techniques de mémorisation active, gestion du temps d'examen et préparation psychologique avant les épreuves nationales."
            />
            <EventShowcaseCard
              img={imgs.info1}
              tag="Informatique"
              title="Ateliers d'Algorithmique & Python"
              desc="Initiation au code, logique de programmation et découverte des technologies web animées par nos spécialistes."
            />
            <EventShowcaseCard
              img={imgs.enseignants}
              tag="Communauté"
              title="Séminaires de Concertation Pédagogique"
              desc="Harmonisation des barèmes, ajustement des progressions et suivi individualisé des élèves en difficulté."
            />
          </div>
        </div>
      </section>

      {/* =========================================================================
       * 6) PORTAILS D'ACCÈS PAR RÔLE (UX INTERACTIVE ÉVOLUTIVE)
       * ========================================================================= */}
      <section id="plateforme" className="py-16 md:py-24 bg-muted/30 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Environnement Numérique de Travail
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Une plateforme pensée pour chaque acteur de l'école
            </h2>
            <p className="text-base text-muted-foreground">
              Élèves, enseignants, parents et équipe de direction partagent le même écosystème
              sécurisé, garantissant une communication fluide sans déperdition d'information.
            </p>
          </div>

          {/* Role selector tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {ROLES_INFO.map((r, idx) => (
              <button
                key={r.role}
                onClick={() => setActiveRole(idx)}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  activeRole === idx
                    ? "border-primary bg-card text-foreground shadow-md font-bold"
                    : "border-border bg-card/60 text-muted-foreground hover:bg-card hover:text-foreground font-medium"
                }`}
              >
                <div className="text-sm">{r.role}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{r.tag}</div>
              </button>
            ))}
          </div>

          {/* Active Role Card Details */}
          <div className="max-w-4xl mx-auto rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-primary font-semibold">
                  {ROLES_INFO[activeRole].tag}
                </span>
                <h3 className="text-2xl font-bold text-foreground">
                  Espace {ROLES_INFO[activeRole].role}
                </h3>
              </div>

              <Link
                to={LOGIN_ROUTE}
                className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-xs font-semibold shadow-sm hover:opacity-90 transition-opacity self-start sm:self-auto"
              >
                <span>Connexion Espace {ROLES_INFO[activeRole].role}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
              {ROLES_INFO[activeRole].desc}
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {ROLES_INFO[activeRole].features.map((feat, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3.5 rounded-xl border border-border/70 bg-muted/20"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm text-foreground/90 font-medium">{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
       * 7) FAQ AUTHENTIQUE & RASSURANTE
       * ========================================================================= */}
      <section id="faq" className="py-16 md:py-24 border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Informations Pratiques
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Questions fréquentes des familles et élèves
            </h2>
            <p className="text-base text-muted-foreground">
              Toutes les réponses essentielles sur le fonctionnement quotidien de nos cours
              d’appui, l'assiduité et les critères d’attribution des bourses.
            </p>
          </div>

          <div className="space-y-4">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-border bg-card overflow-hidden transition-colors shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-foreground text-sm sm:text-base hover:text-primary transition-colors"
                  >
                    <span>{item.q}</span>
                    <ChevronRight
                      className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                        isOpen ? "rotate-90 text-primary" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-6 rounded-2xl border border-border bg-muted/40 text-center space-y-3">
            <div className="text-sm font-bold text-foreground">Une question spécifique non abordée ?</div>
            <p className="text-xs text-muted-foreground max-w-lg mx-auto">
              Notre équipe d’accueil et d'orientation répond aux familles lors des permanences
              du mercredi après-midi et du samedi matin au sein de l'établissement.
            </p>
            <Link
              to="/waiting-list"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              Déposer une demande d'admission <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
       * 8) FOOTER INSTITUTIONNEL MODERNE
       * ========================================================================= */}
      <footer className="bg-slate-950 text-slate-300 py-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Col 1: Identity */}
            <div className="md:col-span-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-white/10 p-1 flex items-center justify-center border border-white/15">
                  <School className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-base font-bold text-white tracking-tight">Takwa Établissement</div>
                  <div className="text-xs text-slate-400">Groupe Scolaire d'Excellence & Appui</div>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                Structure pédagogique indépendante engagée pour la réussite académique,
                la consolidation des bases scientifiques et l'égalité des chances dans l'accès
                aux formations supérieures d'élite.
              </p>
            </div>

            {/* Col 2: Navigation Links */}
            <div className="md:col-span-3 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-white">Navigation</div>
              <ul className="space-y-2 text-xs text-slate-400">
                <li><a href="#cycles" className="hover:text-white transition-colors">Cycles & Filières</a></li>
                <li><a href="#pedagogie" className="hover:text-white transition-colors">Pédagogie & Méthode</a></li>
                <li><a href="#bourse" className="hover:text-white transition-colors">Bourse Top 3</a></li>
                <li><a href="#evenements" className="hover:text-white transition-colors">Événements & Forums</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">Foire aux questions</a></li>
              </ul>
            </div>

            {/* Col 3: Espaces Numériques */}
            <div className="md:col-span-4 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-white">Espaces Connectés</div>
              <ul className="space-y-2 text-xs text-slate-400">
                <li><Link to={LOGIN_ROUTE} className="hover:text-white transition-colors">Espace Élève (Devoirs & Présence)</Link></li>
                <li><Link to={LOGIN_ROUTE} className="hover:text-white transition-colors">Espace Professeur (Appel QR & Notes)</Link></li>
                <li><Link to={LOGIN_ROUTE} className="hover:text-white transition-colors">Espace Parent (Suivi en temps réel)</Link></li>
                <li><Link to="/waiting-list" className="hover:text-amber-400 text-amber-300 font-semibold transition-colors">Formulaire Liste d'Attente</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div>
              © {new Date().getFullYear()} Takwa Établissement. Tous droits réservés.
            </div>
            <div className="flex gap-4">
              <span>Rigueur • Ponctualité • Mérite</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/******************************************************************************
 * Micro-Composants Locaux
 ******************************************************************************/
function TargetIcon(props) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function PillarCard({ num, icon: Icon, title, desc }) {
  return (
    <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-3 relative group hover:-translate-y-1 transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-2xl font-black text-muted-foreground/30 font-mono">{num}</span>
      </div>
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

function EventShowcaseCard({ img, tag, title, desc }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm flex flex-col group hover:shadow-lg transition-all duration-300">
      <div className="relative h-44 overflow-hidden">
        <img
          src={img}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur text-[11px] font-semibold text-white">
          {tag}
        </div>
      </div>
      <div className="p-5 flex-1 flex flex-col justify-between space-y-2">
        <div>
          <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
            {title}
          </h4>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-3">
            {desc}
          </p>
        </div>
      </div>
    </div>
  );
}
