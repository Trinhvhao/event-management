import axios from '@/lib/axios';
import { ApiResponse, TeamMember } from '@/types';

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
};
