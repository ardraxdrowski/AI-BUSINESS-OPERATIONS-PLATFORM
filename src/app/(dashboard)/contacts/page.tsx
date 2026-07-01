"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";
import { Plus, Trash2, Mail, Phone, Tag, Calendar, UserPlus, X, Sparkles, Play, CheckCircle2 } from "lucide-react";

interface Contact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string;
  createdAt: string;
}

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState("DIRECT");
  const [formError, setFormError] = useState<string | null>(null);

  // Lead qualification flow simulation state
  const [isAutoModalOpen, setIsAutoModalOpen] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadCompanySize, setLeadCompanySize] = useState("10");
  const [leadBudget, setLeadBudget] = useState("15000");
  const [leadNotes, setLeadNotes] = useState("");
  const [autoLog, setAutoLog] = useState<string[] | null>(null);
  const [autoScore, setAutoScore] = useState<number | null>(null);
  const [autoReason, setAutoReason] = useState<string | null>(null);
  const [autoError, setAutoError] = useState<string | null>(null);

  // Fetch Contacts
  const { data: contacts, isLoading, error } = useQuery<Contact[]>({
    queryKey: ["contacts"],
    queryFn: () => apiRequest("/api/contacts"),
  });

  // Create Contact Mutation
  const createMutation = useMutation({
    mutationFn: (newContact: { name: string; phone?: string; email?: string; source: string }) =>
      apiRequest("/api/contacts", {
        method: "POST",
        body: JSON.stringify(newContact),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      setIsModalOpen(false);
      setName("");
      setPhone("");
      setEmail("");
      setSource("DIRECT");
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to create contact");
    },
  });

  // Lead Qualification pipeline trigger mutation
  const qualifyMutation = useMutation({
    mutationFn: (data: { name: string; email: string; phone?: string; companySize: number; budget: number; notes: string }) =>
      apiRequest("/api/automation/qualify", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-threads"] });
      
      setAutoLog(res.log || []);
      setAutoScore(res.score);
      setAutoReason(res.reason);
      setAutoError(null);
    },
    onError: (err: any) => {
      setAutoError(err.message || "Automation execution failed");
    },
  });

  // Delete Contact Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/contacts/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    },
  });

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Name is required");
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      source,
    });
  };

  const handleTriggerAutomation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim() || !leadEmail.trim()) {
      setAutoError("Lead Name and Email are required");
      return;
    }
    qualifyMutation.mutate({
      name: leadName.trim(),
      email: leadEmail.trim(),
      phone: leadPhone.trim() || undefined,
      companySize: parseInt(leadCompanySize) || 1,
      budget: parseFloat(leadBudget) || 0,
      notes: leadNotes.trim(),
    });
  };

  const handleCloseAutoModal = () => {
    setIsAutoModalOpen(false);
    setLeadName("");
    setLeadEmail("");
    setLeadPhone("");
    setLeadCompanySize("10");
    setLeadBudget("15000");
    setLeadNotes("");
    setAutoLog(null);
    setAutoScore(null);
    setAutoReason(null);
    setAutoError(null);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this contact? This will also delete any related deals.")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Contacts Database</h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            Manage leads, prospects, and automated touchpoints. Scoped strictly to your tenant.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsAutoModalOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-purple-900/40 to-blue-900/40 hover:from-purple-900/60 hover:to-blue-900/60 border border-purple-800/40 text-purple-300 text-sm font-semibold rounded-xl transition-all shadow-md cursor-pointer"
          >
            <Sparkles className="w-4 h-4 mr-0.5 animate-pulse text-purple-400" />
            <span>Simulate Lead Automation</span>
          </button>
          
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>New Contact</span>
          </button>
        </div>
      </div>

      {/* Main contacts view */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-zinc-900 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-6 text-center rounded-2xl bg-red-950/20 border border-red-800/40 text-red-300">
          Failed to load contacts. Please reload the page.
        </div>
      ) : contacts && contacts.length > 0 ? (
        <div className="glass-panel overflow-hidden rounded-2xl border-zinc-800/80 shadow-xl">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-850">
              <thead className="bg-zinc-900/40">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Contact Info
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Source
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th scope="col" className="relative px-6 py-4">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850 bg-zinc-950/20">
                {contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-zinc-900/20 transition-all">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-zinc-200">{contact.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {contact.email && (
                          <div className="flex items-center text-xs text-zinc-400">
                            <Mail className="w-3.5 h-3.5 text-zinc-500 mr-1.5" />
                            <span>{contact.email}</span>
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center text-xs text-zinc-400">
                            <Phone className="w-3.5 h-3.5 text-zinc-500 mr-1.5" />
                            <span>{contact.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-xs font-semibold border border-zinc-800 bg-zinc-900/50 text-zinc-400">
                        <Tag className="w-3 h-3 text-zinc-500 mr-1" />
                        <span className="capitalize">{contact.source.replace(/_/g, " ").toLowerCase()}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5 text-xs text-zinc-400">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{new Date(contact.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDelete(contact.id)}
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
          <Mail className="w-8 h-8 mx-auto mb-2 text-zinc-650" />
          <p className="text-sm font-medium">No contacts configured</p>
          <p className="text-xs text-zinc-600 mt-0.5">Click 'New Contact' or 'Simulate Lead Automation' to add leads.</p>
        </div>
      )}

      {/* Manual New Contact Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl glow-card shadow-2xl overflow-hidden border-zinc-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-850">
              <h3 className="text-lg font-bold text-zinc-100">Add New Contact</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-200 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddContact} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300">Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2.5 border border-zinc-800 bg-zinc-900/50 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 sm:text-sm transition-all"
                  placeholder="e.g. Maya Lin"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2.5 border border-zinc-800 bg-zinc-900/50 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 sm:text-sm transition-all"
                  placeholder="maya.lin@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 block w-full px-3 py-2.5 border border-zinc-800 bg-zinc-900/50 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 sm:text-sm transition-all"
                  placeholder="+919876543210"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300">Lead Source</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="mt-1 block w-full px-3 py-2.5 border border-zinc-800 bg-zinc-900/50 rounded-xl text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500 sm:text-sm transition-all"
                >
                  <option value="DIRECT">Direct Outbound</option>
                  <option value="WHATSAPP">WhatsApp Ingest</option>
                  <option value="EMAIL">Email Marketing</option>
                  <option value="WEB_LEAD">Web Lead</option>
                </select>
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
                  {createMutation.isPending ? "Creating..." : "Save Contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Simulated Lead Qualification Automation Modal */}
      {isAutoModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl glow-card shadow-2xl overflow-hidden border-zinc-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-850 bg-zinc-900/30">
              <h3 className="text-lg font-bold text-zinc-100 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-purple-400 animate-pulse" />
                <span>Simulate Inbound Lead Automation Flow</span>
              </h3>
              <button
                onClick={handleCloseAutoModal}
                className="text-zinc-500 hover:text-zinc-200 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {!autoLog ? (
                <form onSubmit={handleTriggerAutomation} className="space-y-4">
                  <p className="text-zinc-400 text-xs leading-normal">
                    This triggers a full multi-step B2B qualification workflow: Ingest Lead &rarr; Compute AI Score &rarr; Create Deal &rarr; Execute conditional logic (Score &gt; 80 triggers priority WhatsApp and schedules a task).
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400">Lead Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={leadName}
                        onChange={(e) => setLeadName(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-zinc-800 bg-zinc-900/50 rounded-xl text-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                        placeholder="Aditi Verma"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400">Email Address <span className="text-red-500">*</span></label>
                      <input
                        type="email"
                        required
                        value={leadEmail}
                        onChange={(e) => setLeadEmail(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-zinc-800 bg-zinc-900/50 rounded-xl text-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                        placeholder="aditi@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-zinc-400">Phone Number (Optional)</label>
                      <input
                        type="text"
                        value={leadPhone}
                        onChange={(e) => setLeadPhone(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-zinc-800 bg-zinc-900/50 rounded-xl text-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                        placeholder="+918888888888"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400">Employees</label>
                      <input
                        type="number"
                        value={leadCompanySize}
                        onChange={(e) => setLeadCompanySize(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-zinc-800 bg-zinc-900/50 rounded-xl text-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400">Estimated Budget (USD)</label>
                    <input
                      type="number"
                      value={leadBudget}
                      onChange={(e) => setLeadBudget(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-zinc-800 bg-zinc-900/50 rounded-xl text-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400">Inbound Notes / Request Details</label>
                    <textarea
                      value={leadNotes}
                      onChange={(e) => setLeadNotes(e.target.value)}
                      rows={3}
                      className="mt-1 block w-full px-3 py-2 border border-zinc-800 bg-zinc-900/50 rounded-xl text-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none"
                      placeholder="e.g. Urgent setup requested for our operations dashboard. We are looking to buy this month."
                    />
                  </div>

                  {autoError && (
                    <p className="text-red-400 text-xs font-semibold text-center mt-1">{autoError}</p>
                  )}

                  <div className="pt-4 border-t border-zinc-850 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={handleCloseAutoModal}
                      className="px-4 py-2 border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={qualifyMutation.isPending}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{qualifyMutation.isPending ? "Executing Flow..." : "Trigger Qualification"}</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  {/* Results cards */}
                  <div className="p-4 bg-purple-950/20 border border-purple-900/40 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-purple-400">Lead evaluated successfully</p>
                      <p className="text-sm font-bold text-zinc-200 mt-1">{leadName} ({leadEmail})</p>
                      <p className="text-xs text-zinc-400 mt-0.5 italic">{autoReason}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold border ${
                        (autoScore || 0) >= 80
                          ? "text-emerald-400 bg-emerald-950/30 border-emerald-900/40"
                          : "text-amber-400 bg-amber-950/30 border-amber-900/40"
                      }`}>
                        {autoScore} / 100
                      </span>
                      <p className="text-[10px] text-zinc-500 mt-1">AI Lead Score</p>
                    </div>
                  </div>

                  {/* Flow pipeline logs */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Automation Pipeline Log</p>
                    <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-2.5 font-mono text-[11px] text-zinc-350">
                      {autoLog.map((logStr, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                          <span>{logStr}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-850 flex justify-end">
                    <button
                      onClick={handleCloseAutoModal}
                      className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Close & Refresh Database
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
