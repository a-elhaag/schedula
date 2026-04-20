/** @jest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/react";
import ProfessorSchedulePage from "@/app/staff/schedule/page";

describe("Staff schedule page", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("shows empty published-state message when no schedule is published", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        isPublished: false,
        sessions: {},
        termLabel: "Spring 2026",
        stats: { courses: 0, rooms: 0 },
      }),
    });

    render(<ProfessorSchedulePage />);

    expect(screen.getByText(/Loading your schedule/i)).toBeTruthy();

    await waitFor(() => {
      expect(
        screen.getByText(/No published schedule available yet\. Check back soon!/i)
      ).toBeTruthy();
    });
  });

  it("renders session details for published schedules", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        isPublished: true,
        sessions: {
          Monday: [
            {
              time: "09:00 - 10:00",
              courseCode: "CS101",
              courseName: "Intro to Computing",
              type: "Lecture",
              room: "A101",
              group: "G1",
            },
          ],
        },
        termLabel: "Spring 2026",
        stats: { courses: 1, rooms: 1 },
      }),
    });

    render(<ProfessorSchedulePage />);

    await waitFor(() => {
      expect(screen.getByText("CS101")).toBeTruthy();
      expect(screen.getByText("Intro to Computing")).toBeTruthy();
      expect(screen.getByText("A101")).toBeTruthy();
    });
  });
});
