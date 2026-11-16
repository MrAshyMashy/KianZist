export const enProductsData = {
  hero: {
    badge:
      "RHIZOSPHERE BIO-INOCULANT PORTFOLIO // COMMERCIAL & FIELD FORMULATIONS",
    titleLine1: "Pioneering Microbial Solutions for",
    titleHighlight: "Resilient Agriculture",
    subtitle:
      "Proprietary probiotic bacteria consortia, microalgal bio-stimulants, and microbial inoculants engineered specifically for saline, hyper-arid soil stresses and maximum harvest index.",
  },
  stats: [
    {
      id: "s1",
      icon: "FlaskConical",
      value: "2",
      label: "FLAGSHIP FORMULATIONS",
    },
    {
      id: "s2",
      icon: "Activity",
      value: "1.4 × 10⁹",
      label: "CFU/ML LIVE VIABILITY",
    },
    {
      id: "s3",
      icon: "ShieldCheck",
      value: "ISO 17025",
      label: "CERTIFIED BIO-ASSAYS",
    },
    {
      id: "s4",
      icon: "Leaf",
      value: "0.00%",
      label: "SYNTHETIC RESIDUE",
    },
  ],
  filters: {
    tabs: [
      { id: "all", label: "All Formulations", active: true },
      { id: "nitrogen", label: "Nitrogen Fixers (Green)", active: false },
      {
        id: "phosphorus",
        label: "Phosphorus & Salinity (Gold)",
        active: false,
      },
      { id: "bio", label: "Bio-Stimulants & Fulvates", active: false },
      { id: "custom", label: "Custom Acreage Blends", active: false },
    ],
    searchPlaceholder: "Lookup strain (e.g., Azotobacter)...",
    dropdownPlaceholder: "All Target Crops",
  },
  showcases: [
    {
      id: "KZB-BSG-2024",
      badge1: "BIOLOGICAL NITROGEN FIXATION",
      badge2: "Agronomic Grade A+",
      title: "Bacto Smart™",
      titleHighlight: "Green",
      subtitle: "Endophytic Nitrogen Fixer & Vegetative Growth Bio-Catalyst",
      description:
        "A state-of-the-art consortium containing high-density associative microorganisms capable of atmospheric nitrogen reduction directly within vegetative tissues. Formulated with biogenic surfactants for rapid leaf cuticle and root epidermis penetration.",
      image: "/images/products/product2.png",
      batch: "NZ-402#",
      volume: "1000 mL NET",
      cfu: "1.4 × 10⁹",
      strains: [
        "Azotobacter chroococcum (AC-89)",
        "Azospirillum brasilense (AZ-14)",
      ],
      outcomes: [
        "Photosynthetic Rate Elevation: +28.4%",
        "Endogenous IAA Auxin Secretion: High",
        "Enhanced Nitrogen Uptake",
      ],
      crops: "Pistachio, Date Palm, Almond, Citrus Groves",
      dosage: "2.0 - 4.0 L / Hectare",
      dosageSub: "(Fertigation / Foliar)",
      ph: "6.2 - 8.8 (Compatible with Alkaline Soils)",
      btnPrimary: "Order Commercial Batch",
      btnSecondary: "Technical Data Sheet (PDF)",
      btnLink: "Compatibility Matrix",
    },
    {
      id: "KZB-BSG-2024-GOLD",
      badge1: "PHOSPHATE SOLUBILIZATION & OSMOPROTECTION",
      badge2: "High-Salinity Resilience (EC 14 dS/m)",
      title: "Bacto Smart™",
      titleHighlight: "Gold",
      subtitle: "Phosphorus Solubilizing & Arid Salinity Mitigation Consortium",
      description:
        "Engineered with high organic acid-synthesizing bacterial strains capable of mobilizing locked tricalcium phosphate minerals in calcium-rich alkaline soils. Produces bacterial exopolysaccharides that shield delicate root hair zones from osmotic dehydration under intense salt concentrations.",
      image: "/images/products/product3.png",
      batch: "AU-911#",
      volume: "1000 mL NET",
      cfu: "1.5 × 10⁹",
      strains: [
        "Bacillus megaterium var. phosphaticum",
        "Pseudomonas putida (PP-S32)",
        "Bacillus subtilis (BS-204)",
      ],
      outcomes: [
        "Bio-Available Phosphorus Gain: +41.2%",
        "Root Biomass Volume Increment: +35.6%",
        "Active Salt Exclusion Halo: 0.8 cm",
      ],
      crops: "Saline & Calcareous Soils, Sodic Farmlands",
      dosage: "3.0 - 5.0 L / Hectare",
      dosageSub: "(Soil Drench / Flush)",
      ph: "Electrical Conductivity Up to 14 dS/m",
      btnPrimary: "Order Commercial Batch",
      btnSecondary: "Technical Data Sheet (PDF)",
      btnLink: "Chromatography Assay",
    },
  ],
  pipeline: {
    eyebrow: "ADVANCED BIOTECHNOLOGY PIPELINE",
    title: "Specialized Formulations in Field Verification",
    badge: "Target Commercial Release: Q3-Q4 2025",
    items: [
      {
        id: "pipe1",
        tag: "TRICHODERMA BIO-SHIELD",
        stage: "STAGE III TRIAL",
        refCode: "REF: RSH-01",
        icon: "ShieldCheck",
        title: "Bacto Root-Shield™ Max",
        description:
          "High-affinity Glomus intraradices mycorrhizal symbiotic shield designed to neutralize Phytophthora gummosis and root rot pathogens via competitive rhizosphere niche exclusion.",
        featureValue: "92% Colonization Rate",
        btnLink: "Pre-Register",
        href: "#",
      },
      {
        id: "pipe2",
        tag: "AMINO-K COMPLEX",
        stage: "STAGE II TRIAL",
        refCode: "REF: AMK-88",
        icon: "FlaskConical",
        title: "Bio-Chelate Amino-K™",
        description:
          "Microalgae-derived L-amino acid potassium chelate engineered for rapid heat-shock protein synthesis during extreme summer heatwaves (+45°C ambient canopy temperatures).",
        featureValue: "Thermal Delta -3.2°C",
        btnLink: "Pre-Register",
        href: "#",
      },
      {
        id: "pipe3",
        tag: "DESERT HALO-BACTER",
        stage: "PILOT TESTING",
        refCode: "REF: SGP-90",
        icon: "Droplets",
        title: "Saline-Guard Pro™",
        description:
          "Ultra-halotolerant Halomonas strains specifically isolated from Iranian salt desert basins, formulating an active biological osmolyte buffer against severe irrigation water mineral toxicity.",
        featureValue: "EC Resistance 18 dS/m",
        btnLink: "Pre-Register",
        href: "#",
      },
    ],
  },
  matrix: {
    eyebrow: "PRECISION PROTOCOL",
    title: "Phenological Stage Application Matrix",
    calculatorLabel: "Calculated for:",
    calculatorUnit: "Hectares",
    columns: [
      "GROWTH PHASE",
      "TARGET FORMULATION",
      "RECOMMENDED DOSE / HA",
      "CALCULATED BATCH",
      "APPLICATION VECTOR",
      "AGRONOMIC OBJECTIVE",
    ],
    rows: [
      {
        id: "m1",
        phase: "Dormancy Break & Bud Burst",
        formulation: "Bacto Smart™ Gold",
        dose: "4.0 L / ha",
        doseMultiplier: 4,
        vector: "Early drip fertigation",
        objective:
          "Break root latency; mobilize fixed winter phosphorus reserves.",
      },
      {
        id: "m2",
        phase: "Active Vegetative Growth",
        formulation: "Bacto Smart™ Green",
        dose: "3.0 L / ha",
        doseMultiplier: 3,
        vector: "Foliar spray (evening)",
        objective:
          "Boost chlorophyll density and shoot elongation via atmospheric N-assimilation.",
      },
      {
        id: "m3",
        phase: "Nut / Fruit Set & Kernel Fill",
        formulation: "Bacto Smart™ Gold",
        dose: "3.5 L / ha",
        doseMultiplier: 3.5,
        vector: "Sub-surface micro-drip",
        objective:
          "Prevent heat/salinity fruit drop; sustain continuous ATP energy transfer.",
      },
      {
        id: "m4",
        phase: "Post-Harvest Recovery Flush",
        formulation: "Bacto Smart™ Green",
        dose: "2.0 L / ha",
        doseMultiplier: 2,
        vector: "Deep soil irrigation",
        objective:
          "Replenish carbohydrates within woody organs prior to winter dormancy.",
      },
    ],
  },
  verification: {
    eyebrow: "QUALITY ASSURANCE ARCHITECTURE",
    title: "Standardized Laboratory Verification",
    items: [
      {
        id: "v1",
        icon: "Dna",
        title: "Metagenomic Sequencing",
        description:
          "16S rRNA gene molecular barcoding verifies 100% strain genetic identity and strain stability.",
      },
      {
        id: "v2",
        icon: "FlaskConical",
        title: "Zero Pathogen Screening",
        description:
          "Tested negative for Salmonella, E. coli, phytoplasmas, and heavy metal contaminants (Pb, Cd, As).",
      },
      {
        id: "v3",
        icon: "Timer",
        title: "18-Month CFU Guarantee",
        description:
          "Micro-encapsulated cellular stabilization guarantees over 10⁹ active CFU/ml throughout shelf life.",
      },
      {
        id: "v4",
        icon: "Snowflake",
        title: "Cold-Chain Robustness",
        description:
          "Cryo-tolerant cellular preservatives maintain spore viability in ambient transport up to 40°C.",
      },
    ],
  },
  pilotForm: {
    badge: "AGRONOMIC PARTNERSHIP PROGRAM",
    title: "Request an Agronomic Pilot Trial for Your Commercial Farm",
    description:
      "Partner with Kian Zist Bootia's biotechnology team. Receive customized strain compatibility testing, soil mineral chromatography review, and trial batch quantities scaled to your orchard acreage.",
    features: ["Direct Agro-Engineer Support", "Rapid Lab Turnaround"],
    form: {
      title: "Initiate Batch Request",
      subtitle:
        "Our senior biotechnologists will review your soil profile and advise within 24 hours.",
      nameLabel: "Your Full Name & Title",
      namePlaceholder: "Dr. / Eng. Arash Mohammadi",
      phoneLabel: "Contact Phone / WhatsApp",
      phonePlaceholder: "+98 912 000 0000",
      cropLabel: "Crop Type",
      cropPlaceholder: "Pistachio",
      acreageLabel: "Acreage Area",
      acreagePlaceholder: "e.g. 25 Hectares",
      submitButton: "Submit Pilot Application",
    },
  },
};
