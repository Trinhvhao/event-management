import { useState, useEffect } from 'react';
import { eventService } from '@/services/eventService';
import { Event, Category, Department } from '@/types';
import { toast } from 'sonner';

export function useEvents(params?: {
  page?: number;
  limit?: number;
  category?: string;
  department?: string;
  status?: string;
  search?: string;
}) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  });

  useEffect(() => {
    fetchEvents();
  }, [params]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await eventService.getAll(params);
      setEvents(response.data);
      setPagination(response.pagination);
      setError(null);
    } catch (err: any) {
      const message = err.response?.data?.error?.message || 'Không thể tải danh sách sự kiện';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const data = await eventService.getById(id);
      setEvent(data);
      setError(null);
    } catch (err: any) {
      const message = err.response?.data?.error?.message || 'Không thể tải thông tin sự kiện';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

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
    } catch (error) {
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
    } catch (error) {
      toast.error('Không thể tải danh sách khoa');
    } finally {
      setLoading(false);
    }
  };

  return { departments, loading };
}
