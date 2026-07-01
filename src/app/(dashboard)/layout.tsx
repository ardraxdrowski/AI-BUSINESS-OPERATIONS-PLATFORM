import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthSession } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Briefcase,
  CheckSquare,
  History,
  LogOut,
  Cpu,
  User as UserIcon,
} from "lucide-react";
import LogoutButton from "./logout-button";

interface SidebarLinkProps {
  href: string;
  label: string;
  icon: React.ReactNode;
}

function SidebarLink({ href, label, icon }: SidebarLinkProps) {
  return (
    <Link
      href={href}
      className="flex items-center space-x-3 px-4 py-3 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50 transition-all font-medium group"
    >
      <span className="text-zinc-500 group-hover:text-purple-400 transition-colors">
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login");
  }

  // Fetch tenant name
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { name: true },
  });

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 relative">
      {/* Background gradients */}
      <div className="absolute top-0 right-0 w-[30%] h-[30%] rounded-full bg-blue-900/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[30%] h-[30%] rounded-full bg-purple-900/5 blur-[120px] pointer-events-none" />

      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md flex flex-col z-20 sticky top-0 h-screen">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-zinc-850">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center pulse-glow">
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold tracking-tight text-white text-lg">
              DareX<span className="text-purple-400">AI</span>
            </span>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <SidebarLink href="/dashboard" label="Home" icon={<LayoutDashboard className="w-5 h-5" />} />
          <SidebarLink href="/chat" label="Conversations" icon={<MessageSquare className="w-5 h-5" />} />
          <SidebarLink href="/opportunities" label="Opportunities" icon={<Briefcase className="w-5 h-5" />} />
          <SidebarLink href="/contacts" label="Contacts" icon={<Users className="w-5 h-5" />} />
          <SidebarLink href="/tasks" label="Tasks" icon={<CheckSquare className="w-5 h-5" />} />
          <SidebarLink href="/audit" label="Audit Logs" icon={<History className="w-5 h-5" />} />
        </nav>

        {/* Footer Tenant Info & Logout */}
        <div className="p-4 border-t border-zinc-850 bg-zinc-950/40">
          <div className="flex items-center space-x-3 px-2 py-1.5">
            <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-200 truncate">{session.name}</p>
              <p className="text-xs text-zinc-500 truncate">{tenant?.name || "Workspace"}</p>
            </div>
          </div>
          <div className="mt-3">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-x-hidden min-h-screen">
        <div className="flex-1 p-8 z-10">{children}</div>
      </main>
    </div>
  );
}
