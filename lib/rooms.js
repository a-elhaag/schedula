// lib/rooms.js
export const ROOMS = [
  { code: "A202", wing: "A", type: "LECTURE_HALL" },
  { code: "A207", wing: "A", type: "LECTURE_HALL" },
  { code: "A302", wing: "A", type: "LECTURE_HALL" },
  { code: "A307", wing: "A", type: "LECTURE_HALL" },
  { code: "A308", wing: "A", type: "LECTURE_HALL" },
  { code: "A312", wing: "A", type: "LECTURE_HALL" },
  { code: "E-4",  wing: "E", type: "LECTURE_HALL" },
  { code: "A203", wing: "A", type: "LAB" },
  { code: "A206", wing: "A", type: "LAB" },
  { code: "A303", wing: "A", type: "LAB" },
  { code: "A310", wing: "A", type: "LAB" },
  { code: "A311", wing: "A", type: "LAB" },
  { code: "A313", wing: "A", type: "LAB" },
  { code: "D101", wing: "D", type: "TUTORIAL" },
  { code: "D102", wing: "D", type: "TUTORIAL" },
  { code: "D103", wing: "D", type: "TUTORIAL" },
  { code: "D104", wing: "D", type: "TUTORIAL" },
  { code: "D106", wing: "D", type: "TUTORIAL" },
  { code: "D107", wing: "D", type: "TUTORIAL" },
  { code: "D109", wing: "D", type: "TUTORIAL" },
  { code: "D110", wing: "D", type: "TUTORIAL" },
  { code: "D112", wing: "D", type: "TUTORIAL" },
  { code: "D201", wing: "D", type: "TUTORIAL" },
  { code: "D204", wing: "D", type: "TUTORIAL" },
  { code: "D205", wing: "D", type: "TUTORIAL" },
  { code: "C107", wing: "C", type: "LAB" },
  { code: "C120", wing: "C", type: "LAB" },
  { code: "C205", wing: "C", type: "LAB" },
  { code: "C207", wing: "C", type: "LAB" },
  { code: "E102", wing: "E", type: "LAB" },
  { code: "E103", wing: "E", type: "LAB" },
  { code: "E106", wing: "E", type: "LAB" },
];

export const ROOM_BY_CODE = Object.fromEntries(ROOMS.map(r => [r.code, r]));
export const LECTURE_HALLS  = ROOMS.filter(r => r.type === "LECTURE_HALL");
export const TUTORIAL_ROOMS = ROOMS.filter(r => r.type === "TUTORIAL");
export const LAB_ROOMS      = ROOMS.filter(r => r.type === "LAB");
