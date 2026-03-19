"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import "./styles.css";

const DAYS = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

function StateMessage({ title, description }) {
  return (
    <div className="state-card" role="status">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

export default function StudentSchedulePage() {
  const [schedule, setSchedule] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Filter state
  const [selectedDay, setSelectedDay] = useState("");
  const [courseCodeFilter, setCourseCodeFilter] = useState("");
  const [instructorFilter, setInstructorFilter] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (selectedDay) params.append("day", selectedDay);
      if (courseCodeFilter) params.append("courseCode", courseCodeFilter);
      if (instructorFilter)
        params.append("instructorId", instructorFilter);
      params.append("limit", pageSize);
      params.append("skip", (currentPage - 1) * pageSize);

      const response = await fetch(`/api/student/schedule?${params}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        throw new Error(
          payload?.error?.message ?? "Failed to load schedule"
        );
      }

      setSchedule(payload.data);
    } catch (fetchError) {
      setError(
        fetchError.message || "Unable to load schedule right now"
      );
    } finally {
      setLoading(false);
    }
  }, [selectedDay, courseCodeFilter, instructorFilter, currentPage]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const hasEntries = useMemo(
    () => Array.isArray(schedule?.entries) && schedule.entries.length > 0,
    [schedule],
  );

  const totalPages = useMemo(
    () => (schedule ? Math.ceil(schedule.total / pageSize) : 0),
    [schedule],
  );

  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const handleDayChange = (e) => {
    setSelectedDay(e.target.value);
    handleFilterChange();
  };

  const handleCourseCodeChange = (e) => {
    setCourseCodeFilter(e.target.value);
    handleFilterChange();
  };

  const handleInstructorChange = (e) => {
    setInstructorFilter(e.target.value);
    handleFilterChange();
  };

  const handleClearFilters = () => {
    setSelectedDay("");
    setCourseCodeFilter("");
    setInstructorFilter("");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    selectedDay || courseCodeFilter || instructorFilter;

  return (
    <div className="page-container">
      <div className="schedule-shell">
        <div className="schedule-header">
          <h1>Student Schedule</h1>
          {schedule?.termLabel ? <p>{schedule.termLabel}</p> : null}
        </div>

        {/* Filter Controls */}
        <div className="filter-bar">
          <div className="filter-group">
            <label htmlFor="day-select">Day:</label>
            <select
              id="day-select"
              value={selectedDay}
              onChange={handleDayChange}
            >
              <option value="">All days</option>
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="course-input">Course Code:</label>
            <input
              id="course-input"
              type="text"
              placeholder="e.g., SET121"
              value={courseCodeFilter}
              onChange={handleCourseCodeChange}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="instructor-input">Instructor ID:</label>
            <input
              id="instructor-input"
              type="text"
              placeholder="Instructor ID"
              value={instructorFilter}
              onChange={handleInstructorChange}
            />
          </div>

          {hasActiveFilters ? (
            <button className="btn-clear" onClick={handleClearFilters}>
              Clear Filters
            </button>
          ) : null}
        </div>

        {loading ? (
          <StateMessage title="Loading schedule" description="Please wait..." />
        ) : null}

        {!loading && error ? (
          <StateMessage title="Could not load schedule" description={error} />
        ) : null}

        {!loading && !error && !hasEntries ? (
          <StateMessage
            title="No sessions yet"
            description="Your timetable is not available yet."
          />
        ) : null}

        {!loading && !error && hasEntries ? (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Time</th>
                    <th>Course</th>
                    <th>Section</th>
                    <th>Room</th>
                    <th>Instructor</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.entries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.day}</td>
                      <td>
                        {entry.start} - {entry.end}
                      </td>
                      <td>
                        <strong>{entry.courseCode}</strong>
                        <span>{entry.courseName}</span>
                      </td>
                      <td>{entry.sectionId}</td>
                      <td>{entry.roomLabel}</td>
                      <td>{entry.instructorName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="pagination">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className="page-info">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>

            <div className="results-info">
              Showing {schedule.entries.length} of {schedule.total} sessions
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
