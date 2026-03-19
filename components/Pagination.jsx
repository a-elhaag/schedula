"use client";

import React from "react";
import "./Pagination.css";

export default function Pagination({
  currentPage = 1,
  totalPages = 5,
  onPageChange,
  disabled = false,
}) {
  const handlePrevious = () => {
    if (currentPage > 1 && !disabled) {
      onPageChange?.(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages && !disabled) {
      onPageChange?.(currentPage + 1);
    }
  };

  const handlePageClick = (page) => {
    if (!disabled) {
      onPageChange?.(page);
    }
  };

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first page
      pages.push(1);

      // Determine middle range
      if (currentPage <= 3) {
        // Show pages 2-4, then ellipsis
        for (let i = 2; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
      } else if (currentPage >= totalPages - 2) {
        // Show ellipsis, then last 3 pages
        pages.push("ellipsis");
        for (let i = totalPages - 2; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Show ellipsis, current-1 to current+1, ellipsis
        pages.push("ellipsis");
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push("ellipsis");
      }

      // Show last page
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pages = getPageNumbers();
  const isPrevDisabled = currentPage === 1 || disabled;
  const isNextDisabled = currentPage === totalPages || disabled;

  return (
    <nav className="pagination" aria-label="Pagination Navigation">
      <button
        className={`pagination-btn pagination-prev ${isPrevDisabled ? "is-disabled" : ""}`}
        onClick={handlePrevious}
        disabled={isPrevDisabled}
        aria-label="Previous page"
      >
        ← Previous
      </button>

      <div className="pagination-pages">
        {pages.map((page, idx) => (
          <React.Fragment key={idx}>
            {page === "ellipsis" ? (
              <span className="pagination-ellipsis" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                className={`pagination-page ${
                  page === currentPage ? "is-active" : ""
                } ${disabled ? "is-disabled" : ""}`}
                onClick={() => handlePageClick(page)}
                disabled={disabled || page === currentPage}
                aria-label={`Page ${page}`}
                aria-current={page === currentPage ? "page" : undefined}
              >
                {page}
              </button>
            )}
          </React.Fragment>
        ))}
      </div>

      <button
        className={`pagination-btn pagination-next ${isNextDisabled ? "is-disabled" : ""}`}
        onClick={handleNext}
        disabled={isNextDisabled}
        aria-label="Next page"
      >
        Next →
      </button>
    </nav>
  );
}
