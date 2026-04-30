# FastAPI Course Schema Contract

## New MongoDB `courses` Collection Structure

The `courses` collection now includes three new fields at the course level:

### Course Document Fields

```js
{
  _id: ObjectId,
  institution_id: ObjectId,
  department_id: ObjectId | null,
  code: string,          // e.g. "SET121"
  name: string,          // e.g. "Computer Architecture"
  credit_hours: number,
  num_sections: number,  // Number of parallel groups/sections
  year_levels: [int],    // NEW — array of year levels [1], [2], [3], [4], or combinations [3, 4] for electives
  section_types: [       // NEW — array of session types with durations
    {
      type: "lecture" | "lab" | "tutorial",
      duration_minutes: number
    }
  ],
  created_at: Date,
  updated_at: Date,
  deleted_at: Date | null
}
```

### Example Documents

**Year 1 course with lecture + lab:**
```js
{
  code: "SET121",
  name: "Computer Architecture",
  credit_hours: 3,
  year_levels: [1],
  num_sections: 2,
  section_types: [
    { type: "lecture", duration_minutes: 90 },
    { type: "lab", duration_minutes: 120 }
  ]
}
```

**Elective for years 3 & 4:**
```js
{
  code: "SET350",
  name: "Elective: AI & Machine Learning",
  credit_hours: 3,
  year_levels: [3, 4],
  num_sections: 2,
  section_types: [
    { type: "lecture", duration_minutes: 90 },
    { type: "tutorial", duration_minutes: 90 }
  ]
}
```

---

## Impact on FastAPI

### Current State

The FastAPI `CourseSection` Pydantic model expects individual section documents with fields:
- `section_type: Literal["lecture", "lab", "tutorial"]`
- `year_levels: list[int]`
- `slots_per_week`, `slot_duration_minutes`, `capacity`, `num_groups`, etc.

### Change Required: DB Query Layer Expansion

**The FastAPI database layer MUST expand course documents into multiple `CourseSection` objects.**

For each course in MongoDB:
1. For each entry in `section_types` array → create **one `CourseSection` object per type**
2. Map fields:
   - `section_type` ← `section_types[i].type`
   - `slot_duration_minutes` ← `section_types[i].duration_minutes`
   - `year_levels` ← `course.year_levels` (top-level, applies to all types)
   - `num_groups` ← `course.num_sections`
   - `course_name` ← `course.name`
   - `institution_id`, `department_id` ← from course
   - `_id` ← synthesized as `"{course_id}_{type}"` (e.g., `"abc123_lecture"`)

### Example Expansion

**MongoDB document:**
```js
{
  _id: ObjectId("abc123"),
  code: "SET121",
  name: "Computer Architecture",
  year_levels: [1],
  num_sections: 2,
  section_types: [
    { type: "lecture", duration_minutes: 90 },
    { type: "lab", duration_minutes: 120 }
  ]
}
```

**Expands into two `CourseSection` objects:**
```python
CourseSection(
  id="abc123_lecture",
  course_name="Computer Architecture",
  section_type="lecture",
  slot_duration_minutes=90,
  year_levels=[1],
  num_groups=2,
  ...other fields...
)

CourseSection(
  id="abc123_lab",
  course_name="Computer Architecture",
  section_type="lab",
  slot_duration_minutes=120,
  year_levels=[1],
  num_groups=2,
  ...other fields...
)
```

### No Pydantic Model Changes Needed

The `CourseSection` Pydantic model definition remains unchanged. The expansion and mapping happens in the **database query builder layer** (in `schedula-fastapi/app/database/`), before data is passed to the solver.

---

## Migration Notes

### Old Schema (No Longer Used)

- `sections: array` or `sections: number` ← **no longer present**
- Implicit single-type per course ← **now explicit in `section_types` array**

### Backwards Compatibility

The Next.js API gracefully reads both old (`sections` field) and new (`num_sections` field) during updates, defaulting to `num_sections` if present.

---

## Summary for FastAPI Changes

1. **Location:** `schedula-fastapi/app/database/` course query builder
2. **Task:** Add expansion logic to convert `course` → `list[CourseSection]`
3. **Key mapping:**
   - `section_types` array → one `CourseSection` per type
   - `year_levels` (course-level) → all `CourseSection` objects inherit it
   - `num_sections` → `num_groups` on each `CourseSection`
4. **No change to:** `CourseSection` Pydantic model, solver logic, or schedule generation
