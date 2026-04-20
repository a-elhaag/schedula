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
import Button from "./Button";
import { EditIcon, TrashIcon } from "./icons/index";
export default function RoomCard({ room, onEdit, onDelete }) {
  const typeVariant = {
    "lecture_hall":  "info",
    "lab":           "warning",
    "tutorial_room": "success",
  }[room.label?.toLowerCase()] ?? "default";

  return (
    <article className="room-card">
      <div className="room-card__head">
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span className="room-card__label">{room.label}</span>
          <Badge variant={typeVariant} size="sm">{room.building}</Badge>
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          {onEdit && <Button variant="ghost" size="sm" icon={<EditIcon size={14} />} onClick={() => onEdit(room)} />}
          {onDelete && <Button variant="ghost" size="sm" icon={<TrashIcon size={14} />} onClick={() => onDelete(room.id)} />}
        </div>
      </div>
      <h3>{room.name}</h3>
      <div className="room-card__meta">
        <p>Capacity: <strong>{room.capacity ?? "--"}</strong></p>
        <p>{room.building}</p>
      </div>
    </article>
  );
}
