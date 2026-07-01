"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { apiRequest } from "@/lib/api-client";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await apiRequest("/api/auth/logout", {
        method: "POST",
      });
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-zinc-900/60 hover:bg-zinc-800/80 hover:text-red-400 border border-zinc-800 hover:border-red-500/20 text-zinc-400 text-sm font-medium rounded-xl transition-all disabled:opacity-50 cursor-pointer"
    >
      <LogOut className="w-4 h-4" />
      <span>{loading ? "Logging out..." : "Sign Out"}</span>
    </button>
  );
}
