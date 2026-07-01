"use client";

import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";
import {
  Sparkles,
  Send,
  Plus,
  MessageSquare,
  HelpCircle,
  ShieldCheck,
  Cpu,
  User,
  CheckCircle2,
  Calendar,
  Briefcase,
  Smartphone,
} from "lucide-react";

interface AIMessage {
  id: string;
  role: string;
  content: string;
  toolCalls: any;
  createdAt: string;
}

interface AIConversation {
  id: string;
  title: string;
  createdAt: string;
}

export default function ChatPage() {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Conversations list
  const { data: conversations, isLoading: loadConvs } = useQuery<AIConversation[]>({
    queryKey: ["conversations"],
    queryFn: () => apiRequest("/api/chat/conversations"), // We need to write this endpoint! Or we can handle it in route.ts
  });

  // We should make sure we create an endpoint to fetch conversations, let's create a quick API GET route for conversations list!
  // In the meantime, let's query the messages for the active conversation
  const { data: messages, isLoading: loadMsgs } = useQuery<AIMessage[]>({
    queryKey: ["messages", activeId],
    queryFn: () => apiRequest(`/api/chat/messages?conversationId=${activeId}`), // We need to write this endpoint too!
    enabled: !!activeId,
  });

  // Scroll to bottom when messages or streaming text updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // Handle message submit with custom Fetch/EventStream reader for genuine token streaming
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isStreaming) return;

    setInputText("");
    setStreamingText("");
    setIsStreaming(true);

    // Save locally to display user message instantly in UI before request completes
    const tempUserMsg: AIMessage = {
      id: `temp-user-${Date.now()}`,
      role: "user",
      content: textToSend,
      toolCalls: null,
      createdAt: new Date().toISOString(),
    };

    // Optimistically update query cache
    queryClient.setQueryData<AIMessage[]>(["messages", activeId], (old = []) => [
      ...old,
      tempUserMsg,
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: textToSend,
          conversationId: activeId || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Chat request failed");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let finished = false;

      if (!reader) return;

      while (!finished) {
        const { value, done } = await reader.read();
        finished = done;
        if (value) {
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.substring(6));
                if (data.text) {
                  setStreamingText((prev) => prev + data.text);
                }
                if (data.done) {
                  // Capture new conversation ID if initialized
                  if (!activeId && data.conversationId) {
                    setActiveId(data.conversationId);
                    queryClient.invalidateQueries({ queryKey: ["conversations"] });
                  }
                }
              } catch (_) {}
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsStreaming(false);
      setStreamingText("");
      queryClient.invalidateQueries({ queryKey: ["messages", activeId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    }
  };

  const handleSuggestClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const handleStartNewChat = () => {
    setActiveId(null);
  };

  // Helper to render executed tool calls badge
  const renderToolCalls = (toolCalls: any) => {
    if (!toolCalls) return null;
    try {
      const calls = typeof toolCalls === "string" ? JSON.parse(toolCalls) : toolCalls;
      if (!Array.isArray(calls) || calls.length === 0) return null;

      return (
        <div className="mt-3 space-y-2">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 flex items-center">
            <Cpu className="w-3.5 h-3.5 mr-1 text-purple-400" />
            <span>AI Tool Execution Log ({calls.length})</span>
          </p>
          <div className="space-y-1.5">
            {calls.map((tc: any, index: number) => {
              const nameFormatted = tc.name.replace(/_/g, " ");
              const hasError = tc.result?.error;

              return (
                <div
                  key={index}
                  className={`text-xs px-3.5 py-2.5 rounded-xl border flex items-center justify-between ${
                    hasError
                      ? "bg-red-950/20 border-red-900/30 text-red-300"
                      : "bg-zinc-900/40 border-zinc-800/80 text-zinc-300"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {hasError ? (
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-purple-400" />
                    )}
                    <span className="font-semibold capitalize">{nameFormatted}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {JSON.stringify(tc.args)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    } catch (_) {
      return null;
    }
  };

  const suggestions = [
    "Show my business metrics",
    "Find Rahul in my contacts",
    "Set Maya's opportunity to Won",
    "Schedule Maya review task for tomorrow",
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-zinc-950/20 rounded-2xl border border-zinc-800/80 overflow-hidden relative glow-card">
      {/* Conversations History Sidebar */}
      <div className="w-64 border-r border-zinc-800/80 bg-zinc-950/40 flex flex-col">
        <div className="p-4 border-b border-zinc-850">
          <button
            onClick={handleStartNewChat}
            className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-purple-600/10 hover:bg-purple-600/25 border border-purple-500/20 text-purple-300 hover:text-purple-200 text-sm font-semibold rounded-xl transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadConvs ? (
            <div className="space-y-2 p-2">
              <div className="h-10 bg-zinc-900 rounded-xl animate-pulse" />
              <div className="h-10 bg-zinc-900 rounded-xl animate-pulse" />
            </div>
          ) : conversations && conversations.length > 0 ? (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${
                  activeId === c.id
                    ? "bg-zinc-900 text-zinc-100 border border-zinc-850"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30"
                }`}
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0 text-zinc-500" />
                <span className="truncate">{c.title}</span>
              </button>
            ))
          ) : (
            <div className="text-center p-4 text-xs text-zinc-600">No recent chat sessions.</div>
          )}
        </div>
      </div>

      {/* Message Chat Pane */}
      <div className="flex-1 flex flex-col bg-zinc-950/10">
        {/* Status Header */}
        <div className="h-16 border-b border-zinc-850 px-6 flex items-center justify-between bg-zinc-950/40">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/20 flex items-center justify-center">
                <Cpu className="w-4.5 h-4.5 text-purple-400" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-zinc-950 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-zinc-100">DareX AI Employee</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-md font-semibold">gemini-1.5</span>
              </div>
              <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Online • Ready to execute</p>
            </div>
          </div>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* AI Onboarding Briefing Card (Welcome Screen) */}
          {!activeId && (!messages || messages.length === 0) && (
            <div className="max-w-2xl mx-auto space-y-6 pt-6">
              <div className="glass-panel p-6 rounded-2xl glow-card border-zinc-800/80 bg-zinc-900/10 space-y-3">
                <div className="flex items-center space-x-2 text-purple-400 text-sm font-semibold tracking-wide uppercase">
                  <Sparkles className="w-4 h-4" />
                  <span>AI Workspace Briefing</span>
                </div>
                <h3 className="text-lg font-bold text-zinc-100">Good Morning</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  I reviewed yesterday's performance, the overnight activity logs, and the active deals pipeline. I am ready to search contacts, update deal stages, schedule reminder tasks, check KPI metrics, and dispatch WhatsApp campaign messages.
                </p>
              </div>

              {/* Suggestions chips */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Suggested Actions</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestClick(s)}
                      className="px-4 py-3 text-left text-xs font-medium bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Messages Loop */}
          {activeId && loadMsgs ? (
            <div className="space-y-4">
              <div className="h-12 bg-zinc-900/50 rounded-xl w-3/4 animate-pulse" />
              <div className="h-24 bg-zinc-900/50 rounded-xl w-2/3 animate-pulse self-end" />
            </div>
          ) : (
            messages?.map((msg) => {
              const isAI = msg.role === "model";
              return (
                <div
                  key={msg.id}
                  className={`flex ${isAI ? "justify-start" : "justify-end"} max-w-3xl ${
                    isAI ? "mr-auto" : "ml-auto"
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {isAI && (
                      <div className="w-8 h-8 rounded-lg bg-purple-950/40 border border-purple-900/40 flex items-center justify-center text-purple-400 mt-1 flex-shrink-0">
                        <Cpu className="w-4.5 h-4.5" />
                      </div>
                    )}
                    <div
                      className={`rounded-2xl p-4.5 text-sm leading-relaxed border ${
                        isAI
                          ? "bg-zinc-900/30 border-zinc-800/80 text-zinc-200"
                          : "bg-purple-600/20 border-purple-500/30 text-zinc-100"
                      }`}
                    >
                      <div className="whitespace-pre-line">{msg.content}</div>
                      {/* Render executed tool calls if present */}
                      {isAI && renderToolCalls(msg.toolCalls)}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Streaming Text Render */}
          {isStreaming && streamingText && (
            <div className="flex justify-start max-w-3xl mr-auto">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-lg bg-purple-950/40 border border-purple-900/40 flex items-center justify-center text-purple-400 mt-1 flex-shrink-0 animate-pulse">
                  <Cpu className="w-4.5 h-4.5" />
                </div>
                <div className="rounded-2xl p-4.5 text-sm leading-relaxed border bg-zinc-900/30 border-zinc-800/80 text-zinc-200">
                  <div className="whitespace-pre-line flex items-center">
                    <span>{streamingText}</span>
                    <span className="w-1.5 h-4 ml-1 bg-purple-400 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Anchor to scroll */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-zinc-850 bg-zinc-950/40">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputText);
            }}
            className="flex items-center space-x-3 max-w-4xl mx-auto"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isStreaming}
              className="flex-1 px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm transition-all disabled:opacity-50"
              placeholder={isStreaming ? "AI Employee is executing tools..." : "Ask your AI Employee to execute something..."}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isStreaming}
              className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors shadow-md disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-4.5 h-4.5" />
            </button>
          </form>
          <div className="max-w-4xl mx-auto flex items-center justify-between mt-2.5 px-1 text-[10px] text-zinc-500">
            <span className="flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-650 mr-1" />
              <span>Multi-tenant Isolation Enforced</span>
            </span>
            <span>AI actions are recommendations. Review logs.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
