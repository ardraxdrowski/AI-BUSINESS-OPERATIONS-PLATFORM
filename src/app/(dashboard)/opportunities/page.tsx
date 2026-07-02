"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";
import { Plus, Trash2, Briefcase, IndianRupee, Calendar, Sparkles, X, Layers, CheckCircle, ArrowUpRight } from "lucide-react";
import Link from "next/link";

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
}

interface Opportunity {
  id: string;
  title: string;
  value: number;
  stage: string;
  score: number | null;
  createdAt: string;
  updatedAt: string;
  contact: Contact;
}

export default function OpportunitiesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [stage, setStage] = useState("LEAD");
  const [score, setScore] = useState("");
  const [contactId, setContactId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch Opportunities
  const { data: opportunities, isLoading, error } = useQuery<Opportunity[]>({
    queryKey: ["opportunities"],
    queryFn: () => apiRequest("/api/opportunities"),
  });

  // Fetch single Opportunity Details when selected
  const { data: dealDetails, isLoading: isDetailsLoading } = useQuery({
    queryKey: ["opportunity-details", selectedDealId],
    queryFn: () => apiRequest(`/api/opportunities/${selectedDealId}`),
    enabled: !!selectedDealId,
  });

  // Fetch Contacts for selection dropdown
  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ["contacts"],
    queryFn: () => apiRequest("/api/contacts"),
  });

  // Create Opportunity Mutation
  const createMutation = useMutation({
    mutationFn: (newDeal: { title: string; value: number; stage: string; score?: number; contactId: string }) =>
      apiRequest("/api/opportunities", {
        method: "POST",
        body: JSON.stringify(newDeal),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      setIsModalOpen(false);
      setTitle("");
      setValue("");
      setStage("LEAD");
      setScore("");
      setContactId("");
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to create opportunity");
    },
  });

  // Delete Opportunity Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/opportunities/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    },
  });

  // Update Stage Mutation
  const updateStageMutation = useMutation({
    mutationFn: ({ id, nextStage }: { id: string; nextStage: string }) =>
      apiRequest(`/api/opportunities/${id}`, {
        method: "PUT",
        body: JSON.stringify({ stage: nextStage }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    },
  });

  const handleAddDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !contactId || !value) {
      setFormError("Deal title, Client, and Value are required");
      return;
    }

    createMutation.mutate({
      title: title.trim(),
      value: parseFloat(value),
      stage,
      score: score ? parseInt(score) : undefined,
      contactId,
    });
  };

  const handleStageChange = (id: string, nextStage: string) => {
    updateStageMutation.mutate({ id, nextStage });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this opportunity?")) {
      deleteMutation.mutate(id);
    }
  };

  // Helper for stage styling classes
  const getStageBadgeClass = (s: string) => {
    switch (s.toUpperCase()) {
      case "LEAD":
        return "bg-zinc-800 text-zinc-300 border-zinc-700";
      case "QUALIFIED":
        return "bg-blue-950/40 text-blue-300 border-blue-900/50";
      case "PROPOSAL":
        return "bg-purple-950/40 text-purple-300 border-purple-900/50";
      case "NEGOTIATION":
        return "bg-amber-950/40 text-amber-300 border-amber-900/50";
      case "WON":
        return "bg-emerald-950/40 text-emerald-300 border-emerald-900/50";
      case "LOST":
        return "bg-red-950/40 text-red-300 border-red-900/50";
      default:
        return "bg-zinc-800 text-zinc-300 border-zinc-700";
    }
  };

  // Helper for score color styling
  const getScoreColor = (sc: number | null) => {
    if (sc === null) return "text-zinc-500 bg-zinc-900/50 border-zinc-800";
    if (sc >= 80) return "text-emerald-400 bg-emerald-950/20 border-emerald-900/30";
    if (sc >= 50) return "text-amber-400 bg-amber-950/20 border-amber-900/30";
    return "text-red-400 bg-red-950/20 border-red-900/30";
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Pipeline Opportunities</h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            Monitor and update active sales cycles. Scoped strictly to your tenant environment.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Opportunity</span>
        </button>
      </div>

      {/* Main Deals Table */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-zinc-900 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-6 text-center rounded-2xl bg-red-950/20 border border-red-800/40 text-red-300">
          Failed to load opportunities. Please reload the page.
        </div>
      ) : opportunities && opportunities.length > 0 ? (
        <div className="glass-panel overflow-hidden rounded-2xl border-zinc-800/80 shadow-xl">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-850">
              <thead className="bg-zinc-900/40">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Deal / Title
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Client Name
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Value
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Sales Stage
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    AI Lead Score
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th scope="col" className="relative px-6 py-4">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850 bg-zinc-950/20">
                {opportunities.map((deal) => (
                  <tr 
                    key={deal.id} 
                    className="hover:bg-zinc-900/20 transition-all cursor-pointer"
                    onClick={() => setSelectedDealId(deal.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-zinc-200">{deal.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-zinc-400">{deal.contact?.name || "Unlinked"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm font-medium text-zinc-200">
                        <IndianRupee className="w-3.5 h-3.5 text-zinc-500 mr-0.5" />
                        <span>{deal.value.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={deal.stage}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleStageChange(deal.id, e.target.value)}
                        className={`text-xs px-2.5 py-1 rounded-md border font-semibold outline-none cursor-pointer ${getStageBadgeClass(deal.stage)}`}
                      >
                        <option value="LEAD">Lead</option>
                        <option value="QUALIFIED">Qualified</option>
                        <option value="PROPOSAL">Proposal</option>
                        <option value="NEGOTIATION">Negotiation</option>
                        <option value="WON">Closed Won</option>
                        <option value="LOST">Closed Lost</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {deal.score !== null ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${getScoreColor(deal.score)}`}>
                          <Sparkles className="w-3 h-3 mr-1 animate-pulse" />
                          <span>{deal.score} / 100</span>
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-500 font-medium">Unscored</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5 text-xs text-zinc-400">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{new Date(deal.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(deal.id);
                        }}
                        disabled={deleteMutation.isPending}
                        className="text-zinc-500 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center glass-panel rounded-2xl border-dashed border-zinc-800 text-zinc-500">
          <Briefcase className="w-8 h-8 mx-auto mb-2 text-zinc-650" />
          <p className="text-sm font-medium">No opportunities created</p>
          <p className="text-xs text-zinc-600 mt-0.5">Click 'New Opportunity' to create your first pipeline deal.</p>
        </div>
      )}

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl glow-card shadow-2xl overflow-hidden border-zinc-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-850">
              <h3 className="text-lg font-bold text-zinc-100">Add New Opportunity</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-200 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDeal} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300">Deal Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 block w-full px-3 py-2.5 border border-zinc-800 bg-zinc-900/50 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 sm:text-sm transition-all"
                  placeholder="e.g. Enterprise Software License"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300">Associated Client / Contact <span className="text-red-500">*</span></label>
                <select
                  required
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                  className="mt-1 block w-full px-3 py-2.5 border border-zinc-800 bg-zinc-900/50 rounded-xl text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500 sm:text-sm transition-all"
                >
                  <option value="">Select client...</option>
                  {contacts?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300">Value (INR) <span className="text-red-500">*</span></label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-zinc-500 sm:text-sm">₹</span>
                  </div>
                  <input
                    type="number"
                    required
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="block w-full pl-7 pr-3 py-2.5 border border-zinc-800 bg-zinc-900/50 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 sm:text-sm transition-all"
                    placeholder="25000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300">Stage</label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                    className="mt-1 block w-full px-3 py-2.5 border border-zinc-800 bg-zinc-900/50 rounded-xl text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500 sm:text-sm transition-all"
                  >
                    <option value="LEAD">Lead</option>
                    <option value="QUALIFIED">Qualified</option>
                    <option value="PROPOSAL">Proposal</option>
                    <option value="NEGOTIATION">Negotiation</option>
                    <option value="WON">Closed Won</option>
                    <option value="LOST">Closed Lost</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 flex items-center">
                    <span>AI Lead Score</span>
                    <Sparkles className="w-3 h-3 text-purple-400 ml-1 animate-pulse" />
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    className="mt-1 block w-full px-3 py-2.5 border border-zinc-800 bg-zinc-900/50 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 sm:text-sm transition-all"
                    placeholder="e.g. 85"
                  />
                </div>
              </div>

              {formError && (
                <p className="text-red-400 text-xs font-semibold text-center mt-1">{formError}</p>
              )}

              <div className="pt-4 border-t border-zinc-850 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {createMutation.isPending ? "Creating..." : "Save Deal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Opportunity Details Slide-over Drawer (Gap 1) */}
      {selectedDealId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
          <div 
            className="fixed inset-0" 
            onClick={() => setSelectedDealId(null)} 
          />
          <div className="relative w-full max-w-md bg-zinc-950/95 border-l border-zinc-800 h-full shadow-2xl flex flex-col z-10 animate-slide-in">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-850 bg-zinc-900/10">
              <div>
                <div className="flex items-center space-x-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
                  <Layers className="w-3 h-3" />
                  <span>Opportunity Details</span>
                </div>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {isDetailsLoading ? "Loading details..." : dealDetails?.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDealId(null)}
                className="text-zinc-500 hover:text-zinc-200 p-1.5 hover:bg-zinc-900 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isDetailsLoading ? (
                <div className="space-y-4">
                  <div className="h-24 bg-zinc-900 rounded-xl animate-pulse" />
                  <div className="h-32 bg-zinc-900 rounded-xl animate-pulse" />
                  <div className="h-48 bg-zinc-900 rounded-xl animate-pulse" />
                </div>
              ) : dealDetails ? (
                <>
                  {/* 🤖 AI Next Best Action Card (Gap 2) */}
                  <div className="glass-panel p-5 bg-gradient-to-br from-purple-950/20 to-zinc-950 border-purple-900/30 rounded-2xl relative overflow-hidden shadow-inner">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl" />
                    <div className="flex items-center space-x-2 text-xs font-bold text-purple-400 uppercase tracking-wider mb-2.5">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      <span>AI Next Best Action</span>
                    </div>
                    <p className="text-sm text-zinc-200 leading-relaxed">
                      {getNextBestAction(dealDetails.stage, dealDetails.score, dealDetails.title)}
                    </p>
                  </div>

                  {/* Deal Info List */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Deal Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="glass-panel p-4 border-zinc-800 bg-zinc-900/10 rounded-xl">
                        <span className="text-xs text-zinc-500 font-medium">Value</span>
                        <div className="text-base font-bold text-zinc-100 flex items-center mt-1">
                          <IndianRupee className="w-3.5 h-3.5 text-zinc-500 mr-0.5" />
                          <span>{dealDetails.value.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="glass-panel p-4 border-zinc-800 bg-zinc-900/10 rounded-xl">
                        <span className="text-xs text-zinc-500 font-medium">AI Lead Score</span>
                        <div className="text-base font-bold text-zinc-100 flex items-center mt-1">
                          {dealDetails.score !== null ? (
                            <span className="text-emerald-400 flex items-center">
                              <Sparkles className="w-3.5 h-3.5 mr-1 animate-pulse" />
                              <span>{dealDetails.score} / 100</span>
                            </span>
                          ) : (
                            <span className="text-zinc-500">Unscored</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="glass-panel p-4 border-zinc-800 bg-zinc-900/10 rounded-xl">
                        <span className="text-xs text-zinc-500 font-medium">Current Stage</span>
                        <div className="mt-1">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-bold border ${getStageBadgeClass(dealDetails.stage)}`}>
                            {dealDetails.stage}
                          </span>
                        </div>
                      </div>
                      <div className="glass-panel p-4 border-zinc-800 bg-zinc-900/10 rounded-xl">
                        <span className="text-xs text-zinc-500 font-medium">Created Date</span>
                        <div className="text-sm font-semibold text-zinc-300 mt-1 flex items-center">
                          <Calendar className="w-3.5 h-3.5 text-zinc-500 mr-1.5" />
                          <span>{new Date(dealDetails.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Associated Client / Contact */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Associated Contact</h4>
                    {dealDetails.contact ? (
                      <div className="glass-panel p-4 border-zinc-800 bg-zinc-900/10 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-bold text-zinc-200">{dealDetails.contact.name}</div>
                          <span className="text-[10px] px-2 py-0.5 border font-semibold rounded-md border-zinc-700 bg-zinc-800 text-zinc-400">
                            CLIENT
                          </span>
                        </div>
                        <div className="text-xs text-zinc-400 space-y-1">
                          {dealDetails.contact.email && <div>✉️ {dealDetails.contact.email}</div>}
                          {dealDetails.contact.phone && <div>📞 {dealDetails.contact.phone}</div>}
                          {dealDetails.contact.company && <div>🏢 {dealDetails.contact.company}</div>}
                        </div>
                        <div className="pt-2">
                          <Link 
                            href="/inbox" 
                            className="inline-flex w-full items-center justify-center space-x-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-750 text-zinc-300 text-xs font-semibold rounded-xl transition-all"
                          >
                            <span>View Conversation Timeline</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-500 italic">No contact associated with this deal.</p>
                    )}
                  </div>

                  {/* Related Audit Logs / Operations Timeline */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Operations History</h4>
                    {dealDetails.auditLogs && dealDetails.auditLogs.length > 0 ? (
                      <div className="flow-root">
                        <ul role="list" className="-mb-8">
                          {dealDetails.auditLogs.map((log: any, logIdx: number) => (
                            <li key={log.id}>
                              <div className="relative pb-8">
                                {logIdx !== dealDetails.auditLogs.length - 1 ? (
                                  <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-zinc-800" aria-hidden="true" />
                                ) : null}
                                <div className="relative flex space-x-3">
                                  <div>
                                    <span className="h-8 w-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                                      <CheckCircle className="w-4 h-4 text-purple-400" />
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                                    <div>
                                      <p className="text-xs font-semibold text-zinc-300">
                                        {log.action.replace("_", " ")}
                                      </p>
                                      <p className="text-[10px] text-zinc-500 mt-0.5">
                                        Actor: {log.actorId.substring(0, 8)}...
                                      </p>
                                    </div>
                                    <div className="text-right text-[10px] whitespace-nowrap text-zinc-500">
                                      <time dateTime={log.createdAt}>{new Date(log.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</time>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500 italic">No audit records found for this opportunity.</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center p-6 text-zinc-400">Failed to load deal details.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const getNextBestAction = (stage: string, score: number | null, title: string) => {
  switch (stage.toUpperCase()) {
    case "LEAD":
      if (score && score >= 80) {
        return `AI Recommendation: High-potential lead identified (Score: ${score}/100) for "${title}". Reach out immediately via WhatsApp to schedule an introductory call and present the customized service catalog.`;
      }
      return `AI Recommendation: Standard lead. Enroll this contact into our automated nurturing campaign and schedule an initial email touchpoint in 3 days.`;
    case "QUALIFIED":
      return `AI Recommendation: Lead qualified. Schedule a 30-minute discovery sync to review project requirements, define scope parameters, and prepare the project estimate.`;
    case "PROPOSAL":
      return `AI Recommendation: Proposal sent. Follow up on active SLA clauses or contract feedback. Ready to draft pricing options if negotiation begins.`;
    case "NEGOTIATION":
      return `AI Recommendation: Negotiation stage. Highlight our SLA performance guarantees and outline the 5% premium discount option to incentivize a sign-off before Friday.`;
    case "WON":
      return `AI Recommendation: Deal won! Trigger the onboarding playbook, allocate project delivery engineers, and set up the shared Slack workspace.`;
    case "LOST":
      return `AI Recommendation: Deal lost. Log competitor feedback in the CRM and schedule a post-mortem review in 30 days to optimize future bids.`;
    default:
      return "AI Recommendation: Conduct initial contact research and verify the prospect's decision-making budget.";
  }
};
