// lib/solver/subgroups.js

/**
 * Derive subgroup name list from group_id and subgroup_count.
 * group_id="G1", count=3  → ["G1-1","G1-2","G1-3"]
 * group_id="GA", count=12 → ["GA-1","GA-2",...,"GA-12"]
 * count=0 → [] (no subgroups — group is treated as its own unit, e.g. L4)
 */
export function deriveSubgroups(groupId, subgroupCount) {
  if (subgroupCount === 0) return [];
  return Array.from({ length: subgroupCount }, (_, i) => `${groupId}-${i + 1}`);
}

/**
 * Build a full level map from the levels_config data array.
 * Returns: Map<level (int), { label, groups: [{ group_id, subgroups: string[] }] }>
 */
export function buildLevelMap(levelsConfig) {
  const map = new Map();
  for (const lv of levelsConfig) {
    map.set(lv.level, {
      label:  lv.label,
      groups: lv.groups.map(g => ({
        group_id:  g.group_id,
        subgroups: deriveSubgroups(g.group_id, g.subgroup_count),
      })),
    });
  }
  return map;
}

/**
 * Get all subgroup units for a level entry (flat array).
 * Returns: [{ group_id, subgroup }]
 * If a group has no subgroups (subgroup_count=0), returns { group_id, subgroup: null }
 * so the group itself is treated as the scheduling unit.
 */
export function allSubgroupsForLevel(levelEntry) {
  const result = [];
  for (const g of levelEntry.groups) {
    if (g.subgroups.length === 0) {
      result.push({ group_id: g.group_id, subgroup: null });
    } else {
      for (const sg of g.subgroups) {
        result.push({ group_id: g.group_id, subgroup: sg });
      }
    }
  }
  return result;
}
