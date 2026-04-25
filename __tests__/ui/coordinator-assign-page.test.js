/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CoordinatorAssignPage from "@/app/coordinator/assign/page";

const assignPayload = {
  courses: [
    {
      id: "c1",
      code: "CS101",
      name: "Intro to Computing",
      creditHours: 3,
      sections: 2,
      assignedStaff: ["s1"],
    },
  ],
  staff: [
    {
      id: "s1",
      name: "Prof Ada Lovelace",
      email: "ada@example.com",
      role: "professor",
      assignments: 1,
    },
    {
      id: "s2",
      name: "TA Grace Hopper",
      email: "grace@example.com",
      role: "ta",
      assignments: 0,
    },
  ],
};

describe("Coordinator assign page", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("filters staff list via search", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => assignPayload,
    });

    render(<CoordinatorAssignPage />);

    await waitFor(() => {
      expect(screen.getByText("Assign Staff to Courses")).toBeTruthy();
      expect(screen.getByText("Prof Ada Lovelace")).toBeTruthy();
      expect(screen.getByText("TA Grace Hopper")).toBeTruthy();
    });

    fireEvent.change(screen.getByPlaceholderText(/Search staff/i), {
      target: { value: "nonexistent" },
    });

    await waitFor(() => {
      expect(screen.getByText("No staff found.")).toBeTruthy();
    });
  });

  it("unassign sends PUT request", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => assignPayload,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

    render(<CoordinatorAssignPage />);

    await waitFor(() => {
      expect(screen.getByText("Assign Staff to Courses")).toBeTruthy();
    });

    fireEvent.click(screen.getByTitle("Remove assignment"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    const putCall = global.fetch.mock.calls[1];
    expect(putCall[0]).toBe("/api/coordinator/assign");
    expect(putCall[1].method).toBe("PUT");

    const putBody = JSON.parse(putCall[1].body);
    expect(putBody).toMatchObject({
      courseId: "c1",
      staffId: "s1",
      action: "unassign",
    });
  });
});
