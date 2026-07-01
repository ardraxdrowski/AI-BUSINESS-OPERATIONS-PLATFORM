"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";
import {
  MessageSquare,
  Mail,
  Phone,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Clock,
  Play,
  User,
  Plus,
  Send,
  X,
  Compass,
} from "lucide-react";

interface Message {
  id: string;
  channel: string;
  direction: string;
  content: string;
  aiSummary: string | null;
  intent: string | null;
  sentiment: string | null;
  recommendedAction: string | null;
  createdAt: string;
}

interface Thread {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  messages: Message[];
}

export default function InboxPage() {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [simChannel, setSimChannel] = useState<"whatsapp" | "email" | "call">("whatsapp");
  const [simDirection, setSimDirection] = useState<"inbound" | "outbound">("inbound");
  const [simContent, setSimContent] = useState("");
  const [simLoading, setSimLoading] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);

  // Fetch threads list (contacts + latest message preview)
  const { data: threads, isLoading: loadThreads } = useQuery<Thread[]>({
    queryKey: ["inbox-threads"],
    queryFn: () => apiRequest("/api/inbox/threads"),
    refetchInterval: 10000, // Refresh threads list every 10s
  });

  // Fetch active message timeline
  const { data: messages, isLoading: loadMsgs } = useQuery<Message[]>({
    queryKey: ["inbox-messages", activeId],
    queryFn: () => apiRequest(`/api/inbox/messages?contactId=${activeId}`),
    enabled: !!activeId,
    refetchInterval: 10000,
  });

  // Simulate Message Ingestion Mutation
  const simulateMutation = useMutation({
    mutationFn: (data: { contactId: string; channel: string; direction: string; content: string }) =>
      apiRequest("/api/inbox/simulate", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-threads"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-messages", activeId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      setSimContent("");
    },
  });

  // Send Manual Reply Mutation
  const replyMutation = useMutation({
    mutationFn: (data: { contactId: string; content: string }) =>
      apiRequest("/api/inbox/simulate", {
        method: "POST",
        body: JSON.stringify({
          contactId: data.contactId,
          channel: "whatsapp",
          direction: "outbound",
          content: data.content,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-threads"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-messages", activeId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      setReplyContent("");
    },
  });

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId || !simContent.trim()) return;
    simulateMutation.mutate({
      contactId: activeId,
      channel: simChannel,
      direction: simDirection,
      content: simContent.trim(),
    });
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId || !replyContent.trim()) return;
    replyMutation.mutate({
      contactId: activeId,
      content: replyContent.trim(),
    });
  };

  const getChannelIcon = (ch: string) => {
    switch (ch) {
      case "whatsapp":
        return <MessageSquare className="w-4 h-4 text-emerald-400" />;
      case "email":
        return <Mail className="w-4 h-4 text-blue-400" />;
      case "call":
        return <Phone className="w-4 h-4 text-amber-400" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getSentimentBadge = (s: string | null) => {
    if (!s) return null;
    const sLower = s.toLowerCase();
    if (sLower === "positive") return "bg-emerald-950/40 text-emerald-300 border-emerald-900/50";
    if (sLower === "negative") return "bg-red-950/40 text-red-300 border-red-900/50";
    return "bg-zinc-800 text-zinc-300 border-zinc-700";
  };

  const activeThread = threads?.find((t) => t.id === activeId);
  const latestMessage = messages && messages.length > 0 ? messages[messages.length - 1] : null;

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-zinc-950/20 rounded-2xl border border-zinc-800/80 overflow-hidden relative glow-card max-w-7xl mx-auto">
      {/* Threads list sidebar */}
      <div className="w-80 border-r border-zinc-800/80 bg-zinc-950/40 flex flex-col">
        <div className="p-4 border-b border-zinc-850">
          <h2 className="text-md font-bold text-zinc-100 flex items-center">
            <Compass className="w-4.5 h-4.5 mr-2 text-purple-400" />
            <span>Unified Threads</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">Aggregated WhatsApp, Email, & Call logs</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadThreads ? (
            <div className="space-y-2 p-2">
              <div className="h-14 bg-zinc-900/50 rounded-xl animate-pulse" />
              <div className="h-14 bg-zinc-900/50 rounded-xl animate-pulse" />
            </div>
          ) : threads && threads.length > 0 ? (
            threads.map((t) => {
              const lastMsg = t.messages[0];
              const isActive = t.id === activeId;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveId(t.id)}
                  className={`w-full flex items-start space-x-3 p-3 rounded-xl text-left transition-all border ${
                    isActive
                      ? "bg-zinc-900/90 border-zinc-800 text-zinc-100"
                      : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/20"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700/60 flex items-center justify-center flex-shrink-0 text-zinc-300 font-bold">
                    {t.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold truncate text-zinc-200">{t.name}</span>
                      <span className="text-[10px] text-zinc-500">
                        {lastMsg ? new Date(lastMsg.createdAt).toLocaleDateString([], { month: "short", day: "numeric" }) : ""}
                      </span>
                    </div>
                    {lastMsg ? (
                      <div className="flex items-center space-x-1.5 mt-1">
                        {getChannelIcon(lastMsg.channel)}
                        <p className="text-xs truncate text-zinc-400/90 flex-1">{lastMsg.content}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-650 italic mt-0.5 block">No touchpoints</span>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="text-center p-6 text-xs text-zinc-600">No active contact threads. Add contacts first.</div>
          )}
        </div>
      </div>

      {/* Timeline Pane */}
      <div className="flex-1 flex flex-col bg-zinc-950/10 min-w-0">
        {activeId ? (
          <>
            {/* Header info */}
            <div className="h-16 border-b border-zinc-850 px-6 flex items-center justify-between bg-zinc-950/40">
              <div className="flex items-center space-x-3">
                <span className="font-bold text-zinc-100 text-sm">{activeThread?.name}</span>
                <span className="text-xs text-zinc-500">{activeThread?.phone || activeThread?.email || ""}</span>
              </div>
            </div>

            {/* Ingestion & Simulation Drawer */}
            <div className="grid grid-cols-1 lg:grid-cols-3 flex-1 min-h-0">
              {/* Timeline Pane (Left) */}
              <div className="lg:col-span-2 flex flex-col h-full border-r border-zinc-850">
                {/* AI Briefing (AI summary, urgency, recommended action) */}
                {latestMessage && (
                  <div className="p-4 border-b border-zinc-850 bg-purple-950/5 flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-purple-400 flex items-center bg-purple-950/30 px-2 py-0.5 border border-purple-900/50 rounded-md">
                        <Sparkles className="w-3.5 h-3.5 mr-1" />
                        <span>AI Analysis Context</span>
                      </span>
                      {latestMessage.sentiment && (
                        <span className={`text-[10px] px-2 py-0.5 border font-semibold rounded-md uppercase tracking-wider ${getSentimentBadge(latestMessage.sentiment)}`}>
                          Sentiment: {latestMessage.sentiment}
                        </span>
                      )}
                      {latestMessage.intent && (
                        <span className="text-[10px] px-2 py-0.5 border border-zinc-800 bg-zinc-900 text-zinc-400 font-semibold rounded-md capitalize">
                          Intent: {latestMessage.intent.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                    {latestMessage.aiSummary && (
                      <div className="text-xs text-zinc-300">
                        <span className="font-semibold text-zinc-400">Thread Summary:</span> {latestMessage.aiSummary}
                      </div>
                    )}
                    {latestMessage.recommendedAction && (
                      <div className="p-3 bg-purple-600/10 border border-purple-500/20 rounded-xl text-xs flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-purple-400" />
                          <span>
                            <span className="font-semibold text-purple-300">Recommended Action:</span> {latestMessage.recommendedAction}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Messages feed */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {loadMsgs ? (
                    <div className="space-y-3 p-4 animate-pulse">
                      <div className="h-10 bg-zinc-900/50 rounded-xl w-3/4" />
                      <div className="h-10 bg-zinc-900/50 rounded-xl w-1/2" />
                    </div>
                  ) : messages && messages.length > 0 ? (
                    messages.map((m) => {
                      const isInbound = m.direction === "inbound";
                      return (
                        <div key={m.id} className={`flex ${isInbound ? "justify-start" : "justify-end"}`}>
                          <div
                            className={`rounded-2xl p-4 text-xs leading-relaxed max-w-md border shadow-sm relative ${
                              isInbound
                                ? "bg-zinc-900/40 border-zinc-800 text-zinc-200"
                                : "bg-purple-600/15 border-purple-500/25 text-zinc-100"
                            }`}
                          >
                            <div className="flex items-center space-x-1.5 mb-1.5 opacity-60">
                              {getChannelIcon(m.channel)}
                              <span className="capitalize text-[10px] font-semibold tracking-wider">
                                {m.channel} ({m.direction})
                              </span>
                            </div>
                            <div className="whitespace-pre-wrap">{m.content}</div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-zinc-500 text-center text-xs">No logs on timeline yet. Use the Simulator to ingest events!</div>
                  )}
                </div>

                {/* Reply Form */}
                <div className="p-4 border-t border-zinc-850 bg-zinc-950/40">
                  <form onSubmit={handleSendReply} className="flex items-center space-x-3">
                    <input
                      type="text"
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      disabled={replyMutation.isPending}
                      className="flex-1 px-4 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs transition-all disabled:opacity-50"
                      placeholder="Type a WhatsApp response..."
                    />
                    <button
                      type="submit"
                      disabled={!replyContent.trim() || replyMutation.isPending}
                      className="p-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors shadow-md disabled:opacity-40 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>

              {/* Simulation Dashboard (Right) */}
              <div className="p-6 bg-zinc-950/40 space-y-6 overflow-y-auto">
                <div>
                  <h3 className="text-sm font-bold text-zinc-200 flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>Demo Event Ingest Simulator</span>
                  </h3>
                  <p className="text-zinc-500 text-[10px] mt-0.5 leading-normal">
                    Manually seed customer events to trigger the active AI qualification, sentiment, intent and recommended action parsing logic.
                  </p>
                </div>

                <form onSubmit={handleSimulate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400">Communication Channel</label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {[
                        { id: "whatsapp", label: "WhatsApp" },
                        { id: "email", label: "Email" },
                        { id: "call", label: "Phone Call" },
                      ].map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSimChannel(c.id as any)}
                          className={`py-2 px-3 text-center text-[10px] font-bold rounded-xl border transition-all cursor-pointer ${
                            simChannel === c.id
                              ? "bg-purple-600/10 border-purple-500/35 text-purple-300 shadow-sm"
                              : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400">Direction</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {[
                        { id: "inbound", label: "Inbound (From Client)" },
                        { id: "outbound", label: "Outbound (From Us)" },
                      ].map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setSimDirection(d.id as any)}
                          className={`py-2 px-3 text-center text-[10px] font-bold rounded-xl border transition-all cursor-pointer ${
                            simDirection === d.id
                              ? "bg-purple-600/10 border-purple-500/35 text-purple-300 shadow-sm"
                              : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400">Communication Content</label>
                    <textarea
                      required
                      value={simContent}
                      onChange={(e) => setSimContent(e.target.value)}
                      rows={4}
                      className="mt-1 block w-full px-3 py-2 border border-zinc-800 bg-zinc-900/50 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs transition-all resize-none"
                      placeholder="e.g. Can we setup a Zoom call tomorrow? The pricing seems high but we want to talk."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!simContent.trim() || simulateMutation.isPending}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 text-zinc-100" />
                    <span>{simulateMutation.isPending ? "Ingesting..." : "Ingest Simulator Event"}</span>
                  </button>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="p-12 text-center flex flex-col justify-center items-center h-full text-zinc-500">
            <MessageSquare className="w-8 h-8 text-zinc-655 mb-2 animate-bounce" />
            <p className="text-sm font-medium">Select a thread</p>
            <p className="text-xs text-zinc-600 mt-0.5">Choose a unified client timeline to view AI summaries and ingest communications.</p>
          </div>
        )}
      </div>
    </div>
  );
}
