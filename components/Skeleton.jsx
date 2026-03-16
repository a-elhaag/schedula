import "./Skeleton.css";

/**
 * Skeleton Component
 *
 * Loading placeholder shown while schedule data is being fetched.
 * Matches the layout of the student schedule page.
 *
 * @component
 * @example
 * <Skeleton />
 */
export default function Skeleton() {
  return (
    <div className="skeleton-wrap">
      {/* Hero */}
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--subtitle" />

      {/* Student strip */}
      <div className="skeleton-strip">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton skeleton--strip-item" />
        ))}
      </div>

      {/* Stats row */}
      <div className="skeleton-stats">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton skeleton--stat" />
        ))}
      </div>

      {/* Day tabs */}
      <div className="skeleton-tabs">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="skeleton skeleton--tab" />
        ))}
      </div>

      {/* Session cards */}
      <div className="skeleton-cards">
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton skeleton--card" />
        ))}
      </div>
    </div>
  );
}
