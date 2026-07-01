import Link from "next/link";
import { Sparkles, ArrowRight, ShieldCheck, Cpu } from "lucide-react";
import BypassButton from "./bypass-button";

export const metadata = {
  title: "Login - DareXAI",
};

export default function LoginPage() {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const isGoogleConfigured = !!(googleClientId && googleClientSecret);

  return (
    <div className="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-zinc-950 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center items-center space-x-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center pulse-glow">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
            DareX<span className="text-purple-400">AI</span>
          </span>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-zinc-100">
          Sign in to your AI workspace
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-400">
          Streamlining customer operations, CRM tasks, and automated workflows.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="glass-panel py-8 px-6 shadow-2xl rounded-2xl glow-card border-zinc-800/80">
          <div className="space-y-6">
            {isGoogleConfigured ? (
              <div>
                <a
                  href="/api/auth/google/login"
                  className="w-full flex justify-center items-center py-3 px-4 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 font-medium transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Sign in with Google
                </a>
              </div>
            ) : (
              <div className="rounded-xl bg-purple-950/20 border border-purple-800/40 p-4 text-sm text-purple-300">
                <div className="flex space-x-2">
                  <ShieldCheck className="w-5 h-5 text-purple-400 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-purple-200">Google OAuth is not configured.</span>
                    <p className="mt-1 text-purple-400/90 text-xs">
                      The application will default to Developer Bypass Auth. Real Google login is disabled since `GOOGLE_CLIENT_ID` is missing from the environment.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!isGoogleConfigured && (
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-zinc-800" />
                <span className="flex-shrink mx-4 text-zinc-500 text-xs uppercase tracking-wider font-semibold">
                  Testing
                </span>
                <div className="flex-grow border-t border-zinc-800" />
              </div>
            )}

            {/* Developer Bypass Auth Button */}
            {!isGoogleConfigured && (
              <BypassButton />
            )}

            <div className="mt-6 flex flex-col items-center justify-center space-y-4 pt-4 border-t border-zinc-800/50">
              <div className="flex items-center text-xs text-zinc-500 space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                <span>Secure PKCE token flow & cookies enforced</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
