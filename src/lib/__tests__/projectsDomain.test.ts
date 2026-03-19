/**
 * Unit Tests: Projects Domain Normalizers
 *
 * Testam os normalizers para garantir compatibilidade e segurança
 */

import {
  normalizeProjectRole,
  normalizeWorkItemStatus,
  normalizeWorkItemPriority,
  normalizeWorkItemType,
  isCanonicalWorkItemStatus,
  isCanonicalPriority,
  isCanonicalProjectRole,
  isCanonicalWorkItemType,
  getPriorityWeight,
  getStatusWeight,
  getProjectRoleWeight,
  comparePriorities,
  compareStatus,
  compareProjectRoles,
  type CanonicalProjectRole,
  type CanonicalWorkItemStatus,
  type CanonicalPriority,
  type CanonicalWorkItemType,
  type AnyProjectMemberRole,
  type AnyWorkItemStatus,
  type AnyWorkItemPriority,
  type AnyWorkItemType,
} from '../projectsDomain';

// =====================
// NORMALIZE PROJECT ROLE
// =====================

describe('normalizeProjectRole', () => {
  it('should normalize "member" to "contributor"', () => {
    const result = normalizeProjectRole('member');
    expect(result).toBe('contributor');
  });

  it('should normalize "editor" to "contributor"', () => {
    const result = normalizeProjectRole('editor');
    expect(result).toBe('contributor');
  });

  it('should keep "owner" as is', () => {
    const result = normalizeProjectRole('owner');
    expect(result).toBe('owner');
  });

  it('should keep "viewer" as is', () => {
    const result = normalizeProjectRole('viewer');
    expect(result).toBe('viewer');
  });

  it('should handle canonical "contributor" as is', () => {
    const result = normalizeProjectRole('contributor');
    expect(result).toBe('contributor');
  });
});

// =====================
// NORMALIZE WORK ITEM STATUS
// =====================

describe('normalizeWorkItemStatus', () => {
  it('should normalize "backlog" to "todo"', () => {
    const result = normalizeWorkItemStatus('backlog');
    expect(result).toBe('todo');
  });

  it('should keep "todo" as is', () => {
    const result = normalizeWorkItemStatus('todo');
    expect(result).toBe('todo');
  });

  it('should normalize "review" to "in_progress"', () => {
    const result = normalizeWorkItemStatus('review');
    expect(result).toBe('in_progress');
  });

  it('should keep "in_progress" as is', () => {
    const result = normalizeWorkItemStatus('in_progress');
    expect(result).toBe('in_progress');
  });

  it('should keep "done" as is', () => {
    const result = normalizeWorkItemStatus('done');
    expect(result).toBe('done');
  });

  it('should keep "blocked" as is', () => {
    const result = normalizeWorkItemStatus('blocked');
    expect(result).toBe('blocked');
  });
});

// =====================
// NORMALIZE WORK ITEM PRIORITY
// =====================

describe('normalizeWorkItemPriority', () => {
  it('should keep "low" as is', () => {
    const result = normalizeWorkItemPriority('low');
    expect(result).toBe('low');
  });

  it('should keep "medium" as is', () => {
    const result = normalizeWorkItemPriority('medium');
    expect(result).toBe('medium');
  });

  it('should keep "high" as is', () => {
    const result = normalizeWorkItemPriority('high');
    expect(result).toBe('high');
  });

  it('should keep "critical" as is', () => {
    const result = normalizeWorkItemPriority('critical');
    expect(result).toBe('critical');
  });
});

// =====================
// NORMALIZE WORK ITEM TYPE
// =====================

describe('normalizeWorkItemType', () => {
  it('should normalize "checklist_item" to "task"', () => {
    const result = normalizeWorkItemType('checklist_item');
    expect(result).toBe('task');
  });

  it('should keep "task" as is', () => {
    const result = normalizeWorkItemType('task');
    expect(result).toBe('task');
  });

  it('should keep "milestone" as is', () => {
    const result = normalizeWorkItemType('milestone');
    expect(result).toBe('milestone');
  });

  it('should keep "deliverable" as is', () => {
    const result = normalizeWorkItemType('deliverable');
    expect(result).toBe('deliverable');
  });

  it('should keep "bug" as is', () => {
    const result = normalizeWorkItemType('bug');
    expect(result).toBe('bug');
  });

  it('should keep "initiative" as is', () => {
    const result = normalizeWorkItemType('initiative');
    expect(result).toBe('initiative');
  });
});

// =====================
// IS CANONICAL CHECKS
// =====================

describe('isCanonicalWorkItemStatus', () => {
  it('should return true for canonical statuses', () => {
    expect(isCanonicalWorkItemStatus('todo')).toBe(true);
    expect(isCanonicalWorkItemStatus('in_progress')).toBe(true);
    expect(isCanonicalWorkItemStatus('blocked')).toBe(true);
    expect(isCanonicalWorkItemStatus('done')).toBe(true);
  });

  it('should return false for legacy statuses', () => {
    expect(isCanonicalWorkItemStatus('backlog')).toBe(false);
    expect(isCanonicalWorkItemStatus('review')).toBe(false);
  });
});

describe('isCanonicalPriority', () => {
  it('should return true for all priorities (already canonical)', () => {
    expect(isCanonicalPriority('low')).toBe(true);
    expect(isCanonicalPriority('medium')).toBe(true);
    expect(isCanonicalPriority('high')).toBe(true);
    expect(isCanonicalPriority('critical')).toBe(true);
  });
});

describe('isCanonicalProjectRole', () => {
  it('should return true for canonical roles', () => {
    expect(isCanonicalProjectRole('owner')).toBe(true);
    expect(isCanonicalProjectRole('contributor')).toBe(true);
    expect(isCanonicalProjectRole('viewer')).toBe(true);
  });

  it('should return false for legacy roles', () => {
    expect(isCanonicalProjectRole('member')).toBe(false);
    expect(isCanonicalProjectRole('editor')).toBe(false);
  });
});

describe('isCanonicalWorkItemType', () => {
  it('should return true for canonical types', () => {
    expect(isCanonicalWorkItemType('task')).toBe(true);
    expect(isCanonicalWorkItemType('milestone')).toBe(true);
    expect(isCanonicalWorkItemType('deliverable')).toBe(true);
    expect(isCanonicalWorkItemType('bug')).toBe(true);
    expect(isCanonicalWorkItemType('initiative')).toBe(true);
  });

  it('should return false for legacy types', () => {
    expect(isCanonicalWorkItemType('checklist_item')).toBe(false);
  });
});

// =====================
// WEIGHT HELPERS
// =====================

describe('getPriorityWeight', () => {
  it('should return correct weights for priorities', () => {
    expect(getPriorityWeight('low')).toBe(1);
    expect(getPriorityWeight('medium')).toBe(2);
    expect(getPriorityWeight('high')).toBe(3);
    expect(getPriorityWeight('critical')).toBe(4);
  });
});

describe('getStatusWeight', () => {
  it('should return correct weights for statuses', () => {
    expect(getStatusWeight('todo')).toBe(1);
    expect(getStatusWeight('in_progress')).toBe(2);
    expect(getStatusWeight('blocked')).toBe(0);
    expect(getStatusWeight('done')).toBe(3);
  });
});

describe('getProjectRoleWeight', () => {
  it('should return correct weights for roles', () => {
    expect(getProjectRoleWeight('viewer')).toBe(1);
    expect(getProjectRoleWeight('contributor')).toBe(2);
    expect(getProjectRoleWeight('owner')).toBe(3);
  });
});

// =====================
// COMPARISON HELPERS
// =====================

describe('comparePriorities', () => {
  it('should sort higher priority first', () => {
    expect(comparePriorities('low', 'high')).toBeGreaterThan(0);
    expect(comparePriorities('high', 'low')).toBeLessThan(0);
    expect(comparePriorities('medium', 'medium')).toBe(0);
  });

  it('should handle legacy values', () => {
    expect(comparePriorities('low', 'critical')).toBeGreaterThan(0);
    expect(comparePriorities('critical', 'low')).toBeLessThan(0);
  });
});

describe('compareStatus', () => {
  it('should sort by stage (blocked first, then todo, in_progress, done)', () => {
    expect(compareStatus('todo', 'in_progress')).toBeGreaterThan(0);
    expect(compareStatus('in_progress', 'done')).toBeGreaterThan(0);
    expect(compareStatus('blocked', 'todo')).toBeGreaterThan(0);
    expect(compareStatus('done', 'in_progress')).toBeLessThan(0);
  });

  it('should handle legacy values', () => {
    expect(compareStatus('backlog', 'in_progress')).toBeGreaterThan(0);
    expect(compareStatus('review', 'done')).toBeGreaterThan(0);
  });
});

describe('compareProjectRoles', () => {
  it('should sort by permission level (owner first, then contributor, then viewer)', () => {
    expect(compareProjectRoles('viewer', 'owner')).toBeGreaterThan(0);
    expect(compareProjectRoles('contributor', 'owner')).toBeGreaterThan(0);
    expect(compareProjectRoles('viewer', 'contributor')).toBeGreaterThan(0);
    expect(compareProjectRoles('owner', 'viewer')).toBeLessThan(0);
  });

  it('should handle legacy values', () => {
    expect(compareProjectRoles('member', 'owner')).toBeGreaterThan(0);
    expect(compareProjectRoles('member', 'viewer')).toBeLessThan(0);
  });
});

// =====================
// DISPLAY HELPERS (verificar que exportam strings)
// =====================

describe('Display helpers', () => {
  it('should return valid strings for status labels', () => {
    const { getWorkItemStatusLabel } = require('../projectsDomain');
    expect(typeof getWorkItemStatusLabel('todo')).toBe('string');
    expect(typeof getWorkItemStatusLabel('in_progress')).toBe('string');
    expect(typeof getWorkItemStatusLabel('done')).toBe('string');
  });

  it('should return valid strings for priority labels', () => {
    const { getPriorityLabel } = require('../projectsDomain');
    expect(typeof getPriorityLabel('low')).toBe('string');
    expect(typeof getPriorityLabel('medium')).toBe('string');
    expect(typeof getPriorityLabel('high')).toBe('string');
  });

  it('should return valid strings for role labels', () => {
    const { getProjectRoleLabel } = require('../projectsDomain');
    expect(typeof getProjectRoleLabel('owner')).toBe('string');
    expect(typeof getProjectRoleLabel('contributor')).toBe('string');
    expect(typeof getProjectRoleLabel('viewer')).toBe('string');
  });

  it('should return valid strings for type labels', () => {
    const { getWorkItemTypeLabel } = require('../projectsDomain');
    expect(typeof getWorkItemTypeLabel('task')).toBe('string');
    expect(typeof getWorkItemTypeLabel('milestone')).toBe('string');
    expect(typeof getWorkItemTypeLabel('bug')).toBe('string');
  });
});
