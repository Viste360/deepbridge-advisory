import { useLocale, type Locale } from "../i18n";

/** Add only records with written publication approval and verified attribution. */
export type ApprovedProject = {
  id: string;
  approvedForPublication: true;
  copy: Record<Locale, { sector: string; challenge: string; role: string; expertise: string; work: string; status: string }>;
};
export const approvedProjects: ApprovedProject[] = [];

export function ProjectExperience({ projects = approvedProjects }: { projects?: ApprovedProject[] }) {
  const { locale, t } = useLocale();
  const approved = projects.filter(project => project.approvedForPublication);
  if (!approved.length) return null;
  return <section className="section project-experience"><div className="shell"><p className="eyebrow">{t("Project experience", "Projekterfahrung", "Experiencia en proyectos")}</p><h2>{t("Experience in context.", "Erfahrung im Projektkontext.", "Experiencia en su contexto.")}</h2><div className="project-grid">{approved.map(project=> {
    const copy = project.copy[locale];
    return <article key={project.id}><h3>{copy.sector}</h3><dl>{[[t("Challenge", "Aufgabe", "Reto"),copy.challenge],[t("DeepBridge’s role", "Rolle von DeepBridge", "Papel de DeepBridge"),copy.role],[t("Expertise", "Expertise", "Especialidades"),copy.expertise],[t("Work undertaken", "Erbrachte Leistungen", "Trabajo realizado"),copy.work],[t("Outcome or current status", "Ergebnis oder aktueller Stand", "Resultado o situación actual"),copy.status]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></article>;
  })}</div></div></section>;
}
