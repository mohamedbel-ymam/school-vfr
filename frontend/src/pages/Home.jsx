

import React from "react";
import {
  CalendarDays,
  QrCode,
  MessageSquare,
  BellRing,
  Shield,
  FileText,
  Users,
  GraduationCap,
  Building2,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

/***********************************
 * Helpers
 ***********************************/
const cn = (...c) => c.filter(Boolean).join(" ");

/***********************************
 * Images
 ***********************************/
const imgs = {
  hero: "/Img/jokerInit.jpg",
  bourse: "/Img/bourse.jpg",
  forumOrientation: "/Img/forum-orientation.jpg",
  forumCoach: "/Img/forum-coach.jpg",
  info1: "/Img/info-1.jpeg",
  info2: "/Img/info-2.jpeg",
  enseignants: "/Img/enseignant-éleve.jpg",
  enseignants2: "/Img/enseignant-etudiants.jpg",
};

/***********************************
 * Primitives (MODEL 3)
 ***********************************/
const Container = ({ className = "", children }) => (
  <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>
);

const Section = ({ id, className = "", children }) => (
  <section id={id} className={cn("relative py-12 sm:py-16 lg:py-20", className)}>
    {children}
  </section>
);

const Card = ({ className = "", children }) => (
  <div
    className={cn(
      "rounded-lg border border-slate-200 bg-white shadow-sm",
      "p-6",
      className
    )}
  >
    {children}
  </div>
);

const Kicker = ({ children }) => (
  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{children}</div>
);

const ButtonLink = ({ href = "#", variant = "primary", className = "", children }) => {
  const base =
    "inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors";
  const styles =
    variant === "primary"
      ? "bg-slate-800 text-white hover:bg-slate-700"
      : "bg-white text-slate-900 border border-slate-300 hover:bg-slate-50";
  return (
    <a href={href} className={cn(base, styles, className)}>
      {children}
    </a>
  );
};

const Heading = ({ kicker, title, subtitle, align = "center" }) => (
  <div className={cn("max-w-3xl", align === "center" ? "mx-auto text-center" : "")}>
    {kicker ? <div className="mb-2"><Kicker>{kicker}</Kicker></div> : null}
    <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
      {title}
    </h2>
    {subtitle ? (
      <p className="mt-3 text-base sm:text-lg leading-7 text-slate-600">{subtitle}</p>
    ) : null}
  </div>
);

const Divider = () => <div className="my-10 border-t border-slate-200" />;

const Photo = ({ img, caption }) => (
  <figure className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
    <img src={img} alt={caption} className="h-72 w-full object-cover" loading="lazy" />
    <figcaption className="px-4 py-3 text-sm text-slate-600">{caption}</figcaption>
  </figure>
);

/***********************************
 * Page Background (MODEL 3)
 ***********************************/
const PageShell = ({ children }) => (
  <div className="min-h-screen bg-slate-50 text-slate-900">
    {/* bande institutionnelle discrète */}
    <div className="h-2 bg-slate-800" />
    {children}
  </div>
);

/***********************************
 * 1) Hero
 ***********************************/
const Hero = () => (
  <Section id="hero" className="pt-8 sm:pt-10">
    <Container>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7">
          <Kicker>Cours supplémentaires gratuits</Kicker>
          <h1 className="mt-2 text-4xl sm:text-5xl font-semibold tracking-tight text-slate-900">
            Enseigner aux collégiens & lycéens — gratuitement, avec exigence
          </h1>
          <p className="mt-4 text-slate-600 text-base sm:text-lg leading-7 max-w-2xl">
            Notre établissement offre des cours d’appui sélectifs pour améliorer les résultats en{" "}
            <strong>sciences</strong>, <strong>mathématiques</strong>, <strong>langues</strong> et{" "}
            <strong>informatique</strong>. L’accès est <strong>gratuit</strong>, avec une sélection
            et des seuils d’assiduité stricts. Les meilleurs élèves (Top 3 après le baccalauréat)
            peuvent bénéficier d’une <strong>bourse d’excellence</strong>.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href="/#plateforme" variant="primary">
              Voir la plateforme
            </ButtonLink>
            <ButtonLink href="/#programmes" variant="secondary">
              Découvrir nos programmes
            </ButtonLink>
          </div>

          <div className="mt-6 flex flex-wrap gap-4 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-slate-700" />
              Suivi & assiduité
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-slate-700" />
              Orientation & coaching
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-slate-700" />
              Plateforme sécurisée par rôles
            </span>
          </div>
        </div>

        <div className="lg:col-span-5">
          <figure className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <img
              src={imgs.hero}
              alt="Nos élèves — activité pédagogique"
              className="h-72 w-full object-cover sm:h-80"
              loading="lazy"
            />
            <figcaption className="px-4 py-3 text-sm text-slate-600">
              Apprentissage structuré et accompagnement pédagogique
            </figcaption>
          </figure>
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
      <Heading
        kicker="Programmes"
        title="Ce que nous enseignons"
        subtitle="Des bases solides et des méthodes efficaces pour performer au collège et au lycée."
      />

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <ProgCard
          title="Mathématiques"
          points={["Algèbre • Analyse • Probabilités", "Méthodes et entraînement à l'examen"]}
        />
        <ProgCard
          title="Sciences"
          points={["Physique • Chimie", "SVT • raisonnement et résolution"]}
        />
        <ProgCard
          title="Langues"
          points={["Français • Anglais • Arabe", "Expression, compréhension & étude"]}
        />
        <ProgCard
          title="Informatique"
          points={["Algorithmique • Python", "Web & culture numérique"]}
        />
        <ProgCard
          title="Sciences humaines"
          points={["Éducation islamique", "Histoire • Géographie"]}
        />
      </div>
    </Container>
  </Section>
);

const ProgCard = ({ title, points }) => (
  <Card>
    <div className="text-lg font-semibold text-slate-900">{title}</div>
    <ul className="mt-3 space-y-2 text-sm text-slate-600 list-disc pl-5">
      {points.map((p, i) => (
        <li key={i}>{p}</li>
      ))}
    </ul>
  </Card>
);

/***********************************
 * 3) Plateforme numérique (SMS)
 ***********************************/
const Plateforme = () => (
  <Section id="plateforme">
    <Container>
      <Heading
        kicker="Plateforme"
        title="Un outil pour toute la communauté"
        subtitle="Une expérience cohérente et sécurisée pour l’administration, les professeurs, les élèves et les parents."
      />

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Feature icon={CalendarDays} title="Emploi du temps" desc="Vision claire par niveau et par classe." />
        <Feature icon={QrCode} title="Présence (QR)" desc="Pointage rapide et fiable." />
        <Feature icon={MessageSquare} title="Messagerie" desc="Annonces ciblées et messages directs." />
        <Feature icon={FileText} title="Évaluations" desc="QCM / devoirs avec résultats en ligne." />
        <Feature icon={BellRing} title="Événements" desc="Réunions, examens, sorties — avec rappels." />
        <Feature icon={Shield} title="Sécurité" desc="Accès par rôles et confidentialité." />
      </div>
    </Container>
  </Section>
);

const Feature = ({ icon: Icon, title, desc }) => (
  <Card className="h-full">
    <div className="flex items-start gap-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-md bg-slate-100 border border-slate-200">
        <Icon className="h-5 w-5 text-slate-700" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">{desc}</p>
      </div>
    </div>
  </Card>
);

/***********************************
 * 4) Événements: Forums & Coaching
 ***********************************/
const Forums = () => (
  <Section id="forums">
    <Container>
      <Heading
        kicker="Événements"
        title="Forums & coaching"
        subtitle="Orientation et accompagnement — des rendez-vous pour guider et motiver nos élèves."
      />

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MediaCard
          img={imgs.forumOrientation}
          title="Forum d'orientation"
          desc="Témoignages, parcours post-bac, informations pratiques et échanges."
          ctaHref="#"
          ctaText="Voir les prochaines dates"
        />
        <MediaCard
          img={imgs.forumCoach}
          title="Forum coaching"
          desc="Ateliers 1–2 fois/an pour renforcer les compétences émotionnelles et rationnelles."
          ctaHref="/connexion"
          ctaText="Découvrir le programme"
        />
      </div>
    </Container>
  </Section>
);

const MediaCard = ({ img, title, desc, ctaHref, ctaText }) => (
  <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
    <img src={img} alt={title} className="h-64 w-full object-cover" loading="lazy" />
    <div className="p-6">
      <div className="text-lg font-semibold text-slate-900">{title}</div>
      <p className="mt-2 text-sm text-slate-600">{desc}</p>
      <div className="mt-4">
        <ButtonLink href={ctaHref} variant="secondary" className="w-full sm:w-auto">
          {ctaText} <ChevronRight className="h-4 w-4" />
        </ButtonLink>
      </div>
    </div>
  </div>
);

/***********************************
 * 5) Parcours & Sélection
 ***********************************/
const Parcours = () => (
  <Section id="selection">
    <Container>
      <Heading
        kicker="Parcours"
        title="De la candidature à l’excellence"
        subtitle="Gratuit, mais exigeant — l’effort et l’assiduité priment."
      />

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <Step no="01" title="Candidature" desc="Dossier + test d’entrée. Sélection selon potentiel et motivation." />
        <Step no="02" title="Engagement" desc="Assiduité minimale et suivi. Progression mesurable." />
        <Step no="03" title="Excellence" desc="Préparation bac. Méthodes, accompagnement et orientation." />
      </div>
    </Container>
  </Section>
);

const Step = ({ no, title, desc }) => (
  <Card>
    <Kicker>Étape {no}</Kicker>
    <div className="mt-2 text-lg font-semibold text-slate-900">{title}</div>
    <p className="mt-2 text-sm text-slate-600">{desc}</p>
  </Card>
);

/***********************************
 * 6) Gratuité & Bourse d'excellence (avec photo)
 ***********************************/
const GratuitBourse = () => (
  <Section id="bourse">
    <Container>
      <Heading
        kicker="Engagement social"
        title="Gratuité & bourse d’excellence"
        subtitle="Nous investissons dans le potentiel et la progression."
      />

      <div className="mt-10 grid gap-6 md:grid-cols-5 items-stretch">
        <div className="md:col-span-3">
          <Card className="h-full">
            <div className="text-lg font-semibold text-slate-900">Gratuité</div>
            <p className="mt-2 text-sm text-slate-600">
              Aucun frais d’inscription ni de scolarité. En contrepartie : présence, rigueur et progression.
            </p>

            <Divider />

            <div className="text-lg font-semibold text-slate-900">Bourse Top 3</div>
            <p className="mt-2 text-sm text-slate-600">
              Après le baccalauréat, les 3 meilleurs peuvent obtenir une <strong>bourse d’excellence</strong> pour l’université.
            </p>
          </Card>
        </div>

        <div className="md:col-span-2">
          <figure className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm h-full">
            <img
              src={imgs.bourse}
              alt="Remise de bourses d'excellence"
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <figcaption className="px-4 py-3 text-sm text-slate-600">
              Bourse d’excellence — Top 3
            </figcaption>
          </figure>
        </div>
      </div>
    </Container>
  </Section>
);

/***********************************
 * 7) Informatique — en images
 ***********************************/
const InformatiqueImages = () => (
  <Section id="informatique-photos">
    <Container>
      <Heading
        kicker="Informatique"
        title="Apprendre par la pratique"
        subtitle="Algorithmique, Python, web — encadré par l’enseignant responsable de la plateforme."
      />

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Photo img={imgs.info1} caption="Atelier Python — logique & algorithmes" />
        <Photo img={imgs.info2} caption="Initiation web — HTML/CSS/JS" />
      </div>
    </Container>
  </Section>
);

/***********************************
 * 8) Équipe & étudiants
 ***********************************/
const Team = () => (
  <Section id="equipe">
    <Container>
      <Heading
        kicker="Communauté"
        title="Équipe pédagogique & étudiants"
        subtitle="Une communauté où l’on progresse ensemble."
      />

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Photo img={imgs.enseignants2} caption="Enseignants & étudiants — pendant les sessions" />
        <Photo img={imgs.enseignants} caption="Journée d’échanges et d’accompagnement" />
      </div>
    </Container>
  </Section>
);

/***********************************
 * 9) Portails par rôle
 ***********************************/
const Roles = () => (
  <Section id="roles">
    <Container>
      <Heading
        kicker="Accès"
        title="Un espace dédié pour chaque rôle"
        subtitle="Même logique, objectifs différents — efficacité et clarté."
      />

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <RoleCard icon={Shield} title="Admin" bullets={["Gestion globale", "Utilisateurs & rôles", "Paramètres"]} href="/connexion" />
        <RoleCard icon={Building2} title="Professeur" bullets={["Classes & notes", "Présence", "Évaluations"]} href="/connexion" />
        <RoleCard icon={GraduationCap} title="Élève" bullets={["Emploi du temps", "Messages", "Évaluations"]} href="/connexion" />
        <RoleCard icon={Users} title="Parent" bullets={["Vue enfant", "Événements", "Contact"]} href="/connexion" />
      </div>
    </Container>
  </Section>
);

const RoleCard = ({ icon: Icon, title, bullets, href }) => (
  <Card>
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 border border-slate-200">
        <Icon className="h-5 w-5 text-slate-700" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
    </div>

    <ul className="mt-4 space-y-2 text-sm text-slate-600 list-disc pl-5">
      {bullets.map((b, i) => (
        <li key={i}>{b}</li>
      ))}
    </ul>

    <div className="mt-5">
      <ButtonLink href={href} variant="primary" className="w-full">
        Entrer
      </ButtonLink>
    </div>
  </Card>
);

/***********************************
 * 10) FAQ (FR)
 ***********************************/
const FAQ = () => (
  <Section id="faq">
    <Container>
      <Heading kicker="FAQ" title="Questions fréquentes" subtitle="Réponses rapides pour les élèves et parents." />
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <FaqItem q="Est-ce mobile ?" a="Oui. L’interface est responsive (téléphone, tablette, bureau)." />
        <FaqItem q="Qui peut s’inscrire ?" a="Collégiens et lycéens motivés. Sélection sur dossier et test d’entrée." />
        <FaqItem q="Les cours sont-ils vraiment gratuits ?" a="Oui, à condition de respecter l’assiduité et les objectifs." />
        <FaqItem q="Comment fonctionne la bourse ?" a="Après le bac, les 3 meilleurs peuvent obtenir une bourse d’excellence." />
      </div>
    </Container>
  </Section>
);

const FaqItem = ({ q, a }) => (
  <Card>
    <div className="text-sm font-semibold text-slate-900">{q}</div>
    <div className="mt-2 text-sm text-slate-600">{a}</div>
  </Card>
);

/***********************************
 * Footer minimal (MODEL 3)
 ***********************************/
const Footer = () => (
  <footer className="border-t border-slate-200 bg-white py-10">
    <Container>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-slate-500">
          © {new Date().getFullYear()} Takwa Établissement — Tous droits réservés.
        </div>
        <div className="flex gap-4 text-xs">
          <a href="/#programmes" className="text-slate-600 hover:text-slate-900">Programmes</a>
          <a href="/#plateforme" className="text-slate-600 hover:text-slate-900">Plateforme</a>
          <a href="/connexion" className="text-slate-600 hover:text-slate-900">Connexion</a>
        </div>
      </div>
    </Container>
  </footer>
);

/***********************************
 * Export par défaut
 ***********************************/
export default function HomePageFR() {
  return (
    <PageShell>
      <main>
        <Hero />
        <Programmes />
        <Plateforme />
        <Forums />
        <Parcours />
        <GratuitBourse />
        <InformatiqueImages />
        <Team />
        <Roles />
        <FAQ />
      </main>
      <Footer />
    </PageShell>
  );
}

/***********************************
 * Notes MODEL 3 (réutilisable Login/Dashboard)
 * - Cartes: rounded-lg + border-slate-200 + bg-white + shadow-sm
 * - Boutons: primary slate-800 / secondary blanc bordé
 * - Typo: sans effets, hiérarchie claire
 * - Animations: optionnel (ici supprimées pour institutionnel)
 ***********************************/
