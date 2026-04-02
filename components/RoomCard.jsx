import Badge from "./Badge";
import "./RoomCard.css";

/**
 * RoomCard Component
 *
 * Displays a room card with label, building badge, and capacity.
 * Used in the coordinator rooms management page.
 *
 * @component
 * @example
 * <RoomCard room={room} />
 */
export default function RoomCard({ room }) {
  const typeVariant = {
    "lecture_hall":  "info",
    "lab":           "warning",
    "tutorial_room": "success",
  }[room.label?.toLowerCase()] ?? "default";

  return (
    <article className="room-card">
      <div className="room-card__head">
        <span className="room-card__label">{room.label}</span>
        <Badge variant={typeVariant} size="sm">{room.building}</Badge>
      </div>
      <h3>{room.name}</h3>
      <div className="room-card__meta">
        <p>Capacity: <strong>{room.capacity ?? "--"}</strong></p>
        <p>{room.building}</p>
      </div>
    </article>
  );
}
