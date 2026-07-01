"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"; // Wait, in Next.js App Router we import from "next/navigation", let's fix this!
import { ArrowRight, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/api-client";

export default function BypassButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBypass = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest("/api/auth/bypass", {
        method: "POST",
      });
      if (response.success) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Bypass login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleBypass}
        disabled={loading}
        className="w-full flex justify-center items-center py-3 px-4 rounded-xl border border-purple-500/30 bg-purple-600 hover:bg-purple-700 text-white font-medium transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {loading ? (
          <div className="flex items-center space-x-2">
            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Logging in...</span>
          </div>
        ) : (
          <div className="flex items-center">
            <Sparkles className="w-4 h-4 mr-2" />
            <span>Developer Bypass Login</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </div>
        )}
      </button>
      {error && (
        <p className="text-red-400 text-xs text-center font-medium mt-1">{error}</p>
      )}
    </div>
  );
}
