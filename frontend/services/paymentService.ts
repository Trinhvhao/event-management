import axios from '@/lib/axios';
import { ApiResponse } from '@/types';

export interface PaymentRecord {
    id: number;
    registration_id: number;
    user_id: number;
    event_id: number;
    amount: number;
    currency: string;
    status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'expired' | 'refunded';
    method: string;
    payos_order_id: string | null;
    transaction_id: string | null;
    paid_at: string | null;
    expires_at: string | null;
    created_at: string;
    paymentCode?: string;
    event?: {
        id: number;
        title: string;
        start_time: string;
        location: string;
    };
    user?: {
        id: number;
        full_name: string;
        email: string;
    };
}

export interface CreatePaymentResponse {
    paymentId: number;
    paymentCode: string;
    expiresAt: string;
    bankAccountNumber: string;
    bankName: string;
    amount: number;
    transferNote: string;
    checkoutUrl?: string;
    vietQrUrl?: string;
}

export const paymentService = {
    /**
     * Create a payment order for a registration and get PayOS checkout URL.
     */
    async createPayment(params: {
        event_id: number;
        registration_id: number;
    }): Promise<CreatePaymentResponse> {
        const response = await axios.post<ApiResponse<CreatePaymentResponse>>(
            '/payments/',
            params
        );
        return response.data.data;
    },

    /**
     * Get list of my payments.
     */
    async getMyPayments(limit = 20, offset = 0): Promise<{
        payments: PaymentRecord[];
        total: number;
        limit: number;
        offset: number;
        has_more: boolean;
    }> {
        const response = await axios.get<ApiResponse<{
            payments: PaymentRecord[];
            total: number;
            limit: number;
            offset: number;
            has_more: boolean;
        }>>('/payments/my', {
            params: { limit, offset },
        });
        return response.data.data;
    },

    /**
     * Get single payment detail.
     */
    async getPaymentById(paymentId: number): Promise<PaymentRecord> {
        const response = await axios.get<ApiResponse<PaymentRecord>>(
            `/payments/${paymentId}`
        );
        return response.data.data;
    },

    /**
     * Cancel a pending payment.
     */
    async cancelPayment(paymentId: number): Promise<void> {
        await axios.delete(`/payments/${paymentId}`);
    },

    /**
     * Poll payment status (for waiting screen).
     */
    async pollPaymentStatus(paymentId: number): Promise<{
        status: PaymentRecord['status'];
        checkoutUrl?: string;
    }> {
        const response = await axios.get<ApiResponse<{
            status: PaymentRecord['status'];
            checkoutUrl?: string;
        }>>(`/payments/${paymentId}/status`);
        return response.data.data;
    },
};
