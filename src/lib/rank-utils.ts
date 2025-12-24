/**
 * Centralized rank logic for the 88XP points system.
 * 
 * Rank rules:
 * - Lower rank number = higher authority (Rank 1 is highest)
 * - Higher ranks can assign projects to same or lower ranks
 * - Higher ranks can override points for lower ranks (only on completed projects)
 * - Admins are separate from the rank system (they manage employees, not points)
 */

/**
 * Check if a user can override points for a project.
 * 
 * @param currentUserRank - The rank of the current user (lower = higher authority)
 * @param assigneeRank - The rank of the project assignee
 * @param projectStatus - The current status of the project
 * @returns true if the user can override points
 */
export function canOverridePoints(
  currentUserRank: number | null,
  assigneeRank: number | null,
  projectStatus: string
): boolean {
  // Must have valid ranks
  if (currentUserRank === null || assigneeRank === null) return false;
  
  // Current user must be higher rank (lower number) than assignee
  if (currentUserRank >= assigneeRank) return false;
  
  // Project must be completed
  if (projectStatus !== 'completed' && projectStatus !== 'approved') return false;
  
  return true;
}

/**
 * Check if a user can assign projects to another user.
 * 
 * @param currentUserRank - The rank of the current user
 * @param targetRank - The rank of the target assignee
 * @param currentUserId - The ID of the current user
 * @param targetId - The ID of the target assignee
 * @returns true if the user can assign to the target
 */
export function canAssignTo(
  currentUserRank: number | null,
  targetRank: number | null,
  currentUserId: string,
  targetId: string
): boolean {
  // Can always assign to self
  if (currentUserId === targetId) return true;
  
  // Must have valid ranks
  if (currentUserRank === null || targetRank === null) return false;
  
  // Can assign to same or lower rank (higher rank number)
  return targetRank >= currentUserRank;
}

/**
 * Check if a user can mark a project as complete.
 * 
 * @param currentUserId - The ID of the current user
 * @param assigneeId - The ID of the project assignee
 * @param projectStatus - The current status of the project
 * @returns true if the user can mark the project complete
 */
export function canMarkComplete(
  currentUserId: string | undefined,
  assigneeId: string,
  projectStatus: string
): boolean {
  // Only the assignee can mark their own project complete
  if (currentUserId !== assigneeId) return false;
  
  // Project must not already be completed or approved
  if (projectStatus === 'completed' || projectStatus === 'approved') return false;
  
  return true;
}

/**
 * Check if a project is in a completed state (completed or approved).
 * 
 * @param status - The project status
 * @returns true if the project is completed
 */
export function isProjectCompleted(status: string): boolean {
  return status === 'completed' || status === 'approved';
}

/**
 * Get human-readable explanation for why override is not available.
 * 
 * @param currentUserRank - The rank of the current user
 * @param assigneeRank - The rank of the project assignee
 * @param projectStatus - The current status of the project
 * @returns Explanation string or null if override is available
 */
export function getOverrideBlockedReason(
  currentUserRank: number | null,
  assigneeRank: number | null,
  projectStatus: string
): string | null {
  if (currentUserRank === null || assigneeRank === null) {
    return 'Rank information unavailable';
  }
  
  if (currentUserRank >= assigneeRank) {
    return `You can only override points for lower-ranked employees (your rank: ${currentUserRank}, their rank: ${assigneeRank})`;
  }
  
  if (projectStatus !== 'completed' && projectStatus !== 'approved') {
    return 'Points can only be overridden after the task is marked complete';
  }
  
  return null;
}

/**
 * Check if a user can delete a project.
 * 
 * Rules:
 * - Creator can always delete their own project
 * - Rank 1 can delete any ongoing project (pending, in_progress) from lower-ranked employees
 * 
 * @param currentUserId - The ID of the current user
 * @param currentUserRank - The rank of the current user
 * @param creatorId - The ID of the project creator
 * @param assigneeRank - The rank of the project assignee
 * @param projectStatus - The current status of the project
 * @returns true if the user can delete the project
 */
export function canDeleteProject(
  currentUserId: string | undefined,
  currentUserRank: number | null,
  creatorId: string,
  assigneeRank: number | null,
  projectStatus: string
): boolean {
  // Creator can always delete their own project
  if (currentUserId === creatorId) return true;
  
  // Rank 1 can delete ongoing projects from lower-ranked employees
  if (currentUserRank === 1) {
    const isOngoing = projectStatus === 'pending' || projectStatus === 'in_progress';
    const isLowerRanked = assigneeRank !== null && assigneeRank > 1;
    return isOngoing && isLowerRanked;
  }
  
  return false;
}

/**
 * Check if a user can edit a task.
 * 
 * Rules:
 * - Admin can always edit
 * - Creator can always edit their own task
 * - Higher-ranked users (lower rank number) can edit tasks created by lower-ranked users (only on completed tasks)
 * - Assigned users CANNOT edit tasks (only the creator can)
 * 
 * @param currentUserRank - The rank of the current user (lower = higher authority)
 * @param currentUserId - The ID of the current user
 * @param creatorRank - The rank of the task creator
 * @param creatorId - The ID of the task creator
 * @param taskStatus - The current status of the task
 * @param isAdmin - Whether the current user is an admin
 * @returns true if the user can edit the task
 */
export function canEditTask(
  currentUserRank: number | null,
  currentUserId: string | undefined,
  creatorRank: number | null,
  creatorId: string,
  taskStatus: string,
  isAdmin: boolean = false
): boolean {
  // Admin can always edit
  if (isAdmin) return true;
  
  // Creator can always edit their own task
  if (currentUserId === creatorId) return true;
  
  // For completed tasks, higher-ranked users (lower rank number) can edit tasks from lower-ranked users
  const isCompleted = taskStatus === 'completed' || taskStatus === 'approved';
  if (isCompleted && currentUserRank !== null && creatorRank !== null) {
    return currentUserRank < creatorRank; // Strictly less than (higher authority)
  }
  
  // Otherwise, cannot edit
  return false;
}

