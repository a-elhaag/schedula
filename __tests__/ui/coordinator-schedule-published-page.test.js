/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CoordinatorSchedulePublishedPage from "@/app/coordinator/schedule/published/page";

describe("Coordinator schedule published page", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("shows empty published state when no schedule exists", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          scheduleId: null,
          termLabel: "Spring 2026",
          sessions: {},
          stats: { courses: 0, staff: 0 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ revisions: [] }),
      });

    render(<CoordinatorSchedulePublishedPage />);

    await waitFor(() => {
      expect(screen.getByText("No Published Schedule")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Go to Generate" })).toBeTruthy();
    });
  });

  it("loads comparison data and unpublish sends POST", async () => {
    global.fetch = jest.fn().mockImplementation(async (url, options = {}) => {
      if (url === "/api/coordinator/schedule/published" && options.method === "POST") {
        return {
          ok: true,
          json: async () => ({ ok: true }),
        };
      }

      if (url === "/api/coordinator/schedule/published") {
        return {
          ok: true,
          json: async () => ({
            scheduleId: "sched-2",
            termLabel: "Spring 2026",
            publishedAt: "2026-04-20T12:00:00.000Z",
            sessions: {
              Monday: [
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
            },
            stats: { courses: 1, staff: 1 },
          }),
        };
      }

      if (String(url).startsWith("/api/coordinator/schedule/revisions?")) {
        return {
          ok: true,
          json: async () => ({
            revisions: [
              { id: "r2", revisionNumber: 2, sessionCount: 2 },
              { id: "r1", revisionNumber: 1, sessionCount: 1 },
            ],
          }),
        };
      }

      if (String(url).startsWith("/api/coordinator/schedule/revisions/compare?")) {
        return {
          ok: true,
          json: async () => ({
            summary: {
              added: 1,
              removed: 0,
              reassigned: 1,
              unchanged: 1,
            },
            changes: {
              added: [
                { day: "Tuesday", start: "11:00", end: "12:00", code: "CS202", room: "B201" },
              ],
              removed: [],
              reassigned: [
                {
                  before: { room: "A101" },
                  after: { code: "CS101", room: "B201" },
                },
              ],
            },
          }),
        };
      }

      throw new Error(`Unhandled fetch URL: ${url}`);
    });

    render(<CoordinatorSchedulePublishedPage />);

    await waitFor(() => {
      expect(screen.getByText("Revision History & Compare")).toBeTruthy();
    });

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "1" } });
    fireEvent.change(selects[1], { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Compare Revisions" }));

    await waitFor(() => {
      expect(screen.getByText("Added Sessions")).toBeTruthy();
      expect(screen.getByText("Tuesday 11:00-12:00 · CS202 · B201")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Unpublish" }));

    await waitFor(() => {
      const postCall = global.fetch.mock.calls.find(
        (call) => call[0] === "/api/coordinator/schedule/published" && call[1]?.method === "POST"
      );
      expect(postCall).toBeTruthy();
      const body = JSON.parse(postCall[1].body);
      expect(body.action).toBe("unpublish");
      expect(body.scheduleId).toBe("sched-2");
    });
  });
});
