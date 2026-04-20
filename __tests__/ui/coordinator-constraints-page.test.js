/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CoordinatorConstraintsPage from "@/app/coordinator/constraints/page";

describe("Coordinator constraints page", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("loads constraints and saves updated values", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hard: {
            no_room_overlap: true,
            no_staff_overlap: true,
            respect_availability: true,
            room_capacity: false,
            working_days_only: true,
          },
          soft: {
            minimize_gaps: 65,
            balance_workload: 55,
            prefer_morning: 40,
            group_by_course: 50,
            room_utilization: 45,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

    render(<CoordinatorConstraintsPage />);

    await waitFor(() => {
      expect(screen.getByText("Scheduling Constraints")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Save Constraints"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    const saveCall = global.fetch.mock.calls[1];
    expect(saveCall[0]).toBe("/api/coordinator/constraints");
    expect(saveCall[1].method).toBe("POST");

    const body = JSON.parse(saveCall[1].body);
    expect(body.hard.room_capacity).toBe(false);
    expect(body.soft.minimize_gaps).toBe(65);
  });

  it("reset to defaults restores hard=true and soft=50 before saving", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hard: {
            no_room_overlap: false,
            no_staff_overlap: false,
            respect_availability: false,
            room_capacity: false,
            working_days_only: false,
          },
          soft: {
            minimize_gaps: 10,
            balance_workload: 20,
            prefer_morning: 30,
            group_by_course: 40,
            room_utilization: 60,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

    render(<CoordinatorConstraintsPage />);

    await waitFor(() => {
      expect(screen.getByText("Scheduling Constraints")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Reset to Defaults"));
    fireEvent.click(screen.getByText("Save Constraints"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    const saveBody = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(Object.values(saveBody.hard).every(Boolean)).toBe(true);
    expect(Object.values(saveBody.soft).every((v) => v === 50)).toBe(true);
  });
});
