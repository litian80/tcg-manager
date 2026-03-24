import { describe, it, expect } from 'vitest'
import { hasPermission, ROLE_PERMISSIONS, type Role, type Permission } from '@/lib/rbac'

describe('ROLE_PERMISSIONS', () => {
  it('admin has all permissions', () => {
    const adminPerms = ROLE_PERMISSIONS.admin
    expect(adminPerms).toContain('tom.upload')
    expect(adminPerms).toContain('judge.view_panel')
    expect(adminPerms).toContain('match.edit_result')
    expect(adminPerms).toContain('user.manage')
    expect(adminPerms).toContain('profile.view_all')
    expect(adminPerms).toContain('tournament.manage')
    expect(adminPerms).toHaveLength(6)
  })

  it('organizer can upload, view judge panel, and edit results', () => {
    const orgPerms = ROLE_PERMISSIONS.organizer
    expect(orgPerms).toContain('tom.upload')
    expect(orgPerms).toContain('judge.view_panel')
    expect(orgPerms).toContain('match.edit_result')
    expect(orgPerms).not.toContain('user.manage')
  })

  it('judge can view panel and edit results', () => {
    const judgePerms = ROLE_PERMISSIONS.judge
    expect(judgePerms).toContain('judge.view_panel')
    expect(judgePerms).toContain('match.edit_result')
    expect(judgePerms).not.toContain('tom.upload')
  })

  it('user has no permissions', () => {
    expect(ROLE_PERMISSIONS.user).toHaveLength(0)
  })
})

describe('hasPermission', () => {
  it('returns true when role has the permission', () => {
    expect(hasPermission('admin', 'user.manage')).toBe(true)
    expect(hasPermission('organizer', 'tom.upload')).toBe(true)
    expect(hasPermission('judge', 'judge.view_panel')).toBe(true)
  })

  it('returns false when role lacks the permission', () => {
    expect(hasPermission('user', 'tom.upload')).toBe(false)
    expect(hasPermission('judge', 'tom.upload')).toBe(false)
    expect(hasPermission('organizer', 'user.manage')).toBe(false)
  })

  it('returns false for null/undefined role', () => {
    expect(hasPermission(null, 'tom.upload')).toBe(false)
    expect(hasPermission(undefined, 'tom.upload')).toBe(false)
  })

  it('handles all permission types correctly for admin', () => {
    const allPerms: Permission[] = [
      'tom.upload',
      'judge.view_panel',
      'match.edit_result',
      'user.manage',
      'profile.view_all',
      'tournament.manage',
    ]
    for (const perm of allPerms) {
      expect(hasPermission('admin', perm)).toBe(true)
    }
  })
})
