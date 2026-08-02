"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RpdLayout from "@/components/rpd/RpdLayout";
import { clearAccessToken, getAccessToken, getCurrentUser } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = getAccessToken();

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        await getCurrentUser();
        setCheckingAuth(false);
      } catch {
        clearAccessToken();
        router.replace("/login");
      }
    };

    void checkAuth();
  }, [router]);

  if (checkingAuth) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(180deg, #e9f2ff 0%, #f7f8f9 180px)",
          color: "#172b4d",
          fontFamily:
            'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        Loading workspace...
      </main>
    );
  }

  return <RpdLayout />;
}