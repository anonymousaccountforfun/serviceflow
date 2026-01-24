// API client for ServiceFlow backend

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta?: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

class ApiClient {
  private organizationId: string | null = null;

  setOrganizationId(id: string) {
    this.organizationId = id;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.organizationId) {
      headers['x-organization-id'] = this.organizationId;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    return response.json();
  }

  // Analytics
  async getAnalyticsOverview(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return this.request<any>('GET', `/api/analytics/overview?${params}`);
  }

  async getAnalyticsCalls(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return this.request<any>('GET', `/api/analytics/calls?${params}`);
  }

  async getAnalyticsRevenue(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return this.request<any>('GET', `/api/analytics/revenue?${params}`);
  }

  // Calendar
  async getCalendarDay(date: string, technicianId?: string) {
    const params = new URLSearchParams();
    if (technicianId) params.set('technicianId', technicianId);
    return this.request<any>('GET', `/api/calendar/day/${date}?${params}`);
  }

  async getCalendarWeek(date: string) {
    return this.request<any>('GET', `/api/calendar/week/${date}`);
  }

  async getCalendarMonth(year: number, month: number) {
    return this.request<any>('GET', `/api/calendar/month/${year}/${month}`);
  }

  async getAvailability(date: string, duration?: number) {
    const params = new URLSearchParams({ date });
    if (duration) params.set('duration', String(duration));
    return this.request<any>('GET', `/api/calendar/availability?${params}`);
  }

  // Appointments
  async getAppointments(params?: { startDate?: string; endDate?: string; status?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.status) searchParams.set('status', params.status);
    return this.request<any[]>('GET', `/api/appointments?${searchParams}`);
  }

  async createAppointment(data: { jobId: string; scheduledAt: string; scheduledEndAt?: string; assignedToId?: string; notes?: string }) {
    return this.request<any>('POST', '/api/appointments', data);
  }

  async rescheduleAppointment(id: string, data: { scheduledAt: string; reason?: string }) {
    return this.request<any>('POST', `/api/appointments/${id}/reschedule`, data);
  }

  // Conversations
  async getConversations(params?: { status?: string; page?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    return this.request<any[]>('GET', `/api/conversations?${searchParams}`);
  }

  async getConversation(id: string) {
    return this.request<any>('GET', `/api/conversations/${id}`);
  }

  async sendMessage(conversationId: string, content: string) {
    return this.request<any>('POST', `/api/conversations/${conversationId}/messages`, { content });
  }

  async updateConversationStatus(id: string, status: string) {
    return this.request<any>('PATCH', `/api/conversations/${id}`, { status });
  }

  // Customers
  async getCustomers(params?: { page?: number; search?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.search) searchParams.set('search', params.search);
    return this.request<any[]>('GET', `/api/customers?${searchParams}`);
  }

  async getCustomer(id: string) {
    return this.request<any>('GET', `/api/customers/${id}`);
  }

  async createCustomer(data: any) {
    return this.request<any>('POST', '/api/customers', data);
  }

  // Jobs
  async getJobs(params?: { status?: string; customerId?: string; page?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.customerId) searchParams.set('customerId', params.customerId);
    if (params?.page) searchParams.set('page', String(params.page));
    return this.request<any[]>('GET', `/api/jobs?${searchParams}`);
  }

  async getJob(id: string) {
    return this.request<any>('GET', `/api/jobs/${id}`);
  }

  async createJob(data: any) {
    return this.request<any>('POST', '/api/jobs', data);
  }

  async updateJob(id: string, data: any) {
    return this.request<any>('PATCH', `/api/jobs/${id}`, data);
  }

  // Reviews
  async getReviews(params?: { platform?: string; page?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.platform) searchParams.set('platform', params.platform);
    if (params?.page) searchParams.set('page', String(params.page));
    return this.request<any[]>('GET', `/api/reviews?${searchParams}`);
  }

  // Google
  async getGoogleStatus() {
    return this.request<any>('GET', '/api/google/status');
  }

  async syncGoogleReviews() {
    return this.request<any>('POST', '/api/google/reviews/sync');
  }
}

export const api = new ApiClient();
