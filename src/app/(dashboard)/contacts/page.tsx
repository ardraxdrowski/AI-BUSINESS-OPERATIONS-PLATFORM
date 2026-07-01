"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";
import { Plus, Trash2, Mail, Phone, Tag, Calendar, UserPlus, X } from "lucide-react";

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
      // Reset form & Close modal
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

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this contact? This will also delete any related deals.")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Contacts Database</h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            Manage your leads, prospects, and customers. Scoped strictly to your tenant environment.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>New Contact</span>
        </button>
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
                    Date Added
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
                      <div className="flex flex-col space-y-1 text-sm text-zinc-400">
                        {contact.email && (
                          <div className="flex items-center space-x-1.5">
                            <Mail className="w-3.5 h-3.5 text-zinc-500" />
                            <span>{contact.email}</span>
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center space-x-1.5">
                            <Phone className="w-3.5 h-3.5 text-zinc-500" />
                            <span>{contact.phone}</span>
                          </div>
                        )}
                        {!contact.email && !contact.phone && (
                          <span className="text-zinc-600 italic">No details</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-zinc-800/80 text-zinc-300 border border-zinc-700/50">
                        <Tag className="w-3 h-3 mr-1 text-zinc-500" />
                        {contact.source}
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
          <Plus className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
          <p className="text-sm font-medium">No contacts found</p>
          <p className="text-xs text-zinc-650 mt-0.5">Click 'New Contact' to create your first client record.</p>
        </div>
      )}

      {/* Modal Dialog */}
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
                  placeholder="e.g. Rahul Sharma"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2.5 border border-zinc-800 bg-zinc-900/50 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 sm:text-sm transition-all"
                  placeholder="name@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 block w-full px-3 py-2.5 border border-zinc-800 bg-zinc-900/50 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 sm:text-sm transition-all"
                  placeholder="+91 99999 99999"
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
    </div>
  );
}
