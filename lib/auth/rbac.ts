/**
 * Role-Based Access Control (RBAC) Helper Functions
 * 
 * Centralized utility functions for checking user roles and permissions.
 * This provides type-safe role checking across the application.
 */

import { createClient } from "@/lib/supabase/client"

// Type definitions for roles - updated to include all 6 roles
export type UserRole = 'admin' | 'monev' | 'viewer' | 'program_planner' | 'program_implementer' | 'carbon_specialist'

export interface UserProfile {
  id: string
  role: UserRole
  full_name: string | null
  created_at: string
  updated_at: string
}

/**
 * Get user role from profiles table
 * @param userId - User ID (optional, defaults to current authenticated user)
 * @returns User role or null if not found
 */
export async function getUserRole(userId?: string): Promise<UserRole | null> {
  try {
    const supabase = createClient()
    
    // Get current user if userId not provided
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      userId = user.id
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single()

    if (error || !profile) {
      console.warn("Failed to fetch user role:", error)
      return null
    }

    return profile.role as UserRole
  } catch (error) {
    console.error("Error in getUserRole:", error)
    return null
  }
}

/**
 * Get full user profile
 * @param userId - User ID (optional, defaults to current authenticated user)
 * @returns User profile or null if not found
 */
export async function getUserProfile(userId?: string): Promise<UserProfile | null> {
  try {
    const supabase = createClient()
    
    // Get current user if userId not provided
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      userId = user.id
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()

    if (error || !profile) {
      console.warn("Failed to fetch user profile:", error)
      return null
    }

    return profile as UserProfile
  } catch (error) {
    console.error("Error in getUserProfile:", error)
    return null
  }
}

/**
 * Check if user has one of the required roles
 * @param requiredRoles - Array of roles that are allowed
 * @param userId - User ID (optional, defaults to current authenticated user)
 * @returns true if user has one of the required roles, false otherwise
 */
export async function checkUserRole(
  requiredRoles: UserRole[],
  userId?: string
): Promise<boolean> {
  const userRole = await getUserRole(userId)
  if (!userRole) return false
  
  return requiredRoles.includes(userRole)
}

/**
 * Check if user can edit data (admin or monev)
 * @param userId - User ID (optional, defaults to current authenticated user)
 * @returns true if user is admin or monev
 */
export async function canEdit(userId?: string): Promise<boolean> {
  return checkUserRole(['admin', 'monev'], userId)
}

/**
 * Check if user is admin
 * @param userId - User ID (optional, defaults to current authenticated user)
 * @returns true if user is admin
 */
export async function isAdmin(userId?: string): Promise<boolean> {
  return checkUserRole(['admin'], userId)
}

/**
 * Check if user can delete data (admin only)
 * @param userId - User ID (optional, defaults to current authenticated user)
 * @returns true if user is admin
 */
export async function canDelete(userId?: string): Promise<boolean> {
  return isAdmin(userId)
}

/**
 * Extended permission checks for new roles
 */

/**
 * Check if user can manage carbon projects (admin or carbon specialist)
 * @param userId - User ID (optional, defaults to current authenticated user)
 * @returns true if user can manage carbon projects
 */
export async function canManageCarbonProjects(userId?: string): Promise<boolean> {
  return checkUserRole(['admin', 'carbon_specialist'], userId)
}

/**
 * Check if user can manage programs (admin or program planner)
 * @param userId - User ID (optional, defaults to current authenticated user)
 * @returns true if user can manage programs
 */
export async function canManagePrograms(userId?: string): Promise<boolean> {
  return checkUserRole(['admin', 'program_planner'], userId)
}

/**
 * Check if user can manage DRAM (admin or program planner)
 * @param userId - User ID (optional, defaults to current authenticated user)
 * @returns true if user can manage DRAM
 */
export async function canManageDRAM(userId?: string): Promise<boolean> {
  return checkUserRole(['admin', 'program_planner'], userId)
}

/**
 * Check if user can implement programs (admin or program implementer)
 * @param userId - User ID (optional, defaults to current authenticated user)
 * @returns true if user can implement programs
 */
export async function canImplementPrograms(userId?: string): Promise<boolean> {
  return checkUserRole(['admin', 'program_implementer'], userId)
}

/**
 * Check if user can do monitoring & evaluation (admin or monev)
 * @param userId - User ID (optional, defaults to current authenticated user)
 * @returns true if user can do M&E
 */
export async function canDoMonitoring(userId?: string): Promise<boolean> {
  return checkUserRole(['admin', 'monev'], userId)
}

/**
 * Check if user can generate PDD (admin or carbon specialist)
 * @param userId - User ID (optional, defaults to current authenticated user)
 * @returns true if user can generate PDD
 */
export async function canGeneratePDD(userId?: string): Promise<boolean> {
  return checkUserRole(['admin', 'carbon_specialist'], userId)
}

/**
 * Check if user can manage legal documents (admin or carbon specialist)
 * @param userId - User ID (optional, defaults to current authenticated user)
 * @returns true if user can manage legal documents
 */
export async function canManageLegal(userId?: string): Promise<boolean> {
  return checkUserRole(['admin', 'carbon_specialist'], userId)
}

/**
 * Check if user can manage stakeholders (admin or carbon specialist or program planner)
 * @param userId - User ID (optional, defaults to current authenticated user)
 * @returns true if user can manage stakeholders
 */
export async function canManageStakeholders(userId?: string): Promise<boolean> {
  return checkUserRole(['admin', 'carbon_specialist', 'program_planner'], userId)
}

/**
 * Check if user can manage economic empowerment (admin or program planner)
 * @param userId - User ID (optional, defaults to current authenticated user)
 * @returns true if user can manage economic empowerment
 */
export async function canManageEconomicEmpowerment(userId?: string): Promise<boolean> {
  return checkUserRole(['admin', 'program_planner'], userId)
}

/**
 * Permission definitions for different actions - UPDATED FOR ALL ROLES
 */
export const Permissions = {
  // Basic permissions
  READ: ['admin', 'monev', 'viewer', 'program_planner', 'program_implementer', 'carbon_specialist'] as UserRole[],
  EDIT: ['admin', 'monev', 'program_planner', 'program_implementer', 'carbon_specialist'] as UserRole[],
  DELETE: ['admin'] as UserRole[],
  MANAGE_USERS: ['admin'] as UserRole[],
  
  // Module-specific permissions
  CARBON_PROJECTS: ['admin', 'carbon_specialist'] as UserRole[],
  PROGRAM_MANAGEMENT: ['admin', 'program_planner', 'carbon_specialist'] as UserRole[],
  DRAM_MANAGEMENT: ['admin', 'program_planner'] as UserRole[],
  IMPLEMENTATION: ['admin', 'program_implementer', 'program_planner'] as UserRole[],
  MONITORING_EVALUATION: ['admin', 'monev', 'program_planner', 'carbon_specialist'] as UserRole[],
  ECONOMIC_EMPOWERMENT: ['admin', 'program_planner', 'program_implementer'] as UserRole[],
  STAKEHOLDER_MANAGEMENT: ['admin', 'carbon_specialist', 'program_planner'] as UserRole[],
  LEGAL_MANAGEMENT: ['admin', 'carbon_specialist'] as UserRole[],
  PDD_GENERATION: ['admin', 'carbon_specialist'] as UserRole[],
  
  // Data access permissions
  PS_DATA_ACCESS: ['admin', 'monev', 'viewer', 'program_planner', 'program_implementer', 'carbon_specialist'] as UserRole[],
  POTENSI_DATA_ACCESS: ['admin', 'monev', 'viewer', 'program_planner', 'program_implementer', 'carbon_specialist'] as UserRole[],
  KABUPATEN_DATA_ACCESS: ['admin', 'monev', 'viewer', 'program_planner', 'program_implementer', 'carbon_specialist'] as UserRole[],
  STATISTICS_ACCESS: ['admin', 'monev', 'viewer', 'program_planner', 'program_implementer', 'carbon_specialist'] as UserRole[],
  UPLOAD_EXCEL: ['admin', 'monev'] as UserRole[],
} as const

/**
 * Check if user has a specific permission
 * @param permission - Permission level (READ, EDIT, DELETE, etc.)
 * @param userId - User ID (optional, defaults to current authenticated user)
 * @returns true if user has the required permission
 */
export async function hasPermission(
  permission: keyof typeof Permissions,
  userId?: string
): Promise<boolean> {
  const requiredRoles = Permissions[permission]
  return checkUserRole(requiredRoles, userId)
}

/**
 * Get user's permissions as an object
 * @param userId - User ID (optional, defaults to current authenticated user)
 * @returns Object with all permissions for the user
 */
export async function getUserPermissions(userId?: string): Promise<Record<string, boolean>> {
  const userRole = await getUserRole(userId)
  if (!userRole) return {}
  
  const permissions: Record<string, boolean> = {}
  for (const [key, roles] of Object.entries(Permissions)) {
    permissions[key] = roles.includes(userRole)
  }
  
  return permissions
}