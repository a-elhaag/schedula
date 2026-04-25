"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearAllCached } from "@/lib/clientCache";
import "./AuthSignOutButton.css";

const PROTECTED_PREFIXES = [
  "/coordinator",
  "/staff",
  "/student",
  "/onboarding",
];

export default function AuthSignOutButton() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const shouldShow = useMemo(() => {
    if (!pathname) return false;
    return PROTECTED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
    );
  }, [pathname]);

  if (!shouldShow) return null;

  async function handleSignOut() {
    setIsSubmitting(true);
    clearAllCached();
    try {
      await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      router.push("/signin");
      router.refresh();
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      className="auth-signout"
      onClick={handleSignOut}
      disabled={isSubmitting}
      aria-busy={isSubmitting}
    >
      {isSubmitting ? "Signing out..." : "Sign out"}
    </button>
  );
}
