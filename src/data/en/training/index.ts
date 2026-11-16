export const enTrainingData = {
  hero: {
    badge: "Kian Zist Academy | Knowledge Hub",
    eyebrow: "Microbial Science & Sustainable Agriculture",
    titleLine1: "Specialized Knowledge",
    titleLine2: "For the Future of Agriculture",
    subtitle:
      "Explore our comprehensive educational resources, from rhizosphere microbiology to advanced fertigation protocols. Learn how to harness the power of live microbes to maximize crop yield and resilience.",
    primaryButton: "Explore Learning Paths",
    secondaryButton: "Watch Webinars",
    image: {
      terminal: "#KZ-EDU-01 KNOWLEDGE HUB",
      cardColonizationTitle: "SCIENTIFIC CONTENT HOURS",
      cardColonizationValue: "120+",
      cardColonizationSub: "Specialized Curriculum",
      cardNetworkTitle: "Active Courses",
      cardNetworkValue: "15+",
    },
  },
  pillars: {
    eyebrow: "LEARNING PATHWAYS",
    title: "Educational Pillars",
    subtitle:
      "Specialized curriculums designed to bridge the gap between molecular biology and practical field application.",
    items: [
      {
        id: "p1",
        icon: "Dna",
        pillarLabel: "PATHWAY 01", // Slashes removed
        title: "Rhizosphere Microbiology",
        description:
          "Understanding native PGPR strains, symbiotic interactions, and microbial communication networks in the soil ecosystem.",
        linkText: "Explore Microbiology",
        href: "#",
      },
      {
        id: "p2",
        icon: "FlaskConical",
        pillarLabel: "PATHWAY 02", // Slashes removed
        title: "Soil Biochemistry",
        description:
          "Mechanisms of phosphorus solubilization, nitrogen fixation, and organic acid synthesis in the rhizosphere.",
        linkText: "Explore Biochemistry",
        href: "#",
      },
      {
        id: "p3",
        icon: "Leaf",
        pillarLabel: "PATHWAY 03", // Slashes removed
        title: "Plant Stress Physiology",
        description:
          "Cellular defense mechanisms against high salinity, osmotic shock, and extreme thermal conditions.",
        linkText: "Explore Physiology",
        href: "#",
      },
      {
        id: "p4",
        icon: "Droplets",
        pillarLabel: "PATHWAY 04", // Slashes removed
        title: "Fertigation Engineering",
        description:
          "Precision calculation of dosages, injection timing, and compatibility with conventional NPK programs.",
        linkText: "Explore Engineering",
        href: "#",
      },
    ],
  },
  stepGuide: {
    eyebrow: "FIELD APPLICATION PROTOCOL",
    title: "Step-by-Step Fertigation Guide",
    subtitle:
      "A practical framework for applying microbial inoculants to ensure maximum viability, root colonization, and agronomic efficacy.",
    items: [
      {
        id: "s1",
        step: "01",
        time: "Pre-Treatment",
        title: "Soil & Water Analysis",
        description:
          "Measure soil EC, pH, and mineral profiles. This baseline data is crucial to determine the optimal microbial dosage and compatibility.",
        footerText: "Baseline Diagnostics",
        icon: "TestTube",
      },
      {
        id: "s2",
        step: "02",
        time: "Preparation",
        title: "Inoculation & Activation",
        description:
          "Mix the biological inoculant with non-chlorinated water. Allow the spores to activate for 15-30 minutes before field application.",
        footerText: "Spore Activation",
        icon: "Droplets",
      },
      {
        id: "s3",
        step: "03",
        time: "Application",
        title: "Precision Fertigation",
        description:
          "Inject the activated consortium directly into the root zone via drip irrigation or sub-surface injection during active vegetative growth.",
        footerText: "Targeted Delivery",
        icon: "Sprout",
      },
      {
        id: "s4",
        step: "04",
        time: "Post-Treatment",
        title: "Biological Monitoring",
        description:
          "Observe lateral root hair proliferation and canopy vitality over the next 30 days to ensure successful rhizosphere colonization.",
        footerText: "Efficacy Tracking",
        icon: "Activity",
      },
    ],
  },
  resources: {
    eyebrow: "ACADEMIC LIBRARY",
    title: "Featured Educational Resources",
    subtitle:
      "Deep dive into our specialized articles, recorded webinars, and technical video tutorials designed for modern agronomists.",
    exploreText: "View Full Library",
    exploreLink: "#",
    items: [
      {
        id: "r1",
        image: "/images/pic1.png",
        category: "VIDEO TUTORIAL",
        title: "How PGPR Bacteria Boost Root Architecture",
        description:
          "A visual deep-dive into the symbiotic mechanisms that trigger lateral root proliferation and moisture absorption.",
        meta: "Duration: 12 min",
        linkText: "Watch Video",
        href: "#",
      },
      {
        id: "r2",
        image: "/images/pic2.png",
        category: "TECHNICAL ARTICLE",
        title: "Complete Guide to Fertigation with Bio-Fertilizers",
        description:
          "Step-by-step protocols for calculating dosages, mixing, and injecting microbial consortia without clogging drip systems.",
        meta: "PDF | 18 Pages",
        linkText: "Read Article",
        href: "#",
      },
      {
        id: "r3",
        image: "/images/pic3.png",
        category: "RECORDED WEBINAR",
        title: "Managing Water Salinity with Halotolerant Bacteria",
        description:
          "Expert panel discussion on mitigating osmotic stress in pistachio and date palm orchards using native microbial strains.",
        meta: "Duration: 45 min",
        linkText: "Watch Webinar",
        href: "#",
      },
    ],
  },
  caseStudies: {
    eyebrow: "FIELD EVIDENCE",
    title: "Product Case Studies",
    subtitle:
      "Explore the scientific and practical outcomes of our flagship products in real-world field trials across challenging environments.",
    items: [
      {
        id: "cs1",
        image: "/images/products/product1.png",
        badge: "Bacto Smart Green",
        title: "Vegetative Growth in Pistachio Orchards",
        description:
          "A 6-month study evaluating the impact of endophytic nitrogen-fixing bacteria on canopy volume and photosynthetic efficiency in mature pistachio trees.",
        metric: "+28.4% Photosynthesis",
        linkText: "Read Full Case Study",
        href: "#",
      },
      {
        id: "cs2",
        image: "/images/products/product2.png",
        badge: "Bacto Smart Gold",
        title: "Salinity Mitigation in Arid Soils",
        description:
          "How phosphorus-solubilizing bacteria and EPS-producing strains mitigated osmotic stress and improved nutrient uptake under high EC conditions (up to 14 dS/m).",
        metric: "+41.2% Available Phosphorus",
        linkText: "Read Full Case Study",
        href: "#",
      },
    ],
  },
  faq: {
    eyebrow: "EXPERT SUPPORT",
    title: "Frequently Asked Questions",
    subtitle:
      "Technical answers to the most common questions regarding the application, storage, and interaction of our biological products.",
    items: [
      {
        id: "q1",
        question:
          "Do bio-fertilizers conflict with chemical pesticides or fungicides?",
        answer:
          "Systemic chemical fungicides can harm live bacteria. We recommend a 7-10 day interval between applying chemical fungicides and microbial inoculants. However, our formulations are compatible with most standard NPK fertilizers.",
      },
      {
        id: "q2",
        question:
          "What is the optimal time and temperature for field application?",
        answer:
          "Apply during early morning or late afternoon to avoid direct UV exposure, which can degrade the spores. Soil temperatures between 15°C and 30°C provide the best conditions for rapid microbial activation.",
      },
      {
        id: "q3",
        question:
          "How should the product be stored to ensure bacterial viability?",
        answer:
          "Store in a cool, dry place away from direct sunlight. Our micro-encapsulated formula is highly stable and does not require refrigeration. Keep the container tightly closed to prevent contamination.",
      },
      {
        id: "q4",
        question: "Are these biological inputs safe for young saplings?",
        answer:
          "Absolutely. In fact, bio-inoculants are highly recommended for young saplings. The beneficial microbes establish a symbiotic relationship early on, strengthening the root system and protecting the plant against transplant shock.",
      },
    ],
  },
  cta: {
    badge: "ACADEMY ADMISSION & CONSULTATION",
    title: "Elevate Your Agronomic Expertise",
    description:
      "Join our specialized certification programs or request a direct consultation with our senior microbiologists to design a tailored protocol for your farm's specific soil and water conditions.",
    features: [
      "Verified Agronomic Certification",
      "Direct Access to Senior Experts",
      "Customized Field Protocols",
    ],
    form: {
      title: "Request Enrollment or Consultation",
      subtitle:
        "Our academic team will review your request and contact you within 24 hours.",
      nameLabel: "Full Name",
      namePlaceholder: "e.g. Dr. Arash Alavi",
      emailLabel: "Email Address",
      emailPlaceholder: "arash@example.com",
      phoneLabel: "Direct Phone Number",
      phonePlaceholder: "+98 912 000 0000",
      submitButton: "Submit Request",
    },
  },
};
