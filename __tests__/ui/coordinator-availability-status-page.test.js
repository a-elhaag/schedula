/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CoordinatorAvailabilityStatusPage from "@/app/coordinator/availability/status/page";

const basePayload = {
  term: "Spring 2026",
  staff: [
    {
      id: "s1",
      name: "Prof Ada Lovelace",
      email: "ada@example.com",
      role: "professor",
      status: "submitted",
      slotCount: 3,
      slots: [{ day: "Monday", slot: "09:00" }],
    },
    {
      id: "s2",
      name: "TA Grace Hopper",
      email: "grace@example.com",
      role: "ta",
      status: "missing",
      slotCount: 0,
      slots: [],
    },
  ],
};

describe("Coordinator availability status page", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("renders staff rows and filters to missing", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => basePayload,
    });

    render(<CoordinatorAvailabilityStatusPage />);

    await waitFor(() => {
      expect(screen.getByText("Availability Status")).toBeTruthy();
      expect(screen.getByText("Prof Ada Lovelace")).toBeTruthy();
      expect(screen.getByText("TA Grace Hopper")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Missing" }));

    await waitFor(() => {
      expect(screen.queryByText("Prof Ada Lovelace")).toBeNull();
      expect(screen.getByText("TA Grace Hopper")).toBeTruthy();
    });
  });

  it("refresh button reloads data", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => basePayload,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...basePayload, staff: [...basePayload.staff, {
          id: "s3",
          name: "Prof Alan Turing",
          email: "alan@example.com",
          role: "professor",
          status: "submitted",
          slotCount: 2,
          slots: [{ day: "Tuesday", slot: "11:00" }],
        }] }),
      });

    render(<CoordinatorAvailabilityStatusPage />);

    await waitFor(() => {
      expect(screen.getByText("Staff Availability")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(screen.getByText("Prof Alan Turing")).toBeTruthy();
    });
  });
});
