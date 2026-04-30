import Badge from "./Badge";
import "./RoomCard.css";

import Button from "./Button";
import { EditIcon, TrashIcon } from "./icons/index";

const TYPE_VARIANT = {
  lecture_hall:  "info",
  tutorial_room: "success",
  lab:           "warning",
};

const LAB_TYPE_LABEL = {
  computer_lab:    "Computer Lab",
  physics_lab:     "Physics Lab",
  chemistry_lab:   "Chemistry Lab",
  metal_workshop:  "Metal Workshop",
};

const ROOM_TYPE_LABEL = {
  lecture_hall:  "Lecture Hall",
  tutorial_room: "Tutorial Room",
  lab:           "Lab",
};

export default function RoomCard({ room, onEdit, onDelete }) {
  const typeVariant = TYPE_VARIANT[room.room_type] ?? "default";

  const typeLabel =
    room.room_type === "lab" && room.lab_type
      ? (LAB_TYPE_LABEL[room.lab_type] ?? "Lab")
      : (ROOM_TYPE_LABEL[room.room_type] ?? room.room_type ?? "—");

  return (
    <article className="room-card">
      <div className="room-card__head">
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span className="room-card__label">{room.label}</span>
          <Badge variant={typeVariant} size="sm">{room.building}</Badge>
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          {onEdit   && <Button variant="ghost" size="sm" icon={<EditIcon  size={14} />} onClick={() => onEdit(room)}      />}
          {onDelete && <Button variant="ghost" size="sm" icon={<TrashIcon size={14} />} onClick={() => onDelete(room.id)} />}
        </div>
      </div>
      <h3>{room.name}</h3>
      <div className="room-card__meta">
        <p>Groups: <strong>{room.groups_capacity ?? "--"}</strong></p>
        <p>{typeLabel}</p>
      </div>
    </article>
  );
}
