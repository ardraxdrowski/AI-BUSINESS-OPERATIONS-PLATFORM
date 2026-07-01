import { describe, it, expect } from "vitest";
import React from "react";

// Local unit test of frontend UI helper logic for the Chat Interface Component
// This tests that our UI component helper formatters correctly handle AI tool call execution logs
const formatToolCallBadgeTitle = (callsCount: number) => {
  if (callsCount === 0) return "No actions executed";
  return `AI Tool Execution Log (${callsCount})`;
};

const formatToolCallActionName = (name: string) => {
  return name.replace(/_/g, " ").toUpperCase();
};

describe("Frontend Chat Component UI Helpers", () => {
  it("should format the tool calls badge title correctly", () => {
    expect(formatToolCallBadgeTitle(0)).toBe("No actions executed");
    expect(formatToolCallBadgeTitle(3)).toBe("AI Tool Execution Log (3)");
  });

  it("should clean and capitalize the database function names for display", () => {
    expect(formatToolCallActionName("search_contacts")).toBe("SEARCH CONTACTS");
    expect(formatToolCallActionName("send_whatsapp")).toBe("SEND WHATSAPP");
    expect(formatToolCallActionName("create_task")).toBe("CREATE TASK");
  });
});
