export type InsightSection = {
  heading: string;
  paragraphs: string[];
  checklist?: string[];
};

export type Insight = {
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  introduction: string;
  published: string;
  updated: string;
  readingTime: string;
  keyPoints: string[];
  sections: InsightSection[];
};

export const insights: Insight[] = [
  {
    slug: "defining-transformation-consultant-requirement",
    title: "How to define a transformation consultant requirement",
    description:
      "A practical framework for turning a broad transformation need into a focused consultant brief that can be assessed and delivered.",
    eyebrow: "Requirement design",
    introduction:
      "A credible consultant search begins before a job title is chosen. The strongest briefs explain the outcome, programme context and authority the specialist will need—not simply a list of technologies.",
    published: "2026-08-13",
    updated: "2026-08-13",
    readingTime: "6 minute read",
    keyPoints: [
      "Lead with the delivery outcome.",
      "Explain the programme stage and constraints.",
      "Separate essential experience from useful signals.",
      "Make authority, working model and timing explicit.",
    ],
    sections: [
      {
        heading: "Start with the outcome, not the title",
        paragraphs: [
          "Titles vary considerably between organisations. A transformation lead in one programme may own governance and executive alignment; in another, the same title may describe day-to-day workstream coordination. Starting with the title therefore creates avoidable ambiguity.",
          "A stronger brief states what must be true at the end of the assignment. That might be an agreed operating model, a stabilised deployment plan, a governed data migration, or a workstream brought back under control. This gives potential specialists a concrete result against which to judge their relevance.",
        ],
      },
      {
        heading: "Make the programme context explicit",
        paragraphs: [
          "The same technical capability can perform very differently depending on the environment around it. Programme stage, sponsorship, decision rights, incumbent partners, geographic coverage and the maturity of the internal team all shape the requirement.",
          "Useful context does not need to disclose confidential information. It should explain whether the programme is in discovery, design, implementation, recovery or stabilisation; which functions and countries are affected; and where the role sits in the governance structure.",
        ],
      },
      {
        heading: "Separate essentials from useful signals",
        paragraphs: [
          "Long requirement lists can obscure the experience that genuinely predicts success. Distinguish the few non-negotiable capabilities from evidence that is helpful but transferable. For example, a specific SAP module may be essential, while experience in an adjacent industry may still be relevant if the operating model and delivery challenges are comparable.",
          "This distinction allows a focused search without making the pool artificially narrow. It also makes assessment more consistent because each profile can be evaluated against the same priorities.",
        ],
      },
      {
        heading: "Define authority, working model and timing",
        paragraphs: [
          "Senior specialists need to understand what they can decide, who they influence and how success will be measured. Clarify reporting lines, stakeholder access, expected deliverables and whether the role leads a team, advises a leader or owns a workstream.",
          "Location, travel, remote-working expectations, target start date, likely duration and interview availability are also part of the requirement. Treating them as core information avoids late-stage misalignment.",
        ],
        checklist: [
          "Outcome and first 90-day priorities",
          "Programme stage, scope and current pressure points",
          "Essential capability and acceptable transferable experience",
          "Decision authority, reporting line and stakeholders",
          "Location, working model, timing and expected duration",
        ],
      },
      {
        heading: "How DeepBridge approaches the brief",
        paragraphs: [
          "DeepBridge begins with the delivery context and tests the brief before beginning a search. The aim is to identify a small number of relevant independent specialists and to stay involved through contracting, onboarding and delivery—not to create volume around an unclear requirement.",
        ],
      },
    ],
  },
  {
    slug: "when-sap-programme-needs-independent-specialist-support",
    title: "When an SAP programme needs independent specialist support",
    description:
      "The practical signals that an SAP transformation may need focused independent expertise alongside internal teams and delivery partners.",
    eyebrow: "SAP transformation",
    introduction:
      "Independent specialists are most valuable when they close a defined capability or leadership gap. They should strengthen accountability and delivery—not add another layer of governance.",
    published: "2026-08-13",
    updated: "2026-08-13",
    readingTime: "7 minute read",
    keyPoints: [
      "Use specialists for a defined gap, not general capacity.",
      "Look for evidence across process, technology and delivery.",
      "Set decision rights before the assignment begins.",
      "Plan knowledge transfer from the outset.",
    ],
    sections: [
      {
        heading: "A critical workstream lacks experienced ownership",
        paragraphs: [
          "SAP programmes depend on connected decisions across process, data, integration, testing, deployment and adoption. If a critical workstream has activity but no experienced owner, issues tend to surface late and across several teams at once.",
          "A specialist can provide focused ownership where the internal team has limited capacity or where the programme needs experience from comparable delivery situations. The requirement should be framed around the decisions and outcomes that person will own.",
        ],
      },
      {
        heading: "Business and technology teams are not reaching decisions",
        paragraphs: [
          "Repeated design discussions, unresolved process ownership and unclear escalation routes are often signs of a translation gap rather than a purely technical problem. The programme may need someone who can connect operating priorities with system choices and make trade-offs visible to decision-makers.",
          "Relevant experience is broader than product knowledge. It includes stakeholder alignment, process design, governance and the ability to move a decision through a complex organisation.",
        ],
      },
      {
        heading: "The programme is moving into a higher-risk phase",
        paragraphs: [
          "The expertise required during discovery is not identical to the expertise needed for testing, cutover, deployment or stabilisation. Teams should revisit capability as the programme moves between phases rather than assuming the original structure remains sufficient.",
          "Independent support can be particularly useful when a programme needs short-term depth for a demanding phase, provided the remit, authority and handover are clear.",
        ],
      },
      {
        heading: "Recovery needs an objective view",
        paragraphs: [
          "When milestones slip or confidence declines, adding more general resource rarely resolves the underlying issue. A recovery requirement should identify the specific decisions, dependencies or leadership gaps preventing progress.",
          "An independent specialist can help establish a fact base, reset priorities and create a practical route back to controlled delivery. Independence is useful only when the person has access to the right information and a clear mandate from programme leadership.",
        ],
        checklist: [
          "The exact capability or ownership gap",
          "The decisions the specialist can make or recommend",
          "Interfaces with internal teams and delivery partners",
          "Success measures for the assignment",
          "Knowledge-transfer and exit expectations",
        ],
      },
      {
        heading: "Select for the real programme environment",
        paragraphs: [
          "DeepBridge assesses SAP and transformation specialists against the programme stage, operating context, stakeholder environment and intended outcome. The objective is a relevant match between the work and the person, supported through a clear engagement process.",
        ],
      },
    ],
  },
  {
    slug: "building-cross-border-transformation-teams-uk-europe",
    title: "Building cross-border transformation teams across the UK and Europe",
    description:
      "A practical guide to capability, governance, location and engagement considerations when transformation teams span the UK and Europe.",
    eyebrow: "Cross-border delivery",
    introduction:
      "International programmes need more than people in multiple locations. They need a shared delivery model that makes accountability, working patterns and local constraints clear from the beginning.",
    published: "2026-08-13",
    updated: "2026-08-13",
    readingTime: "7 minute read",
    keyPoints: [
      "Design around outcomes and decision coverage.",
      "Treat location as a delivery consideration.",
      "Clarify engagement constraints early.",
      "Create one operating rhythm across countries.",
    ],
    sections: [
      {
        heading: "Build capability around the programme map",
        paragraphs: [
          "A cross-border team should reflect where processes are owned, where decisions are made and where implementation happens. A role described as European may still need deep engagement with a central design authority, local business leads or deployment teams in particular markets.",
          "Map the key outcomes, workstreams, countries and decision forums before deciding where each specialist should sit. This exposes gaps in language, time-zone coverage, local process knowledge and stakeholder access.",
        ],
      },
      {
        heading: "Treat location as part of delivery design",
        paragraphs: [
          "Remote work can widen access to specialist capability, but it does not remove the need for purposeful in-person interaction. Design workshops, executive decisions, testing events, deployment and recovery periods may require different attendance patterns.",
          "State the expected base, travel frequency and on-site moments in the brief. This enables consultants to assess the assignment honestly and prevents working-model assumptions becoming delivery friction later.",
        ],
      },
      {
        heading: "Resolve engagement considerations early",
        paragraphs: [
          "Cross-border assignments may involve questions about contracting entities, work location, right to work, taxation, social security, insurance, data handling and employment status. These matters depend on the facts and jurisdictions involved.",
          "They should be identified early and reviewed by appropriately qualified legal, tax, immigration or employment-status advisers where required. Commercial momentum is not a substitute for a workable engagement structure.",
        ],
      },
      {
        heading: "Create one operating rhythm",
        paragraphs: [
          "Distributed specialists are effective when priorities, decision rights and reporting are consistent. Establish a common cadence for workstream reviews, dependency management, escalation and stakeholder communication.",
          "Avoid creating a central team and several local teams that interpret progress differently. A concise set of shared measures and a visible decision log can do more for alignment than additional meetings.",
        ],
        checklist: [
          "Country, workstream and decision coverage",
          "Language and stakeholder requirements",
          "Remote, on-site and travel expectations",
          "Contracting and compliance questions requiring advice",
          "Shared governance, measures and escalation routes",
        ],
      },
      {
        heading: "Focused international support",
        paragraphs: [
          "DeepBridge supports organisations building transformation teams across the UK and Europe. We focus on the practical delivery requirement, identify relevant independent specialists and coordinate the engagement while recognising where qualified external advice is needed.",
        ],
      },
    ],
  },
];

export function getInsight(slug: string) {
  return insights.find((insight) => insight.slug === slug);
}
