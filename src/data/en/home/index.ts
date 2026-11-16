export const enHomeData = {
  sectionLabels: [
    "Hero",
    "Efficacy",
    "Visual Evidence",
    "Pillars",
    "Micro-Biome Explorer",
    "Formulations",
    "Fermentation Hub",
    "Chronology",
    "Impact",
    "Publications",
    "Consultation",
  ],
  hero: {
    badge:
      "LIVE SYMBIOSIS TELEMETRY | CPU 1.4 x 10⁹ / ML | PSEUDOMONAS & BACILLUS V.4",
    eyebrow: "RHIZOSPHERE BIO-ENGINEERING",
    titleLine1: "Empowering Life",
    titleLine2: "At the Root.",
    subtitle:
      "Pioneering next-generation agricultural biotechnology, soil-specific probiotics, and advanced microbial inputs engineered for hyper-arid climate resilience and unprecedented crop vigor.",
    primaryButton: "Explore Ion Smart Series",
    secondaryButton: "Discover Our Science",
    trustTitle: "Accredited Sovereign Laboratory",
    trustSubtitle:
      "Official certification from National Soil & Water Research Institute & Knowledge-Enterprise accreditation.",
    scroll: "SCROLL TO EXPLORE",
    image: {
      badge: "LIVE ACTIVE CULTURE",
      terminal: "#KZ-8821 RHIZO-NET",
      cardColonizationTitle: "MYCORRHIZAL COLONIZATION",
      cardColonizationValue: "94.8%",
      cardColonizationSub: "Tolerance: 14 dS/m",
      cardNetworkTitle: "SUB-SOIL NETWORK",
      cardNetworkValue: "ACTIVE NODULES: 1,204",
    },
  },
  efficacy: {
    eyebrow: "PHENOTYPING & TELEMETRY",
    title: "Quantified Agronomic Efficacy",
    subtitle:
      "Empirical data aggregated across multi-season trials across 12 distinct soil salinity gradients in central arid plateaus.",
    badge: "N=1,420 Hectares Monitored",
    metrics: [
      {
        id: "m1",
        label: "RHIZO-EXP",
        icon: "Brain",
        value: "+35%",
        title: "Root Expansion",
        description:
          "Enhanced secondary rootlet architecture under severe osmotic barrier stress.",
        type: "chart",
      },
      {
        id: "m2",
        label: "CHL-RET",
        icon: "Leaf",
        value: "+28%",
        title: "Chlorophyll Retention",
        description:
          "Sustained light absorption under ambient mid-summer canopy heats exceeding 44°C.",
        type: "chart",
        theme: { accent: "secondary" },
      },
      {
        id: "m3",
        label: "GROVE-ROI",
        icon: "TrendingUp",
        value: "+22%",
        title: "Economic Yield Lift",
        description:
          "Commercial dry-weight nut & fruit harvest yield across multi-hectare plantations.",
        type: "chart",
      },
      {
        id: "m4",
        label: "CLEAN-RES",
        icon: "ShieldCheck",
        value: "100%",
        title: "Bio-Safe & Pure",
        description:
          "Completely free of synthetic nitrates, chlorine salts, and heavy-metal impurities.",
        type: "progress",
        progressText: "ZERO HALOGEN",
        theme: { accent: "secondary" },
      },
    ],
  },
  fieldEvidence: {
    badge: "Field Scale Evidence",
    title: "From Degraded Salt Crusts to Bountiful Yields",
    subtitle:
      "Central Iranian orchards face critical groundwater depletion and dangerous salinity buildup. Kian Zist formulations restore root rhizosphere conductivity and mobilize bound trace nutrients under extreme osmotic stress.",
    stats: [
      {
        id: "fe1",
        icon: "Sprout",
        title: "3,500+ Hectares Reclaimed",
        value: "Rafsanjan & Yazd",
      },
      {
        id: "fe2",
        icon: "TrendingDown",
        title: "-40% Synthetic Fertilizer Need",
        value: "Urea & DAP Saved",
      },
      {
        id: "fe3",
        icon: "ShieldCheck",
        title: "+21% Marketable Grade A Yield",
        value: "Akbari & Aghaei",
      },
    ],
  },
  pillars: {
    eyebrow: "RESEARCH FOUNDATIONS",
    title: "Biotech Capabilities Engineered at Molecular Scale",
    subtitle:
      "Merging advanced microbial genomics with field-grade formulation architecture to solve acute nutrient deficiency in arid and hyper-saline soils.",
    items: [
      {
        id: "p1",
        icon: "FlaskConical",
        pillarLabel: "PILLAR // 01",
        title: "Bio-Fertilizers & Stimulants",
        description:
          "Targeted synthesis of pure L-amino acids, biological fulvates, and enzymatic catalytic accelerators that trigger direct root nutrient uptake.",
        linkText: "Enzyme Catalysis",
        href: "#",
      },
      {
        id: "p2",
        icon: "Microscope",
        pillarLabel: "PILLAR // 02",
        title: "Strain Formulation & Culturing",
        description:
          "Exclusive isolation of native Plant Growth-Promoting Rhizobacteria (PGPR) bred to withstand high electrical conductivity and dry heat.",
        linkText: "Native PGPR Strains",
        href: "#",
      },
      {
        id: "p3",
        icon: "Dna",
        pillarLabel: "PILLAR // 03",
        title: "Soil R&D Laboratories",
        description:
          "ISO-17025 accredited rhizosphere geochemistry screening, high-throughput metagenomic profiling, and bio-chelation efficacy analysis.",
        linkText: "ISO-17025 Standards",
        href: "#",
      },
      {
        id: "p4",
        icon: "ShieldCheck",
        pillarLabel: "PILLAR // 04",
        title: "Field Monitoring & Academy",
        description:
          "Dedicated on-site agronomist deployment, seasonal microbial soil profiling, and grower education workshops to guarantee bio-assimilation.",
        linkText: "Agronomic Academics",
        href: "#",
      },
    ],
  },
  rhizosphereExplorer: {
    badge: "Microbiology In-Depth",
    title: "The Rhizosphere Micro-Biome Explorer",
    subtitle:
      "Witness how bio-luminescent microbial consortia colonize roots, establishing a defensive living biofilm and mobilizing macro-minerals.",
    image: "/images/rhizosphere-bio.png", // Replace with your image path
    overlayLabel: "ACTIVE SYMBIOTIC COLONIZATION",
    overlayValue: "94.8% Root Coverage Attained",
    overlayBadge: "CONFOCAL SCAN",
    steps: [
      {
        id: "rs1",
        num: "1",
        title: "Phase 1: Chemotaxis & Exudate Attraction",
        desc: "Flagella navigate chemical root gradients within 24 hours of application.",
      },
      {
        id: "rs2",
        num: "2",
        title: "Phase 2: Biofilm & EPS Protective Sheath",
        desc: "Living exopolysaccharide matrix buffers tender root hairs against sodium ions.",
      },
      {
        id: "rs3",
        num: "3",
        title: "Phase 3: Mineral Phosphate & Iron Solubilization",
        desc: "Gluconic acids unbind insoluble calcium phosphates in high pH lime soils.",
      },
      {
        id: "rs4",
        num: "4",
        title: "Phase 4: Long-Term Osmotic Turgor Defense",
        desc: "Maintains cell wall turgor and hydration during peak summer drought cycles.",
      },
    ],
  },
  formulations: {
    eyebrow: "BIOLOGICAL INOCULANT PORTFOLIO",
    title: "Flagship Bio-Formulation Series",
    subtitle:
      "Engineered bio-agents suspended in stable prebiotic matrix for precision fertigation and soil revitalization.",
    badge: "Formulation Batch 2025-Q2",
    items: [
      {
        id: "f1",
        name: "Bacto Smart™",
        nameHighlight: "Green",
        eyebrow: "NITROGEN FIXER & VEGETATIVE VIGOR",
        description:
          "Enriched with endophytic Azotobacter and photosynthetic bacteria. Optimizes nitrogen assimilation while stimulating auxin release for canopy volume.",
        image: "/images/products/product1.png",
        cfu: "CFU: 1.2 × 10⁹/mL",
        specs: [
          { label: "Application Mode", value: "Foliar & Fertigation" },
          { label: "Shelf Stability", value: "18 months @ 25°C" },
        ],
        buttonText: "Download TDS (PDF)",
        tone: "primary",
      },
      {
        id: "f2",
        name: "Bacto Smart™",
        nameHighlight: "Gold",
        eyebrow: "PHOSPHORUS & SALINITY BUFFERING",
        description:
          "Contains concentrated Bacillus megaterium and Pseudomonas putida. Unlocks locked tricalcium phosphate and suppresses sodium ion root toxicity.",
        image: "/images/products/product1.png",
        cfu: "CFU: 1.5 × 10⁹/mL",
        specs: [
          { label: "Application Mode", value: "Fertigation & Drip Banding" },
          { label: "Phosphate Cleavage", value: "High Acid Phosphatase" },
        ],
        buttonText: "Download TDS (PDF)",
        tone: "secondary",
      },
    ],
  },
  fermentationHub: {
    badge: "Industrial Scalability",
    title: "Metagenomic Research & 500,000L Fermentation Hub",
    subtitle:
      "Our state-of-the-art cleanroom bioreactor infrastructure scales beneficial halotolerant strains without genetic modification, delivering industrial stability.",
    image: "/images/fermentation-hub.png",
    imageOverlayTitle: "Automated Continuous Multi-Stage Fermentation",
    imageOverlaySubtitle:
      "ISO 17025 Certified Bio-Processing & Cryo-Preservation",
    imageBadge: "> 2.5 × 10⁹ CFU/mL Output",
  },
  chronology: {
    eyebrow: "CHRONOLOGY OF CELLULAR ACTION",
    title: "How Bio-Strains Colonize and Awaken Soil",
    subtitle:
      "From dormant spore activation to self-sustaining rhizosphere bio-shielding over a 30-day vegetative metabolic cycle.",
    items: [
      {
        id: "c1",
        step: "01",
        time: "Days 01-04",
        title: "Targeted Inoculation",
        description:
          "Spores break dormancy via exudate cues. PGPR clusters adhere to root epidermis hairs forming preliminary protective biofilm shields.",
        footerText: "Chemotactic Homing",
        icon: "sensors",
      },
      {
        id: "c2",
        step: "02",
        time: "Days 05-12",
        title: "Mineralization Surge",
        description:
          "Bacterial secretion of organic gluconic and 2-ketogluconic acids solubilizes precipitated phosphorus, iron, and zinc into plant-absorbable ions.",
        footerText: "PO₄³⁻ Ion Release",
        icon: "bolt",
      },
      {
        id: "c3",
        step: "03",
        time: "Days 13-24",
        title: "Root Architecture Shift",
        description:
          "Endogenous IAA hormone modulation induces rapid branching of lateral roots, dramatically expanding moisture intake radius by up to 35%.",
        footerText: "Lateral Proliferation",
        icon: "account_tree",
      },
      {
        id: "c4",
        step: "04",
        time: "Day 25 Onward",
        title: "Systemic Bio-Shield",
        description:
          "Establishment of Induced Systemic Resistance (ISR) against opportunistic root-rot pathogens (Fusarium, Phytophthora) under acute water stress.",
        footerText: "Permanent Symbiosis",
        icon: "Shield",
      },
    ],
  },
  impact: {
    eyebrow: "REAL FARM IMPACT",
    title: "Commercial Results From Extreme Environments",
    subtitle:
      "Documented field outcomes under severe saline water conditions where conventional chemical programs failed to sustain canopy vitality.",
    testimonial: {
      stars: 5,
      badge: "VERIFIED COMMERCIAL HARVEST TRIAL",
      text: "After two consistent applications of Bacto Smart Gold in our 120-hectare pistachio groves, root mass development and canopy density were remarkably superior compared to our untreated control plots—even with water EC peaking at 9.4 dS/m.",
      authorName: "Eng. M. Rezaei",
      authorTitle:
        "Chief Agronomist, Rafsanjan Plains (120 ha Commercial Pistachio)",
      initials: "MR",
    },
    assay: {
      eyebrow: "FIELD ASSAY #EC-81",
      title: "Root Tip Elongation Velocity",
      badge: "mm / 24h",
      bars: [
        {
          label: "Kian Zist Bacto Smart (Gold)",
          value: "3.9 mm/day (+116%)",
          percent: 100,
          dotColor: "bg-kz-brand-accent shadow-kz-glow-accent",
          barColor: "bg-kz-brand-primary",
          textColor: "text-kz-brand-accent",
          shimmer: true,
        },
        {
          label: "Conventional Synthetic NPK",
          value: "2.6 mm/day (+44%)",
          percent: 66,
          dotColor: "bg-kz-text-muted",
          barColor: "bg-kz-text-muted/70",
          textColor: "text-kz-text-muted",
          shimmer: false,
        },
        {
          label: "Untreated Saline Soil (Control)",
          value: "1.8 mm/day",
          percent: 45,
          dotColor: "bg-kz-border-strong",
          barColor: "bg-kz-border-strong",
          textColor: "text-kz-text-heading",
          shimmer: false,
        },
      ],
      note: "*Observed in sandy-loam substrate at EC 8.9 dS/m, soil temperature 31°C across 45 continuous days of vegetative growth.",
    },
  },
  publications: {
    eyebrow: "PEER-REVIEWED KNOWLEDGE",
    title: "Scientific Insights & Publications",
    subtitle:
      "Original research briefs and experimental documentation authored by our molecular biology research team.",
    exploreText: "Explore Academic Repository",
    exploreLink: "#",
    items: [
      {
        id: "pub1",
        image: "/images/pic1.png",
        category: "BIO-GENOMICS // PAPER 44",
        title: "Role of Native PGPR Bacteria in Alleviating Soil Osmotic Shock",
        description:
          "An analysis of exopolysaccharide (EPS) secretion by salt-tolerant bacterial consortia under severe sodium accumulation.",
        date: "Published: Jan 2025",
        linkText: "Read Study",
        href: "#",
      },
      {
        id: "pub2",
        image: "/images/pic2.png",
        category: "SOIL CHEMISTRY // PAPER 38",
        title:
          "Breakthrough in Microbial Phosphate Solubilization in Arid Soils",
        description:
          "Quantitative validation of tricalcium phosphate dissolution dynamics utilizing Pseudomonas putida bio-catalysts.",
        date: "Published: Nov 2024",
        linkText: "Read Study",
        href: "#",
      },
      {
        id: "pub3",
        image: "/images/pic3.png",
        category: "ARID HORTICULTURE // PAPER 29",
        title:
          "Root Persistence Strategies for Desert Date Palms under Severe Heatwaves",
        description:
          "Evaluating root cellular elasticity and sap-flow integrity in Phoenix dactylifera after regular microbial inoculation.",
        date: "Published: Sep 2024",
        linkText: "Read Study",
        href: "#",
      },
    ],
  },
  consultation: {
    badge: "Agronomic Diagnostic Concierge",
    title: "Direct Agronomic Console",
    subtitle:
      "Deploy Microbial Science to Your Acreage. Our Senior Agronomists and Microbial Genomicists examine your soil EC/pH test results and design customized inoculation schedules.",
    hotlineLabel: "AGRONOMIST PRIORITY HOTLINE",
    hotlineValue: "+98 34 3200 4800",
    addressLabel: "CENTRAL GENOMICS FACILITY",
    addressValue: "Bootia Science Park, Bldg #3",
    form: {
      nameLabel: "Full Name",
      namePlaceholder: "e.g. Dr. Arash Alavi",
      farmLabel: "Farm / Enterprise Name",
      farmPlaceholder: "e.g. Kerman Agro-Industrial Co.",
      cropLabel: "Crop Type & Acreage",
      cropPlaceholder: "e.g. Fandoghi Pistachio (85 Hectares)",
      phoneLabel: "Direct Phone Number",
      phonePlaceholder: "+98 912 000 0000",
      messageLabel: "Soil Analysis / Salinity (EC / pH) / Symptoms",
      messagePlaceholder:
        "Provide EC (dS/m), water pH, or key root challenges...",
      submitButton: "Submit Inquiry & Request Diagnostic Support",
      privacyText: "Strictly confidential data",
    },
  },
};
