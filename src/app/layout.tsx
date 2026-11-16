import type { Metadata } from "next";
import "../styles/globals.css";
import AppShell from "@/components/AppShell";
import { Navbar } from "@/components/layout/Navbar";
import Main from "./main";

export const metadata: Metadata = {
  title: "Kian Zist | کیان زیست",
  description: "Kian Zist Web Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Changed default lang to "en" and dir to "ltr"
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className="antialiased transition-colors duration-300 bg-[#edf5f4] dark:bg-[#0f1a20]">
        <AppShell>
          <Navbar />
          <Main>{children}</Main>
        </AppShell>
      </body>
    </html>
  );
}
