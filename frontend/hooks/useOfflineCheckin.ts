'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type CheckinAction = 'qr_checkin' | 'manual_checkin';

export interface PendingCheckinItem {
    id: string;           // timestamp-based unique key
    action: CheckinAction;
    payload: QrCheckinPayload | ManualCheckinPayload;
    timestamp: number;
    retries: number;
    lastError?: string;
}

export interface QrCheckinPayload {
    qr_code: string;
}

export interface ManualCheckinPayload {
    event_id: number;
    registration_id?: number;
    student_id?: string;
}

export interface SyncResult {
    success: boolean;
    id: string;
    skipped?: boolean;
    error?: string;
}

// ─── IndexedDB helpers ───────────────────────────────────────────────────────

const DB_NAME = 'event-management-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-checkins';

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getAllFromDB(): Promise<PendingCheckinItem[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function addToDB(item: PendingCheckinItem): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(item);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

async function removeFromDB(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

async function updateInDB(item: PendingCheckinItem): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(item);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

// ─── API caller (import lazily to avoid circular deps) ───────────────────────

async function callCheckinAPI(
    action: CheckinAction,
    payload: QrCheckinPayload | ManualCheckinPayload
): Promise<unknown> {
    const { default: axios } = await import('@/lib/axios');

    if (action === 'qr_checkin') {
        const p = payload as QrCheckinPayload;
        const res = await axios.post('/checkin/scan', { qr_code: p.qr_code });
        return res.data;
    } else {
        const p = payload as ManualCheckinPayload;
        const res = await axios.post('/checkin/manual', p);
        return res.data;
    }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

const MAX_RETRIES = 5;

export function useOfflineCheckin() {
    const [isOnline, setIsOnline] = useState(true);
    const [pendingItems, setPendingItems] = useState<PendingCheckinItem[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const syncingRef = useRef(false);

    // ── Online/offline detection ──────────────────────────────────────────
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Initialize with actual connectivity state
        setIsOnline(navigator.onLine);

        const handleOnline = () => {
            setIsOnline(true);
            void processQueue(); // auto-sync when back online
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // ── Load pending items from IndexedDB on mount ─────────────────────────
    const loadPending = useCallback(async () => {
        try {
            const items = await getAllFromDB();
            setPendingItems(items.sort((a, b) => a.timestamp - b.timestamp));
        } catch {
            // IndexedDB unavailable — treat as empty queue
            setPendingItems([]);
        }
    }, []);

    useEffect(() => { void loadPending(); }, [loadPending]);

    // ── Queue a check-in action ────────────────────────────────────────────
    const queueCheckIn = useCallback(async (
        action: CheckinAction,
        payload: QrCheckinPayload | ManualCheckinPayload
    ): Promise<string> => {
        const item: PendingCheckinItem = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            action,
            payload,
            timestamp: Date.now(),
            retries: 0,
        };

        await addToDB(item);
        setPendingItems(prev => [...prev, item]);

        // If online, try to sync immediately
        if (navigator.onLine) {
            void processQueue();
        }

        return item.id;
    }, []);

    // ── Remove an item from queue ──────────────────────────────────────────
    const removeFromQueue = useCallback(async (id: string) => {
        await removeFromDB(id);
        setPendingItems(prev => prev.filter(i => i.id !== id));
    }, []);

    // ── Process the entire queue ───────────────────────────────────────────
    const processQueue = useCallback(async (): Promise<SyncResult[]> => {
        if (syncingRef.current) return [];
        syncingRef.current = true;
        setIsSyncing(true);

        const results: SyncResult[] = [];

        try {
            const items = await getAllFromDB();
            const sorted = items.sort((a, b) => a.timestamp - b.timestamp);

            for (const item of sorted) {
                try {
                    await callCheckinAPI(item.action, item.payload);
                    await removeFromDB(item.id);
                    results.push({ success: true, id: item.id });
                } catch (err: unknown) {
                    const errMsg = extractErrorMessage(err);

                    // Conflict: already checked in — remove from queue silently
                    if (isConflictError(errMsg)) {
                        await removeFromDB(item.id);
                        results.push({ success: true, id: item.id, skipped: true });
                        continue;
                    }

                    // Too many retries — remove to avoid infinite queue
                    if (item.retries >= MAX_RETRIES) {
                        await removeFromDB(item.id);
                        results.push({ success: false, id: item.id, error: `Bỏ qua sau ${MAX_RETRIES} lần thử: ${errMsg}` });
                        continue;
                    }

                    // Update retry info
                    const updated: PendingCheckinItem = {
                        ...item,
                        retries: item.retries + 1,
                        lastError: errMsg,
                    };
                    await updateInDB(updated);
                    results.push({ success: false, id: item.id, error: errMsg });
                }
            }

            // Refresh local state
            await loadPending();
        } finally {
            syncingRef.current = false;
            setIsSyncing(false);
        }

        return results;
    }, [loadPending]);

    // ── Clear entire queue ─────────────────────────────────────────────────
    const clearQueue = useCallback(async () => {
        const db = await openDB();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.clear();
            req.onsuccess = () => {
                setPendingItems([]);
                resolve();
            };
            req.onerror = () => reject(req.error);
        });
    }, []);

    // ── Get a specific item's status ─────────────────────────────────────
    const getPendingItem = useCallback((id: string): PendingCheckinItem | undefined => {
        return pendingItems.find(i => i.id === id);
    }, [pendingItems]);

    return {
        isOnline,
        pendingItems,
        pendingCount: pendingItems.length,
        isSyncing,
        queueCheckIn,
        processQueue,
        clearQueue,
        getPendingItem,
        loadPending,
    };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractErrorMessage(err: unknown): string {
    if (err && typeof err === 'object') {
        const e = err as Record<string, unknown>;
        if (typeof e.message === 'string') return e.message;
        const data = e.data as Record<string, unknown> | undefined;
        if (data) {
            const msg = (data.error as Record<string, unknown>)?.message ?? data.message;
            if (typeof msg === 'string') return msg;
        }
    }
    return 'Lỗi không xác định';
}

function isConflictError(msg: string): boolean {
    const lower = msg.toLowerCase();
    return (
        lower.includes('đã check-in') ||
        lower.includes('already checked') ||
        lower.includes('duplicate') ||
        lower.includes('đã tồn tại') ||
        lower.includes('đã được sử dụng') ||
        lower.includes('qr code') && lower.includes('already')
    );
}
