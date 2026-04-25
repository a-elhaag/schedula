/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CoordinatorScheduleGeneratePage from "@/app/coordinator/schedule/generate/page";

describe("Coordinator schedule generate page", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("renders checklist and recent job details", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        stats: { courses: 12, staff: 8, rooms: 10 },
        readiness: {
          courses: true,
          staff: true,
          rooms: true,
          availability: false,
          constraints: true,
        },
        recentJobs: [
          {
            status: "failed_infeasible",
            status_message: "Room capacity mismatch for CS101",
            term_label: "Spring 2026",
            created_at: "2026-04-20T10:00:00.000Z",
          },
        ],
      }),
    });

    render(<CoordinatorScheduleGeneratePage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Generate Schedule" })).toBeTruthy();
      expect(screen.getByText("Pre-Generation Checklist")).toBeTruthy();
      expect(screen.getByText("Room capacity mismatch for CS101")).toBeTruthy();
    });
  });

  it("shows solver feedback when generate request fails", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stats: { courses: 2, staff: 2, rooms: 2 },
          readiness: {
            courses: true,
            staff: true,
            rooms: true,
            availability: true,
            constraints: true,
          },
          recentJobs: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: "Solver service unavailable" }),
      });

    render(<CoordinatorScheduleGeneratePage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Generate Schedule" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Generate Schedule" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(screen.getByText("Solver feedback")).toBeTruthy();
      expect(screen.getAllByText("Solver service unavailable").length).toBeGreaterThan(0);
    });
  });
});
