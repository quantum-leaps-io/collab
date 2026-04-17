"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Wraps page content and redirects unauthenticated users to '/'.
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.push("/");
    });
    return unsub;
  }, [router]);

  return <>{children}</>;
}
