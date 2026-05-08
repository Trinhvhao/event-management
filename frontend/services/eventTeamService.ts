import axios from '@/lib/axios';
import { ApiResponse, TeamMember } from '@/types';

export interface EventTeamActivity {
  id: number;
  event_id: number;
  actor_id: number;
  action_type: string;
  target_user_id: number | null;
  metadata: Record<string, any> | null;
  created_at: string;
  actor: { id: number; full_name: string; email: string };
  target: { id: number; full_name: string; email: string } | null;
}

export interface PermissionMatrix {
  defaults: {
    main_organizer: string[];
    helper: string[];
  };
  overrides: Array<{
    id: number;
    event_id: number;
    role: string;
    permission: string;
    allowed: boolean;
  }>;
  matrix: Record<string, Record<string, boolean>>;
}

export const eventTeamService = {
  /**
   * Get team members for an event
   */
  async getTeam(eventId: number): Promise<TeamMember[]> {
    const response = await axios.get<ApiResponse<TeamMember[]>>(
      `/events/${eventId}/team`
    );
    return response.data.data;
  },

  /**
   * Add a team member to an event
   */
  async addTeamMember(
    eventId: number,
    userId: number,
    role: 'main_organizer' | 'helper'
  ): Promise<TeamMember> {
    const response = await axios.post<ApiResponse<TeamMember>>(
      `/events/${eventId}/team`,
      { userId, role }
    );
    return response.data.data;
  },

  /**
   * Remove a team member from an event
   */
  async removeTeamMember(eventId: number, userId: number): Promise<void> {
    await axios.delete(`/events/${eventId}/team/${userId}`);
  },

  /**
   * Update team member role
   */
  async updateTeamMemberRole(
    eventId: number,
    userId: number,
    role: 'main_organizer' | 'helper'
  ): Promise<TeamMember> {
    const response = await axios.put<ApiResponse<TeamMember>>(
      `/events/${eventId}/team/${userId}`,
      { role }
    );
    return response.data.data;
  },

  /**
   * Search available users to add to event team
   */
  async searchAvailableUsers(
    eventId: number,
    query: string,
    limit: number = 10
  ): Promise<Array<{
    id: number;
    full_name: string;
    email: string;
    student_id: string | null;
    role: string;
    department: {
      id: number;
      name: string;
      code: string;
    } | null;
  }>> {
    const response = await axios.get<ApiResponse<any[]>>(
      `/events/${eventId}/team/search`,
      {
        params: { q: query, limit },
      }
    );
    return response.data.data;
  },

  /**
   * Transfer main organizer to another team member
   */
  async transferMainOrganizer(
    eventId: number,
    userId: number,
    role: 'main_organizer' | 'helper' = 'main_organizer'
  ): Promise<{ event: any; newOrganizer: any }> {
    const response = await axios.post<ApiResponse<{ event: any; newOrganizer: any }>>(
      `/events/${eventId}/team/transfer`,
      { userId, role }
    );
    return response.data.data;
  },

  /**
   * Get permission matrix for an event
   */
  async getPermissionMatrix(eventId: number): Promise<PermissionMatrix> {
    const response = await axios.get<ApiResponse<PermissionMatrix>>(
      `/events/${eventId}/permissions`
    );
    return response.data.data;
  },

  /**
   * Update a permission override for a role
   */
  async updatePermission(
    eventId: number,
    role: 'main_organizer' | 'helper',
    permission: string,
    allowed: boolean
  ): Promise<PermissionMatrix> {
    const response = await axios.put<ApiResponse<PermissionMatrix>>(
      `/events/${eventId}/permissions`,
      { role, permission, allowed }
    );
    return response.data.data;
  },

  /**
   * Get activity log for an event
   */
  async getActivityLog(
    eventId: number,
    options: { page?: number; limit?: number; actionType?: string } = {}
  ): Promise<{
    data: EventTeamActivity[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const response = await axios.get<
      ApiResponse<{
        data: EventTeamActivity[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>
    >(`/events/${eventId}/activities`, {
      params: options,
    });
    return response.data.data;
  },
};
