"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAccessToken,
  getCurrentUser,
  loginUser,
  setAccessToken,
} from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingExistingLogin, setCheckingExistingLogin] = useState(true);

  useEffect(() => {
    const checkExistingLogin = async () => {
      const token = getAccessToken();

      if (!token) {
        setCheckingExistingLogin(false);
        return;
      }

      try {
        await getCurrentUser();
        router.replace("/");
      } catch {
        setCheckingExistingLogin(false);
      }
    };

    void checkExistingLogin();
  }, [router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    try {
      setLoading(true);

      const tokenData = await loginUser({
        email: email.trim(),
        password,
      });

      setAccessToken(tokenData.access_token);

      await getCurrentUser();
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  if (checkingExistingLogin) {
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
        Checking session...
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(180deg, #e9f2ff 0%, #f7f8f9 180px)",
        padding: "24px",
        fontFamily:
          'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#ffffff",
          border: "1px solid #dfe1e6",
          borderRadius: "16px",
          boxShadow: "0 1px 2px rgba(9, 30, 66, 0.08)",
          padding: "32px",
        }}
      >
        <p
          style={{
            margin: "0 0 8px",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#0c66e4",
          }}
        >
          Team workspace
        </p>

        <h1
          style={{
            margin: "0 0 10px",
            fontSize: "28px",
            fontWeight: 700,
            color: "#172b4d",
          }}
        >
          Sign in to RpD Manager
        </h1>

        <p
          style={{
            margin: "0 0 24px",
            fontSize: "14px",
            lineHeight: 1.6,
            color: "#5e6c84",
          }}
        >
          Access your teams, projects, invitations, issues, and dashboard from one workspace.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label
              htmlFor="email"
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#172b4d",
              }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1px solid #dfe1e6",
                borderRadius: "10px",
                fontSize: "14px",
                color: "#172b4d",
                background: "#ffffff",
                outline: "none",
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#172b4d",
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1px solid #dfe1e6",
                borderRadius: "10px",
                fontSize: "14px",
                color: "#172b4d",
                background: "#ffffff",
                outline: "none",
              }}
            />
          </div>

          {error ? (
            <div
              style={{
                marginBottom: "16px",
                border: "1px solid #ffd5d2",
                background: "#ffebe6",
                color: "#ae2e24",
                borderRadius: "10px",
                padding: "12px 14px",
                fontSize: "13px",
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              border: "1px solid #0c66e4",
              borderRadius: "10px",
              background: "#0c66e4",
              color: "#ffffff",
              padding: "12px 16px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div
          style={{
            marginTop: "18px",
            fontSize: "13px",
            color: "#5e6c84",
            textAlign: "center",
          }}
        >
          Don’t have an account?{" "}
          <Link
            href="/register"
            style={{
              color: "#0c66e4",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Create one
          </Link>
        </div>
      </div>
    </main>
  );
}