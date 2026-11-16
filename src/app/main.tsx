"use client";

import { usePathname } from "next/navigation";

const Main = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const pathname = usePathname();

  const isHome = pathname === "/";
  return (
    <>
      <main className={`${isHome ? "pt-16" : ""} min-h-screen`}>
        {children}
      </main>
    </>
  );
};

export default Main;
