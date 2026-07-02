"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";
import {
  Sparkles,
  TrendingUp,
  Briefcase,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Shield,
  Activity,
} from "lucide-react";
import Link from "next/link";

interface DashboardMetrics {
  activeOpportunitiesCount: number;
  revenuePipeline: number;
  wonRevenue: number;
  pendingTasksCount: number;
  recentActivity: Array<{
    id: string;
    action: string;
    targetType: string;
    createdAt: string;
  }>;
  aiAlerts: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    confidence: number;
    actionText: string;
    actionPath: string;
  }>;
}

export default function DashboardPage() {
  const { data: metrics, isLoading, error } = useQuery<DashboardMetrics>({
    queryKey: ["dashboard-metrics"],
    queryFn: () => apiRequest("/api/dashboard/metrics"),
    refetchInterval: 15000, // Auto-refresh metrics every 15s for real-time vibe!
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Skeleton UI */}
        <div className="h-10 bg-zinc-900 rounded-lg w-1/4 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-zinc-900 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-zinc-900 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center rounded-2xl bg-red-950/20 border border-red-800/40 text-red-300">
        Failed to load dashboard metrics. Please reload the page.
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <div className="flex items-center space-x-2 text-purple-400 text-sm font-semibold tracking-wide uppercase">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>AI Operations Online</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mt-1">
            System Overview
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Real-time multi-tenant monitoring, pipeline analysis, and conversational CRM suggestions.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Active Opportunities */}
        <div className="glass-panel rounded-2xl p-6 glow-card hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-sm font-medium">Active Deals</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/25 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-zinc-100">
              {metrics?.activeOpportunitiesCount || 0}
            </h3>
            <p className="text-xs text-zinc-500 mt-1">Currently open in sales stages</p>
          </div>
        </div>

        {/* Card 2: Revenue Pipeline */}
        <div className="glass-panel rounded-2xl p-6 glow-card hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-sm font-medium">Pipeline Value</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-zinc-100">
              {formatCurrency(metrics?.revenuePipeline || 0)}
            </h3>
            <p className="text-xs text-zinc-500 mt-1">Sum of all active opportunities</p>
          </div>
        </div>

        {/* Card 3: Closed Won Revenue */}
        <div className="glass-panel rounded-2xl p-6 glow-card hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-sm font-medium">Closed Won</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/25 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-zinc-100">
              {formatCurrency(metrics?.wonRevenue || 0)}
            </h3>
            <p className="text-xs text-zinc-500 mt-1">Revenue secured in current cycle</p>
          </div>
        </div>

        {/* Card 4: Pending Follow-ups */}
        <div className="glass-panel rounded-2xl p-6 glow-card hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-sm font-medium">Tasks Scheduled</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-zinc-100">
              {metrics?.pendingTasksCount || 0}
            </h3>
            <p className="text-xs text-zinc-500 mt-1">Pending CRM follow-up items</p>
          </div>
        </div>
      </div>

      {/* Main Grid: AI Insights (Centerpiece) & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Derived AI Insights/Alerts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-zinc-100 flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
              <span>AI Employee Insight Alerts</span>
            </h2>
            <span className="text-xs text-zinc-500">Auto-generated recommendations</span>
          </div>

          <div className="space-y-4">
            {metrics?.aiAlerts && metrics.aiAlerts.length > 0 ? (
              metrics.aiAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="glass-panel rounded-2xl p-6 border-zinc-800/80 bg-zinc-900/10 glow-card flex flex-col md:flex-row md:items-start justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-purple-950/40 border border-purple-800/50 text-purple-300">
                        {alert.confidence}% confidence
                      </span>
                      <h4 className="font-semibold text-zinc-100">{alert.title}</h4>
                    </div>
                    <p className="text-sm text-zinc-400 line-clamp-2">{alert.description}</p>
                  </div>
                  <div className="flex-shrink-0 self-end md:self-start">
                    <Link
                      href={alert.actionPath}
                      className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-zinc-850 hover:bg-zinc-800 border border-zinc-700/80 rounded-xl transition-all cursor-pointer"
                    >
                      <span>{alert.actionText}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 ml-1.5 text-zinc-400" />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center glass-panel rounded-2xl border-dashed border-zinc-800 text-zinc-500">
                <Shield className="w-8 h-8 mx-auto mb-2 text-zinc-650" />
                <p className="text-sm">No critical operations alerts at this moment.</p>
                <p className="text-xs text-zinc-600 mt-0.5">Pipeline is currently healthy and active.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Activity Feed */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-zinc-100 flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <span>Customer Activity Ledger</span>
          </h2>

          <div className="glass-panel rounded-2xl p-6 space-y-5 border-zinc-800/80 bg-zinc-950/40">
            {metrics?.recentActivity && metrics.recentActivity.length > 0 ? (
              <div className="flow-root">
                <ul className="-mb-8">
                  {metrics.recentActivity.map((activity, idx) => (
                    <li key={activity.id}>
                      <div className="relative pb-8">
                        {idx !== metrics.recentActivity.length - 1 && (
                          <span
                            className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-zinc-800/60"
                            aria-hidden="true"
                          />
                        )}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                              {idx + 1}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 pt-1.5">
                            <p className="text-xs font-semibold text-zinc-200">
                              {activity.action.replace(/_/g, " ")}
                            </p>
                            <div className="text-zinc-500 text-[10px] mt-0.5 flex items-center justify-between">
                              <span>Target: {activity.targetType}</span>
                              <span>
                                {new Date(activity.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-zinc-500 text-center py-4">No recent activity logged.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
