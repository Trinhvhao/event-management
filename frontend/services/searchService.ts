import axios from '@/lib/axios';
import { ApiResponse } from '@/types';

export interface SearchResult {
    type: 'event' | 'student' | 'user';
    id: number;
    title: string;
    subtitle?: string;
    status?: string;
    role?: string;
}

export const searchService = {
    async globalSearch(query: string): Promise<SearchResult[]> {
        const response = await axios.get<ApiResponse<SearchResult[]>>('/search', {
            params: { q: query },
        });

        return response.data.data || [];
    },
};
