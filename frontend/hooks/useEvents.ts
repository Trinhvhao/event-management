import { useState, useEffect, useCallback } from 'react';
import { eventService } from '@/services/eventService';
import { Event, Category, Department } from '@/types';
import { toast } from 'sonner';

interface EventsResponseShape {
  data?: {
    items?: Event[];
    pagination?: {
      total?: number;
      page?: number;
      pageSize?: number;
      totalPages?: number;
    };
  };
  items?: Event[];
  pagination?: {
    total?: number;
    page?: number;
    pageSize?: number;
    totalPages?: number;
  };
}

const toErrorMessage = (error: unknown, fallback: string): string => {
  const err = error as {
    response?: { data?: { error?: { message?: string } } };
    message?: string;
  };

  return err.response?.data?.error?.message || err.message || fallback;
};

export function useEvents(params?: {
  page?: number;
  limit?: number;
  category?: string;
  department?: string;
  status?: string;
  search?: string;
}) {
  const page = params?.page;
  const limit = params?.limit;
  const category = params?.category;
  const department = params?.department;
  const status = params?.status;
  const search = params?.search;

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  });

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const response = (await eventService.getAll({
        page,
        limit,
        category,
        department,
        status,
        search,
      })) as EventsResponseShape;

      // Support multiple backend response shapes and always normalize to Event[]
      const items =
        response?.data?.items ||
        response?.items ||
        response?.data ||
        [];

      const paging =
        response?.data?.pagination ||
        response?.pagination ||
        {
          total: Array.isArray(items) ? items.length : 0,
          page: page || 1,
          pageSize: limit || 20,
          totalPages: 1,
        };

      setEvents(Array.isArray(items) ? items : []);
      setPagination({
        total: paging.total || 0,
        page: paging.page || 1,
        pageSize: paging.pageSize || limit || 20,
        totalPages: paging.totalPages || 1,
      });
      setError(null);
    } catch (error: unknown) {
      const message = toErrorMessage(error, 'Không thể tải danh sách sự kiện');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, category, department, status, search]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    events,
    loading,
    error,
    pagination,
    refetch: fetchEvents,
  };
}

export function useEvent(id: number) {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvent = useCallback(async () => {
    try {
      setLoading(true);
      const data = await eventService.getById(id);
      setEvent(data);
      setError(null);
    } catch (error: unknown) {
      const message = toErrorMessage(error, 'Không thể tải thông tin sự kiện');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  return {
    event,
    loading,
    error,
    refetch: fetchEvent,
  };
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await eventService.getCategories();
      setCategories(data);
    } catch {
      toast.error('Không thể tải danh sách danh mục');
    } finally {
      setLoading(false);
    }
  };

  return { categories, loading };
}

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const data = await eventService.getDepartments();
      setDepartments(data);
    } catch {
      toast.error('Không thể tải danh sách khoa');
    } finally {
      setLoading(false);
    }
  };

  return { departments, loading };
}
