

import React from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Shield,
  Users,
  Building2,
  Sparkles,
  ChevronLeft,
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
    "rounded-2xl bg-white/75 backdrop-blur shadow-[0_12px_40px_rgba(0,0,0,.08)] ring-1 ring-black/5",
  section: "py-16 sm:py-20",
  title:
    "text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight",
  subtitle: "mt-4 text-slate-600 max-w-2xl",
};

/* ================= IMAGES ================= */
const imgs = {
  hero: "/Img/jokerInit.jpg",
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
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-600/10 px-4 py-1 text-xs font-semibold text-indigo-700">
            <Sparkles className="h-4 w-4" />
            تعليم مجاني ومنهجي
          </span>

          <h1 className="mt-6 text-4xl sm:text-5xl font-extrabold text-slate-900 leading-[1.15]">
            نُعِدّ اليوم… <br />
            <span className="text-indigo-700">لننجح غدًا</span>
          </h1>

          <p className="mt-6 text-slate-600 max-w-xl text-lg leading-8">
            مؤسسة تقوى ترافق التلاميذ من الإعدادي إلى الجامعة عبر تعليم صارم،
            متابعة إنسانية، ومنحة تميّز لأفضل المتفوقين بعد البكالوريا.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="/connexion"
              className="rounded-full bg-indigo-700 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-800"
            >
              الدخول إلى حسابي
            </a>
            <a
              href="#programmes"
              className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              اكتشف برامجنا
            </a>
          </div>

          {/* Trust strip */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-slate-700">
            <div className={cn(tokens.card, "p-4")}>
              <div className="font-semibold">مجانية 100%</div>
              <div className="text-xs text-slate-600 mt-1">
                بدون رسوم تسجيل أو دراسة
              </div>
            </div>
            <div className={cn(tokens.card, "p-4")}>
              <div className="font-semibold">اختيار وانضباط</div>
              <div className="text-xs text-slate-600 mt-1">
                متابعة صارمة وعتبات حضور
              </div>
            </div>
            <div className={cn(tokens.card, "p-4")}>
              <div className="font-semibold">منحة تميّز</div>
              <div className="text-xs text-slate-600 mt-1">
                للأوائل بعد البكالوريا
              </div>
            </div>
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
            alt="تلاميذ تكوى"
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
      <h2 className={tokens.title}>برامجنا التعليمية</h2>
      <p className={tokens.subtitle + " mx-auto"}>
        تعليم مُنظَّم يركز على الفهم، المنهجية، والنتائج.
      </p>
    </div>

    <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {[
        { title: "الرياضيات", desc: "تفكير منطقي + تقنيات الامتحان" },
        { title: "الفيزياء والكيمياء", desc: "تطبيقات + تجارب + حل مسائل" },
        { title: "اللغات", desc: "تعبير + فهم + قواعد" },
        { title: "الإعلاميات", desc: "خوارزميات + Python + Web" },
      ].map((it) => (
        <div key={it.title} className={cn(tokens.card, "p-6")}>
          <h3 className="text-lg font-semibold text-slate-900">{it.title}</h3>
          <p className="mt-2 text-sm text-slate-600 leading-7">{it.desc}</p>
        </div>
      ))}
    </div>
  </Section>
);

/* ================= PLATFORM ================= */
const Platform = () => (
  <Section id="plateforme">
    <div className="text-center">
      <h2 className={tokens.title}>منصة رقمية حديثة</h2>
      <p className={tokens.subtitle + " mx-auto"}>
        فضاء آمن ومنظم للإدارة، الأساتذة، التلاميذ والآباء.
      </p>
    </div>

    <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <Feature icon={CalendarDays} title="جداول زمنية" desc="عرض واضح حسب المستوى والقسم." />
      <Feature icon={QrCode} title="الحضور عبر QR" desc="تسجيل سريع وموثوق." />
      <Feature icon={MessageSquare} title="مراسلة" desc="إعلانات ورسائل مباشرة." />
      <Feature icon={FileText} title="تقييمات" desc="فروض وQCM ونتائج." />
      <Feature icon={BellRing} title="أحداث وتنبيهات" desc="اجتماعات، امتحانات، تذكير." />
      <Feature icon={Shield} title="أمان بالأدوار" desc="صلاحيات واضحة وخصوصية." />
    </div>
  </Section>
);

const Feature = ({ icon: Icon, title, desc }) => (
  <div className={cn(tokens.card, "p-6 flex gap-4 items-start")}>
    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600/10">
      <Icon className="h-6 w-6 text-indigo-700" />
    </div>
    <div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-600 mt-1 leading-7">{desc}</p>
    </div>
  </div>
);

/* ================= ROLES ================= */
const Roles = () => (
  <Section id="roles">
    <div className="text-center">
      <h2 className={tokens.title}>مساحة لكل دور</h2>
      <p className={tokens.subtitle + " mx-auto"}>
        نفس التجربة البصرية… لكن أدوات مختلفة حسب الحاجة.
      </p>
    </div>

    <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <Role icon={Shield} title="الإدارة" bullets={["إدارة شاملة", "مستخدمون وصلاحيات", "إعدادات"]} />
      <Role icon={Building2} title="الأستاذ" bullets={["أقسام ونقط", "الحضور", "اختبارات"]} />
      <Role icon={GraduationCap} title="التلميذ" bullets={["الجدول", "الرسائل", "النتائج"]} />
      <Role icon={Users} title="الولي" bullets={["متابعة الابن", "الأحداث", "التواصل"]} />
    </div>
  </Section>
);

const Role = ({ icon: Icon, title, bullets }) => (
  <div className={cn(tokens.card, "p-6 text-right")}>
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600/10">
        <Icon className="h-6 w-6 text-indigo-700" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
    </div>

    <ul className="mt-4 space-y-2 text-sm text-slate-600 list-disc pr-5">
      {bullets.map((b, i) => (
        <li key={i} className="leading-7">{b}</li>
      ))}
    </ul>

    <a
      href="/connexion"
      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-indigo-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800"
    >
      دخول <ChevronLeft className="h-4 w-4" />
    </a>
  </div>
);

/* ================= FOOTER ================= */
const Footer = () => (
  <footer className="border-t py-8 text-center text-xs text-slate-500">
    © {new Date().getFullYear()} مؤسسة تقوى — جميع الحقوق محفوظة
  </footer>
);

/* ================= EXPORT ================= */
export default function HomePageAR() {
  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <Hero />
      <Programmes />
      <Platform />
      <Roles />
      <Footer />
    </div>
  );
}
