import { create } from 'zustand';
import { organizerService } from '@/services/organizerService';

interface OrganizerMetrics {
    eventsCreated: number;
    totalAttendees: number;
    averageRating: number;
    upcomingEvents: number;
    completedEvents: number;
}

interface Organizer {
    id: string;
    full_name: string;
    email: string;
    department_id: string;
    department?: {
        id: string;
        name: string;
    };
    is_active: boolean;
    metrics?: OrganizerMetrics;
}

interface OrganizerFilters {
    search: string;
    department_id: string;
    status: string;
    eventsCreatedMin: number | null;
    eventsCreatedMax: number | null;
    totalAttendeesMin: number | null;
    totalAttendeesMax: number | null;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

const toErrorMessage = (error: unknown): string => {
    const err = error as {
        response?: { data?: { message?: string; error?: { message?: string } } };
        message?: string;
    };

    return (
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        err.message ||
        'Request failed'
    );
};

interface OrganizerState {
    organizers: Organizer[];
    filters: OrganizerFilters;
    pagination: Pagination;
    loading: boolean;
    error: string | null;

    // Actions
    fetchOrganizers: () => Promise<void>;
    updateFilters: (filters: Partial<OrganizerFilters>) => void;
    grantOrganizerRights: (userId: string) => Promise<void>;
    revokeOrganizerRights: (userId: string) => Promise<void>;
    fetchOrganizerMetrics: (organizerId: string, dateFrom?: string, dateTo?: string) => Promise<OrganizerMetrics>;
    setPage: (page: number) => void;
    setPageSize: (limit: number) => void;
}

export const useOrganizerStore = create<OrganizerState>((set, get) => ({
    organizers: [],
    filters: {
        search: '',
        department_id: '',
        status: '',
        eventsCreatedMin: null,
        eventsCreatedMax: null,
        totalAttendeesMin: null,
        totalAttendeesMax: null,
        sortBy: 'eventsCreated',
        sortOrder: 'desc',
    },
    pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    },
    loading: false,
    error: null,

    fetchOrganizers: async () => {
        set({ loading: true, error: null });
        try {
            const { filters, pagination } = get();
            const data = await organizerService.getOrganizers({
                page: pagination.page,
                limit: pagination.limit,
                search: filters.search || undefined,
                department_id: filters.department_id || undefined,
                status: filters.status || undefined,
                eventsCreatedMin: filters.eventsCreatedMin ?? undefined,
                eventsCreatedMax: filters.eventsCreatedMax ?? undefined,
                totalAttendeesMin: filters.totalAttendeesMin ?? undefined,
                totalAttendeesMax: filters.totalAttendeesMax ?? undefined,
                sortBy: filters.sortBy,
                sortOrder: filters.sortOrder,
            });

            const normalizedOrganizers: Organizer[] = (data.data || []).map((organizer: Organizer) => ({
                ...organizer,
                id: String(organizer.id),
                department_id: organizer.department_id ? String(organizer.department_id) : '',
            }));

            set({
                organizers: normalizedOrganizers,
                pagination: {
                    page: data.pagination.page,
                    limit: data.pagination.limit,
                    total: data.pagination.total,
                    totalPages: data.pagination.totalPages,
                },
                loading: false,
            });
        } catch (error) {
            set({ error: toErrorMessage(error), loading: false });
        }
    },

    updateFilters: (newFilters) => {
        set((state) => ({
            filters: { ...state.filters, ...newFilters },
            pagination: { ...state.pagination, page: 1 },
        }));
        get().fetchOrganizers();
    },

    grantOrganizerRights: async (userId) => {
        set({ loading: true });
        try {
            await organizerService.grantOrganizerRights(userId);

            await get().fetchOrganizers();
            set({ loading: false });
        } catch (error) {
            set({ error: toErrorMessage(error), loading: false });
            throw error;
        }
    },

    revokeOrganizerRights: async (userId) => {
        set({ loading: true });
        try {
            await organizerService.revokeOrganizerRights(userId);

            await get().fetchOrganizers();
            set({ loading: false });
        } catch (error) {
            set({ error: toErrorMessage(error), loading: false });
            throw error;
        }
    },

    fetchOrganizerMetrics: async (organizerId, dateFrom, dateTo) => {
        try {
            return await organizerService.getOrganizerMetrics(organizerId, {
                dateFrom,
                dateTo,
            });
        } catch (error) {
            set({ error: toErrorMessage(error) });
            throw error;
        }
    },

    setPage: (page) => {
        set((state) => ({
            pagination: { ...state.pagination, page },
        }));
        get().fetchOrganizers();
    },

    setPageSize: (limit) => {
        set((state) => ({
            pagination: { ...state.pagination, limit, page: 1 },
        }));
        get().fetchOrganizers();
    },
}));
