"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";
import { Plus, Trash2, Calendar, CheckSquare, Square, Clock, X, User } from "lucide-react";

interface Contact {
  id: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
  dueAt: string;
  status: string;
  createdAt: string;
  contact: Contact | null;
}

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [contactId, setContactId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch Tasks
  const { data: tasks, isLoading, error } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => apiRequest("/api/tasks"),
  });

  // Fetch Contacts for selection dropdown
  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ["contacts"],
    queryFn: () => apiRequest("/api/contacts"),
  });

  // Create Task Mutation
  const createMutation = useMutation({
    mutationFn: (newTask: { title: string; dueAt: string; contactId?: string }) =>
      apiRequest("/api/tasks", {
        method: "POST",
        body: JSON.stringify(newTask),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      setIsModalOpen(false);
      setTitle("");
      setDueAt("");
      setContactId("");
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to create task");
    },
  });

  // Update Task Status Mutation
  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest(`/api/tasks/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    },
  });

  // Delete Task Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/tasks/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    },
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueAt) {
      setFormError("Task title and Due date are required");
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      dueAt: new Date(dueAt).toISOString(),
      contactId: contactId || undefined,
    });
  };

  const handleToggleStatus = (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";
    toggleMutation.mutate({ id, status: nextStatus });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Action Reminders</h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            Organize follow-ups and action items. Scoped strictly to your tenant environment.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Main tasks listing */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-zinc-900 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-6 text-center rounded-2xl bg-red-950/20 border border-red-800/40 text-red-300">
          Failed to load tasks. Please reload the page.
        </div>
      ) : tasks && tasks.length > 0 ? (
        <div className="space-y-3">
          {tasks.map((task) => {
            const isCompleted = task.status === "COMPLETED";
            return (
              <div
                key={task.id}
                className={`glass-panel rounded-2xl p-5 border-zinc-800/80 bg-zinc-900/10 glow-card flex items-center justify-between transition-all hover:border-zinc-750 ${
                  isCompleted ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => handleToggleStatus(task.id, task.status)}
                    className="text-zinc-500 hover:text-purple-400 p-1 hover:bg-zinc-800/50 rounded-lg transition-colors cursor-pointer"
                  >
                    {isCompleted ? (
                      <CheckSquare className="w-5 h-5 text-purple-400" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                  <div className="space-y-1">
                    <p className={`text-sm font-semibold text-zinc-100 ${isCompleted ? "line-through text-zinc-500" : ""}`}>
                      {task.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                      <span className="flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        <span>Due: {new Date(task.dueAt).toLocaleDateString()}</span>
                      </span>
                      {task.contact && (
                        <span className="flex items-center bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                          <User className="w-3 h-3 mr-1 text-zinc-650" />
                          <span>{task.contact.name}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="text-zinc-500 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center glass-panel rounded-2xl border-dashed border-zinc-800 text-zinc-500">
          <CheckSquare className="w-8 h-8 mx-auto mb-2 text-zinc-650" />
          <p className="text-sm font-medium">No tasks found</p>
          <p className="text-xs text-zinc-600 mt-0.5">Click 'New Task' to schedule a reminder.</p>
        </div>
      )}

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl glow-card shadow-2xl overflow-hidden border-zinc-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-850">
              <h3 className="text-lg font-bold text-zinc-100">Add New Reminder</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-200 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300">Task Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 block w-full px-3 py-2.5 border border-zinc-800 bg-zinc-900/50 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 sm:text-sm transition-all"
                  placeholder="e.g. Call Rahul to discuss pricing brochure"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300">Relates to Client (Optional)</label>
                <select
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                  className="mt-1 block w-full px-3 py-2.5 border border-zinc-800 bg-zinc-900/50 rounded-xl text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500 sm:text-sm transition-all"
                >
                  <option value="">No linked contact</option>
                  {contacts?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300">Due Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  required
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  className="mt-1 block w-full px-3 py-2.5 border border-zinc-800 bg-zinc-900/50 rounded-xl text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500 sm:text-sm transition-all"
                />
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
                  {createMutation.isPending ? "Creating..." : "Save Reminder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
