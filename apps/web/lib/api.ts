// API client for ServiceFlow backend

import type {
  Customer,
  Job,
  Appointment,
  Conversation,
  Message,
  Review,
  User,
  Organization,
  OrganizationSettings,
  CreateCustomerInput,
  CreateJobInput,
  UpdateJobInput,
  CreateAppointmentInput,
  PhoneNumber,
  PhoneStatus,
  AvailablePhoneNumber,
} from './types';
import type { ApiResponse, ApiError } from '@serviceflow/shared';

// Re-export for convenience
export type { ApiResponse, ApiError };

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface CalendarSlot {
  start: string;
  end: string;
  available: boolean;
}

interface GoogleStatus {
  connected: boolean;
  locationName?: string;
  lastSyncAt?: string;
  email?: string;
  reviewsEnabled?: boolean;
}

interface AnalyticsOverview {
  totalJobs: number;
  completedJobs: number;
  revenue: number;
  newCustomers: number;
  averageRating: number;
  callsReceived: number;
  missedCalls: number;
}

interface DashboardData {
  calls: {
    total: number;
    answered: number;
    missed: number;
  };
  revenue: {
    total: number;
    change: number | null;
  };
  jobs: {
    completed: number;
    change: number | null;
  };
  customers: {
    new: number;
    change: number | null;
  };
  pendingJobs: Array<{
    id: string;
    title: string;
    customer?: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
  todayAppointments: Array<{
    id: string;
    scheduledAt: string;
    job?: {
      id: string;
      title: string;
    };
    customer?: {
      id: string;
      firstName: string;
      lastName: string;
      address?: any;
      city?: string;
    };
  }>;
}

class ApiClient {
  private organizationId: string | null = null;
  private getAuthToken: (() => Promise<string | null>) | null = null;

  setOrganizationId(id: string) {
    this.organizationId = id;
  }

  // Set the auth token getter (called from AuthProvider)
  setAuthTokenGetter(getter: () => Promise<string | null>) {
    this.getAuthToken = getter;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add organization ID if set
    if (this.organizationId) {
      headers['x-organization-id'] = this.organizationId;
    }

    // Add auth token if available
    if (this.getAuthToken) {
      try {
        const token = await this.getAuthToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Failed to get auth token:', error);
      }
    }

    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Parse response body
    const data = await response.json().catch(() => ({}));

    // Handle error responses
    if (!response.ok) {
      // Handle unauthorized responses
      if (response.status === 401) {
        console.error('Unauthorized request to:', path);
      }

      // Extract error message from response
      const errorMessage = data.error?.message || data.message || `Request failed with status ${response.status}`;
      const error = new Error(errorMessage) as Error & { code?: string; status?: number };
      error.code = data.error?.code;
      error.status = response.status;
      throw error;
    }

    return data;
  }

  // Analytics
  async getAnalyticsOverview(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return this.request<AnalyticsOverview>('GET', `/api/analytics/overview?${params}`);
  }

  /**
   * Get combined dashboard data in a single API call
   * Optimizes dashboard page by reducing 3 API calls to 1
   */
  async getDashboardData() {
    return this.request<DashboardData>('GET', '/api/analytics/dashboard');
  }

  async getAnalyticsCalls(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return this.request<{ total: number; answered: number; missed: number; byDay: Array<{ date: string; count: number }> }>('GET', `/api/analytics/calls?${params}`);
  }

  async getAnalyticsRevenue(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return this.request<{ total: number; byMonth: Array<{ month: string; amount: number }> }>('GET', `/api/analytics/revenue?${params}`);
  }

  async getAIROIAnalytics(params?: { startDate?: string; endDate?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    return this.request<any>('GET', `/api/analytics/ai-roi?${searchParams}`);
  }

  // Calendar
  async getCalendarDay(date: string, technicianId?: string) {
    const params = new URLSearchParams();
    if (technicianId) params.set('technicianId', technicianId);
    return this.request<Appointment[]>('GET', `/api/calendar/day/${date}?${params}`);
  }

  async getCalendarWeek(date: string) {
    return this.request<Record<string, Appointment[]>>('GET', `/api/calendar/week/${date}`);
  }

  async getCalendarMonth(year: number, month: number) {
    return this.request<Record<string, Appointment[]>>('GET', `/api/calendar/month/${year}/${month}`);
  }

  async getAvailability(date: string, duration?: number) {
    const params = new URLSearchParams({ date });
    if (duration) params.set('duration', String(duration));
    return this.request<CalendarSlot[]>('GET', `/api/calendar/availability?${params}`);
  }

  // Appointments
  async getAppointments(params?: { startDate?: string; endDate?: string; status?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.status) searchParams.set('status', params.status);
    return this.request<Appointment[]>('GET', `/api/appointments?${searchParams}`);
  }

  async createAppointment(data: CreateAppointmentInput) {
    return this.request<Appointment>('POST', '/api/appointments', data);
  }

  async rescheduleAppointment(id: string, data: { scheduledAt: string; reason?: string }) {
    return this.request<Appointment>('POST', `/api/appointments/${id}/reschedule`, data);
  }

  // Conversations
  async getConversations(params?: { status?: string; page?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    return this.request<Conversation[]>('GET', `/api/conversations?${searchParams}`);
  }

  async getConversation(id: string) {
    return this.request<Conversation>('GET', `/api/conversations/${id}`);
  }

  async sendMessage(conversationId: string, content: string) {
    return this.request<Message>('POST', `/api/conversations/${conversationId}/messages`, { content });
  }

  async updateConversationStatus(id: string, status: string) {
    return this.request<Conversation>('PATCH', `/api/conversations/${id}`, { status });
  }

  // Customers
  async getCustomers(params?: { page?: number; search?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.search) searchParams.set('search', params.search);
    return this.request<Customer[]>('GET', `/api/customers?${searchParams}`);
  }

  async getCustomer(id: string) {
    return this.request<Customer>('GET', `/api/customers/${id}`);
  }

  async createCustomer(data: CreateCustomerInput) {
    return this.request<Customer>('POST', '/api/customers', data);
  }

  // Jobs
  async getJobs(params?: { status?: string; customerId?: string; page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.customerId) searchParams.set('customerId', params.customerId);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    return this.request<Job[]>('GET', `/api/jobs?${searchParams}`);
  }

  async getJob(id: string) {
    return this.request<Job>('GET', `/api/jobs/${id}`);
  }

  async createJob(data: CreateJobInput) {
    return this.request<Job>('POST', '/api/jobs', data);
  }

  async updateJob(id: string, data: UpdateJobInput) {
    return this.request<Job>('PATCH', `/api/jobs/${id}`, data);
  }

  // Calls
  async getCalls(params?: { status?: string; page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    return this.request<any[]>('GET', `/api/calls?${searchParams}`);
  }

  async getCall(id: string) {
    return this.request<any>('GET', `/api/calls/${id}`);
  }

  // Reviews
  async getReviews(params?: { platform?: string; page?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.platform) searchParams.set('platform', params.platform);
    if (params?.page) searchParams.set('page', String(params.page));
    return this.request<Review[]>('GET', `/api/reviews?${searchParams}`);
  }

  async replyToReview(reviewId: string, response: string) {
    return this.request<Review>('POST', `/api/reviews/${reviewId}/reply`, { response });
  }

  // Google
  async getGoogleStatus() {
    return this.request<GoogleStatus>('GET', '/api/google/status');
  }

  async syncGoogleReviews() {
    return this.request<{ synced: number }>('POST', '/api/google/reviews/sync');
  }

  // Phone Numbers
  async getPhoneNumbers() {
    return this.request<PhoneNumber[]>('GET', '/api/phone-numbers');
  }

  async getPhoneStatus() {
    return this.request<PhoneStatus>('GET', '/api/phone-numbers/status');
  }

  async searchPhoneNumbers(areaCode: string) {
    return this.request<AvailablePhoneNumber[]>('GET', `/api/phone-numbers/search?areaCode=${areaCode}`);
  }

  async provisionPhoneNumber(phoneNumber: string, label?: string) {
    return this.request<PhoneNumber>('POST', '/api/phone-numbers/provision', { phoneNumber, label });
  }

  async useExistingPhoneNumber(phoneNumber: string, label?: string) {
    return this.request<PhoneNumber>('POST', '/api/phone-numbers/use-existing', { phoneNumber, label });
  }

  async deletePhoneNumber(id: string) {
    return this.request<{ message: string }>('DELETE', `/api/phone-numbers/${id}`);
  }

  // User & Organization
  async getCurrentUser() {
    return this.request<User>('GET', '/api/users/me');
  }

  async updateCurrentUser(data: { firstName?: string; lastName?: string; phone?: string }) {
    return this.request<User>('PATCH', '/api/users/me', data);
  }

  async updateOrganizationSettings(data: Partial<OrganizationSettings>) {
    return this.request<Organization>('PUT', '/api/organizations/settings', data);
  }
}

export const api = new ApiClient();
