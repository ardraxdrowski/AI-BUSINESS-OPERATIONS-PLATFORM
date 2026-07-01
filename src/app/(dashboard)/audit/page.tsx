import React from "react";
import { enforceAuth } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import { History, ShieldAlert, FileText, Settings, Calendar, User } from "lucide-react";

export const metadata = {
  title: "Audit Ledger - DareXAI",
};

export default async function AuditPage() {
  const session = await enforceAuth();

  const logs = await prisma.auditLog.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
    take: 50, // limit to last 50 entries
  });

  const getActionIcon = (action: string) => {
    if (action.includes("CREATE")) return <FileText className="w-4 h-4 text-emerald-400" />;
    if (action.includes("DELETE")) return <ShieldAlert className="w-4 h-4 text-red-400" />;
    return <Settings className="w-4 h-4 text-blue-400" />;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
          <History className="w-6 h-6 text-purple-400 mr-2" />
          <span>Security Audit Ledger</span>
        </h1>
        <p className="text-zinc-400 text-sm mt-0.5">
          Read-only, immutable transaction ledger of all operations. Enforced and scoped at the data layer.
        </p>
      </div>

      {logs && logs.length > 0 ? (
        <div className="glass-panel overflow-hidden rounded-2xl border-zinc-800/80 shadow-xl">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-850">
              <thead className="bg-zinc-900/40">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Operation
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Resource Type
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Target ID
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Metadata Payload
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850 bg-zinc-950/20">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-900/25 transition-all">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2 text-sm font-semibold text-zinc-200">
                        {getActionIcon(log.action)}
                        <span>{log.action.replace(/_/g, " ")}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-zinc-900 border border-zinc-800 text-zinc-400">
                        {log.targetType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs text-zinc-500 font-mono select-all">
                        {log.targetId || "SYSTEM"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-zinc-400 font-mono block max-w-xs truncate" title={log.metadata ? JSON.stringify(log.metadata) : "{}"}>
                        {log.metadata ? JSON.stringify(log.metadata) : "{}"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5 text-xs text-zinc-500">
                        <Calendar className="w-3.5 h-3.5 text-zinc-650" />
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center glass-panel rounded-2xl border-dashed border-zinc-800 text-zinc-500">
          <History className="w-8 h-8 mx-auto mb-2 text-zinc-650" />
          <p className="text-sm font-medium">No log events recorded</p>
          <p className="text-xs text-zinc-600 mt-0.5">Audit log will track all updates and state-changing actions.</p>
        </div>
      )}
    </div>
  );
}
