/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CoordinatorScheduleReviewPage from "@/app/coordinator/schedule/review/page";

const reviewPayload = {
  scheduleId: "sched-1",
  sessions: [
    {
      day: "Monday",
      start: "09:00",
      end: "10:00",
      code: "CS101",
      name: "Intro to Computing",
      instructor: "Prof Ada",
      room: "A101",
      type: "Lecture",
    },
  ],
  conflicts: [
    {
      type: "room",
      slot: "Monday-09:00-10:00",
      conflictKey: "room:Monday-09:00-10:00",
      entries: [{ course_id: "c1", section_id: "G1" }],
    },
  ],
  resolvedConflicts: [],
  isPublished: false,
  stats: {
    totalSessions: 1,
    unresolved: 1,
    resolved: 0,
    coverage: 50,
  },
};

describe("Coordinator schedule review page", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("renders active conflicts and approve action", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => reviewPayload,
    });

    render(<CoordinatorScheduleReviewPage />);

    await waitFor(() => {
      expect(screen.getByText("Review Schedule")).toBeTruthy();
      expect(screen.getByText("Active Conflicts (1)")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Approve Schedule" })).toBeTruthy();
    });
  });

  it("resolve conflict posts resolve_conflict action", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => reviewPayload,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...reviewPayload, conflicts: [], resolvedConflicts: reviewPayload.conflicts }),
      });

    render(<CoordinatorScheduleReviewPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Resolve" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Resolve" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    const resolveCall = global.fetch.mock.calls[1];
    expect(resolveCall[0]).toBe("/api/coordinator/schedule/review");
    expect(resolveCall[1].method).toBe("POST");

    const payload = JSON.parse(resolveCall[1].body);
    expect(payload.action).toBe("resolve_conflict");
    expect(payload.scheduleId).toBe("sched-1");
    expect(payload.conflict.conflictKey).toBe("room:Monday-09:00-10:00");
  });
});
