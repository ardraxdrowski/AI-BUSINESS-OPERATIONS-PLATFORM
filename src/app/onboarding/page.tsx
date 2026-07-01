"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Cpu, ArrowRight, Building2, HelpCircle } from "lucide-react";
import { apiRequest } from "@/lib/api-client";

export default function OnboardingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [profile, setProfile] = useState<{ name: string; email: string } | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("Technology");
  const [companyDescription, setCompanyDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verify onboarding session on load
  useEffect(() => {
    async function checkSession() {
      try {
        const data = await apiRequest("/api/onboarding", { method: "GET" });
        if (data.active) {
          setProfile(data.profile);
          setChecking(false);
        } else {
          // No signup token active, send to login
          router.push("/login");
        }
      } catch (err) {
        router.push("/login");
      }
    }
    checkSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError("Company name is required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest("/api/onboarding", {
        method: "POST",
        body: JSON.stringify({
          companyName: companyName.trim(),
          industry,
          companyDescription: companyDescription.trim(),
        }),
      });

      if (response.success) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Onboarding failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-zinc-950">
        <svg className="animate-spin h-8 w-8 text-purple-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="mt-4 text-sm text-zinc-400">Verifying session...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-zinc-950 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            DareX<span className="text-purple-400">AI</span>
          </span>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-zinc-100 font-sans">
          Welcome, {profile?.name || "there"}
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-400">
          Let's initialize your multi-tenant workspace.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl z-10 px-4">
        <div className="glass-panel py-8 px-8 shadow-2xl rounded-2xl glow-card border-zinc-800/80">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="company-name" className="block text-sm font-semibold text-zinc-300">
                Company Name <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building2 className="h-5 w-5 text-zinc-500" />
                </div>
                <input
                  type="text"
                  name="company-name"
                  id="company-name"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-zinc-800 bg-zinc-900/50 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition-all"
                  placeholder="e.g. Acme Corporation"
                />
              </div>
            </div>

            <div>
              <label htmlFor="industry" className="block text-sm font-semibold text-zinc-300">
                Industry
              </label>
              <select
                id="industry"
                name="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-3 border border-zinc-800 bg-zinc-900/50 rounded-xl text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition-all"
              >
                <option value="Technology">Technology & SaaS</option>
                <option value="Finance">Finance & Banking</option>
                <option value="Healthcare">Healthcare & Pharma</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Retail">Retail & E-commerce</option>
                <option value="Professional Services">Professional Services</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between">
                <label htmlFor="description" className="block text-sm font-semibold text-zinc-300">
                  Business Description
                </label>
                <span className="text-xs text-zinc-500" id="description-description">
                  Context for AI customization
                </span>
              </div>
              <div className="mt-1">
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  value={companyDescription}
                  onChange={(e) => setCompanyDescription(e.target.value)}
                  className="block w-full px-3 py-3 border border-zinc-800 bg-zinc-900/50 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition-all resize-none"
                  placeholder="Describe your product/service, target customers, and business model. This injects context into the Conversational AI Employee..."
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-950/20 border border-red-800/40 p-4 text-sm text-red-300 text-center font-medium">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 rounded-xl border border-transparent bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Initializing Workspace...</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <span>Complete Onboarding</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
