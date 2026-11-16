# KianZist Project - AI Assistant Instructions & Core Principles

> **Attention AI Assistant:** Read this file completely before processing any other files or requests. This document contains the absolute, non-negotiable rules, architecture, and conventions for the KianZist project. You must apply these rules to every single line of code you generate. Wait for the user's specific prompt after reading this, and do not take autonomous actions beyond the user's explicit requests.

## 1. Communication & Comments

- **Language:** You MUST communicate with the user in **Persian (Farsi)**.
- **Code Comments:** You MUST write ALL code comments strictly in **English**. Do not use Persian or any other language in the code comments under any circumstances.

## 2. Code Delivery & Output Format

- **Complete Code:** Always provide the **ENTIRE, complete, and fully functional code** in a single code block. Never provide partial snippets or use placeholders like `// ... rest of the code`.
- **Zero Errors:** The code must be 100% tested, error-free, and ready to run. Do not break the base structure of the existing components.
- **If the code is too long to output in one message:**
  1. First, tell the user the **exact file path**.
  2. Give a **unique search anchor (string)** from the existing code so the user can find the exact location (e.g., `Find: "const handleSubmit = () => {"`).
  3. Then, provide the exact block of code to replace or insert.
  4. Finally, explain the changes clearly.

## 3. Consistency & "The Rail Rule" (Strict)

- **No Random Decisions:** Do not invent new design patterns, folder structures, or component logics.
- **Follow the Pattern:** Every new feature, component, or page MUST follow the exact same routing, architectural patterns, styling, and data-fetching methods used in the existing files.
- **Theme & Tokens:** This project uses a strict custom theme system (`kz-*` color tokens). Never hardcode colors (like `#fff` or `bg-blue-500`). Always use the established theme tokens (`bg-kz-brand-primary`, `text-kz-text-muted`, etc.) to ensure consistency across Light and Dark modes.
- **UI/UX Consistency:** If building a new UI component, match the border radius, shadows, hover effects, and spacing (padding/margin) of existing components.

## 4. UI Components & Reusability (Crucial)

- **Reuse First:** For any UI element like Cards, Buttons, Figures, Badges, etc., you MUST use the existing base components located in `src/components/ui/` (e.g., `GlassCard`, `Button`, `Badge`, `IconButton`, `Toggle`).
- **No Duplication:** Do not create raw HTML `<div>` or `<button>` tags to mimic a Card or Button if a base UI component already exists for it.
- **Typography:** Always use the custom `<Typography>` component from `src/typography` and its predefined variants (`variant="display"`, `variant="body"`, etc.). Do not use standard HTML text tags like `<h1>` or `<p>` directly without wrapping them in `<Typography>`.

## 5. Directory Structure & Component Creation (Sacred Architecture)

The current project structure is the absolute baseline. Do not deviate from it. Here is the visual tree of the project:

```text
src/
├── app/                  # Next.js App Router (Pages & Layouts)
│   ├── about/
│   ├── contact/
│   ├── news/
│   ├── products/
│   ├── training/
│   ├── layout.tsx
│   └── page.tsx
├── components/           # React Components
│   ├── about/            # Page-specific components for /about
│   ├── AppShell/         # Main app wrapper/layout components
│   ├── contact/          # Page-specific components for /contact
│   ├── home/             # Page-specific components for / (Home)
│   ├── layout/           # Layout-specific components (e.g., Navbar, Footer)
│   ├── news/             # Page-specific components for /news
│   ├── products/         # Page-specific components for /products
│   ├── shared/           # Globally shared complex components (e.g., LoadingScreen)
│   ├── training/         # Page-specific components for /training
│   └── ui/               # Base reusable UI primitives (Button, GlassCard, Badge, etc.)
├── data/                 # Static data, JSON, or localization files
├── db/                   # Database schemas / ORM configs
├── hooks/                # Custom React Hooks
├── lib/                  # Utility libraries and helpers (e.g., utils.ts)
├── providers/            # React Context Providers (e.g., LanguageProvider)
├── server/               # Server actions or backend logic
├── sound/                # Audio assets or sound logic
├── styles/               # Global CSS (globals.css)
├── theme/                # Theme definitions and color palettes (colors.ts)
├── types/                # TypeScript interfaces and global types
├── typography/           # Typography system (index.tsx, typography.ts)
└── utils/                # General utility functions
```

**Page-Specific Components:** For each page (e.g., about, home), there is a dedicated folder in `src/components/[page-name]/` containing an `index.tsx`.

**Where to add new sub-components:** If I ask you to create a new sub-component for a specific page (e.g., a new HeroCard for the Home page), you MUST create it as a new file alongside the existing `index.tsx` inside the respective folder (e.g., `src/components/home/HeroCard.tsx`). Then, import and use it in the `index.tsx` of that page.

**Shared Components:** If a component is genuinely global and used across multiple pages, it belongs in `src/components/shared/` or `src/components/ui/`.

## 6. Tech Stack & Architecture Rules

- **Framework:** Next.js (App Router), React, TypeScript.
- **Styling:** Tailwind CSS with custom config. No inline styles unless absolutely necessary for dynamic values.
- **Animations:** Framer Motion (use established variants from `Motion` components like `MotionContainer`, `MotionItem`, `fadeUpVariants` if applicable).

## 7. Workflow Execution

- **Read this first:** Always acknowledge that you have read this file.
- **Wait for the prompt:** Do not start writing code until the user gives you the specific task in their prompt.
- **Respect the Base:** Treat the current project structure as sacred. Improve and add to it, but do not delete or refactor existing working logic unless explicitly instructed to do so.

## 8. Visual UI Compilation (The Master Key: "کامپوننت جدید")

Whenever I say the phrase **"کامپوننت جدید"** (and provide an image of a UI), you MUST treat this as a trigger to act as a **Visual Compiler**. Follow this exact workflow:

1. **Analyze & Understand:** Deeply analyze the provided UI image. Understand its layout, hierarchy, spacing, and the core functionality it represents.
2. **DO NOT Copy Styles:** Acknowledge that the UI in the image has a completely different design language, color palette, and styling than our project. DO NOT try to replicate its exact colors, fonts, or CSS.
3. **Compile to KianZist Design System:** You MUST translate (compile) the _structure_ and _logic_ of the image into our specific design system.
   - Use our `src/components/ui/` components (e.g., `GlassCard`, `Button`).
   - Use our `Typography` system.
   - Use our `kz-*` theme tokens for colors, borders, and shadows.
   - Use our `Framer Motion` wrappers for animations.
4. **Build & Implement:** Create the new component file in the correct directory (as defined in Section 5) and write the complete, error-free code using only our project's established patterns.

If I say "کامپوننت جدید" and send an image, you are authorized to build the component based on this adaptation process without asking for further permission. Just briefly explain how you mapped the image's structure to our design system, and then provide the complete code.

## 9. Responsiveness & Mobile-First Design (Dynamic Alignment)

- **Absolute Alignment with Current Codebase:** Do NOT hardcode or assume specific responsive utility classes (e.g., do not blindly use `px-4 md:px-8` or `flex-col lg:flex-row`). Instead, you MUST extract and apply the *exact* current responsive patterns, spacing systems, and breakpoints used in the latest version of the files provided to you.
- **Mobile-First Logic:** Always build with a mobile-first mindset, but follow the *project's current implementation* of how mobile scales up to desktop.
- **Continuous Evolution:** If I introduce a new responsive system or change the spacing logic in my latest prompt/files, you MUST instantly adapt to the new logic and discard the old patterns.
- **No Horizontal Overflow:** Ensure that no component or section creates horizontal scrolling on mobile devices. Use wrapping, `max-w-full`, or `overflow-hidden` as dictated by the project's current utility structure.
- **Typography Scaling:** Rely strictly on the `Typography` component's responsive behavior or the exact Tailwind text classes currently utilized across the project for scaling, ensuring text remains readable on all screens.