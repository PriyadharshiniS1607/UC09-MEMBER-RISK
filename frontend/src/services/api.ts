import axios, { AxiosInstance } from 'axios';
import { 
  Member, 
  Intervention, 
  PopulationMetrics, 
  User, 
  MemberExplanation, 
  UploadResponse,
  MemberQueryParams,
  InterventionQueryParams,
  InterventionStatus,
  SHAPDriver
} from '../types';
import { 
  MOCK_MEMBERS, 
  MOCK_INTERVENTIONS, 
  MOCK_USERS 
} from '../mock/mockData';

// Configurable API base URL with fallback to local FastAPI development server
const API_BASE_URL = 
  import.meta.env.VITE_API_BASE_URL || 
  import.meta.env.VITE_API_URL || 
  'http://localhost:8000';

// Configured Axios instance ready for future FastAPI backend integration
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for token attachment
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('care_risk_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Synthetic latency simulator helper for realistic frontend responsiveness simulation
const simulateDelay = <T>(data: T, ms: number = 250): Promise<T> => {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
};

// In-memory working state for dynamic frontend prototype interaction
let dynamicMembers: Member[] = [...MOCK_MEMBERS];
let dynamicInterventions: Intervention[] = [...MOCK_INTERVENTIONS];

// Flag to control mock vs real network execution (defaults to true for prototype / pre-backend phase)
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false';

/**
 * Normalizes SHAP drivers so that shap_value and shapValue are both reliably accessible
 */
export const normalizeShapDrivers = (drivers: SHAPDriver[] = []): SHAPDriver[] => {
  return drivers.map((d) => {
    const val = d.shap_value !== undefined ? d.shap_value : (d.shapValue !== undefined ? d.shapValue : 0);
    return {
      ...d,
      shap_value: val,
      shapValue: val,
    };
  });
};

/**
 * Primary API Service Layer
 * All pages and components consume operations through this service.
 */
export const apiService = {
  // ==========================================
  // 1. GET /risk-summary
  // Population Risk Summary & Cohort Stratification
  // ==========================================
  async getRiskSummary(): Promise<PopulationMetrics> {
    if (!USE_MOCK_API) {
      try {
        const response = await apiClient.get<PopulationMetrics>('/risk-summary');
        return response.data;
      } catch (err) {
        console.warn('Backend GET /risk-summary unavailable, falling back to mock dataset', err);
      }
    }

    const total = dynamicMembers.length;
    const vHigh = dynamicMembers.filter(m => m.riskSummary.riskLevel === 'Very High').length;
    const high = dynamicMembers.filter(m => m.riskSummary.riskLevel === 'High').length;
    const med = dynamicMembers.filter(m => m.riskSummary.riskLevel === 'Medium').length;
    const low = dynamicMembers.filter(m => m.riskSummary.riskLevel === 'Low').length;

    const totalScoreSum = dynamicMembers.reduce((acc, m) => acc + m.riskSummary.overallRiskScore, 0);
    const avgScore = total > 0 ? Math.round((totalScoreSum / total) * 10) / 10 : 0;

    const activeCount = dynamicInterventions.filter(i => i.status === 'In Progress').length;
    const pendingCount = dynamicInterventions.filter(i => i.status === 'Pending').length;
    const completedCount = dynamicInterventions.filter(i => i.status === 'Completed').length;

    const metrics: PopulationMetrics = {
      totalMembers: total,
      veryHighRiskCount: vHigh,
      veryHighRiskPercentage: total > 0 ? Math.round((vHigh / total) * 1000) / 10 : 0,
      highRiskCount: high,
      highRiskPercentage: total > 0 ? Math.round((high / total) * 1000) / 10 : 0,
      mediumRiskCount: med,
      mediumRiskPercentage: total > 0 ? Math.round((med / total) * 1000) / 10 : 0,
      lowRiskCount: low,
      lowRiskPercentage: total > 0 ? Math.round((low / total) * 1000) / 10 : 0,
      activeInterventionsCount: activeCount,
      pendingInterventionsCount: pendingCount,
      completedInterventionsCount: completedCount,
      averageRiskScore: avgScore,
      projectedReadmissionReductionPct: 18.5,
    };

    return simulateDelay(metrics, 200);
  },

  // Alias for backward compatibility
  async getPopulationMetrics(): Promise<PopulationMetrics> {
    return this.getRiskSummary();
  },

  // ==========================================
  // 2. GET /members
  // Population Registry Listing with Filters & Sorting
  // ==========================================
  async getMembers(params?: MemberQueryParams): Promise<Member[]> {
    if (!USE_MOCK_API) {
      try {
        const response = await apiClient.get<Member[]>('/members', { params });
        return response.data;
      } catch (err) {
        console.warn('Backend GET /members unavailable, falling back to mock dataset', err);
      }
    }

    let result = [...dynamicMembers];

    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      result = result.filter(
        (m) =>
          m.firstName.toLowerCase().includes(q) ||
          m.lastName.toLowerCase().includes(q) ||
          m.memberCode.toLowerCase().includes(q) ||
          m.primaryCarePhysician.toLowerCase().includes(q) ||
          m.sdohData.countyName.toLowerCase().includes(q) ||
          m.sdohData.countyFips.includes(q)
      );
    }

    const filterRisk = params?.riskCategory || params?.riskLevel;
    if (filterRisk && filterRisk !== 'All') {
      result = result.filter((m) => m.riskSummary.riskLevel === filterRisk);
    }

    if (params?.sdohTier && params.sdohTier !== 'All') {
      result = result.filter((m) => m.sdohData.sviTier === params.sdohTier);
    }

    if (params?.condition && params.condition !== 'All') {
      result = result.filter((m) =>
        m.chronicConditions.some((c) =>
          c.name.toLowerCase().includes((params.condition || '').toLowerCase())
        )
      );
    }

    if (params?.sortBy) {
      switch (params.sortBy) {
        case 'riskScore_desc':
          result.sort((a, b) => b.riskSummary.overallRiskScore - a.riskSummary.overallRiskScore);
          break;
        case 'riskScore_asc':
          result.sort((a, b) => a.riskSummary.overallRiskScore - b.riskSummary.overallRiskScore);
          break;
        case 'name_asc':
          result.sort((a, b) => a.lastName.localeCompare(b.lastName));
          break;
        case 'healthRisk_desc':
          result.sort((a, b) => b.riskBreakdown.healthRiskScore - a.riskBreakdown.healthRiskScore);
          break;
        case 'utilizationRisk_desc':
          result.sort((a, b) => b.riskBreakdown.utilizationRiskScore - a.riskBreakdown.utilizationRiskScore);
          break;
        case 'sdohRisk_desc':
          result.sort((a, b) => b.riskBreakdown.sdohRiskScore - a.riskBreakdown.sdohRiskScore);
          break;
        default:
          result.sort((a, b) => b.riskSummary.overallRiskScore - a.riskSummary.overallRiskScore);
          break;
      }
    } else {
      result.sort((a, b) => b.riskSummary.overallRiskScore - a.riskSummary.overallRiskScore);
    }

    return simulateDelay(result, 250);
  },

  // ==========================================
  // 3. GET /members/{member_id}
  // Detailed Member Profile
  // ==========================================
  async getMemberById(id: string): Promise<Member | null> {
    if (!USE_MOCK_API) {
      try {
        const response = await apiClient.get<Member>(`/members/${id}`);
        return response.data;
      } catch (err) {
        console.warn(`Backend GET /members/${id} unavailable, falling back to mock dataset`, err);
      }
    }

    const member = dynamicMembers.find((m) => m.id === id || m.memberCode === id);
    if (!member) return simulateDelay(null, 150);

    return simulateDelay(member, 200);
  },

  // ==========================================
  // 4. GET /members/{member_id}/explanation
  // Model SHAP Feature Drivers & Attribution
  // ==========================================
  async getMemberExplanation(memberId: string): Promise<MemberExplanation | null> {
    if (!USE_MOCK_API) {
      try {
        const response = await apiClient.get<MemberExplanation>(`/members/${memberId}/explanation`);
        return response.data;
      } catch (err) {
        console.warn(`Backend GET /members/${memberId}/explanation unavailable, falling back to mock dataset`, err);
      }
    }

    const member = dynamicMembers.find((m) => m.id === memberId || m.memberCode === memberId);
    if (!member) return simulateDelay(null, 150);

    const drivers = normalizeShapDrivers(member.shapDrivers);

    const explanation: MemberExplanation = {
      member_id: member.id,
      risk_score: member.riskSummary.overallRiskScore,
      risk_category: member.riskSummary.riskLevel,
      risk_drivers: drivers,
      summary: `Top risk contributors for ${member.firstName} ${member.lastName} based on clinical conditions, utilization, and SDOH factors.`,
    };

    return simulateDelay(explanation, 200);
  },

  // ==========================================
  // 5. GET /interventions
  // Interventions Listing with Filters
  // ==========================================
  async getInterventions(params?: InterventionQueryParams): Promise<Intervention[]> {
    if (!USE_MOCK_API) {
      try {
        const response = await apiClient.get<Intervention[]>('/interventions', { params });
        return response.data;
      } catch (err) {
        console.warn('Backend GET /interventions unavailable, falling back to mock dataset', err);
      }
    }

    let result = [...dynamicInterventions];

    if (params?.memberId) {
      result = result.filter((i) => i.memberId === params.memberId);
    }

    if (params?.status && params.status !== 'All') {
      result = result.filter((i) => i.status === params.status);
    }

    if (params?.priority && params.priority !== 'All') {
      result = result.filter((i) => i.priority === params.priority);
    }

    if (params?.category && params.category !== 'All') {
      result = result.filter((i) => i.type === params.category);
    }

    return simulateDelay(result, 250);
  },

  // ==========================================
  // 6. POST /upload
  // CSV Dataset Ingestion
  // ==========================================
  async uploadCsv(
    file: File, 
    options?: { simulateError?: boolean }
  ): Promise<UploadResponse> {
    // 1. Validation: Ensure file exists and is not empty
    if (!file || file.size === 0) {
      throw new Error('The selected CSV file is empty (0 bytes). Please select a valid population dataset.');
    }

    // 2. Validation: File extension must be .csv
    if (!file.name.toLowerCase().endsWith('.csv')) {
      throw new Error(`Unsupported file type: "${file.name}". Please upload a standard comma-separated (.csv) file.`);
    }

    // 3. Optional simulated failure for testing failure states
    if (options?.simulateError) {
      await simulateDelay(null, 500);
      throw new Error('Schema validation error: Column "member_id" or demographic feature missing.');
    }

    if (!USE_MOCK_API) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<UploadResponse>('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
      } catch (err: any) {
        console.warn('Backend POST /upload unavailable, falling back to mock dataset response', err);
      }
    }

    // Metadata extraction only (NO frontend ML or risk calculation)
    let headers: string[] = [];
    let lineCount = 0;

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      lineCount = Math.max(0, lines.length - 1);
      if (lines.length > 0) {
        headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
      }
    } catch {
      lineCount = 150;
      headers = ['member_id', 'age', 'gender', 'systolic_bp', 'hba1c', 'chronic_conditions', 'admissions_l12m'];
    }

    if (headers.length === 0) {
      headers = ['member_id', 'age', 'gender', 'systolic_bp', 'hba1c', 'chronic_conditions'];
    }

    const response: UploadResponse = {
      success: true,
      message: 'Member cohort CSV successfully ingested and buffered for backend risk scoring.',
      filename: file.name,
      fileSizeBytes: file.size,
      recordsCount: lineCount > 0 ? lineCount : 120,
      uploadedAt: new Date().toISOString(),
      batchId: `BATCH-UC09-${Date.now().toString(36).toUpperCase()}`,
      detectedHeaders: headers.slice(0, 10),
      status: 'Validated',
      processingNote: 'File buffered in memory. Backend FastAPI ML prediction pipeline will calculate risk indices in Phase 2.',
    };

    return simulateDelay(response, 800);
  },

  // Alias for backward compatibility
  async uploadMemberCsv(file: File, options?: { simulateError?: boolean }): Promise<UploadResponse> {
    return this.uploadCsv(file, options);
  },

  // ==========================================
  // 7. Mutating & Workflow Actions
  // ==========================================
  async createIntervention(newIntervention: Omit<Intervention, 'id' | 'createdDate'>): Promise<Intervention> {
    if (!USE_MOCK_API) {
      try {
        const response = await apiClient.post<Intervention>('/interventions', newIntervention);
        return response.data;
      } catch (err) {
        console.warn('Backend POST /interventions unavailable, updating local mock state', err);
      }
    }

    const created: Intervention = {
      ...newIntervention,
      id: `int-${Date.now()}`,
      createdDate: new Date().toISOString().split('T')[0],
    };
    dynamicInterventions = [created, ...dynamicInterventions];
    
    // Update member active intervention count
    dynamicMembers = dynamicMembers.map(m => {
      if (m.id === created.memberId) {
        return {
          ...m,
          activeInterventionsCount: m.activeInterventionsCount + 1,
        };
      }
      return m;
    });

    return simulateDelay(created, 300);
  },

  async updateInterventionStatus(id: string, status: InterventionStatus): Promise<Intervention | null> {
    if (!USE_MOCK_API) {
      try {
        const response = await apiClient.patch<Intervention>(`/interventions/${id}`, { status });
        return response.data;
      } catch (err) {
        console.warn(`Backend PATCH /interventions/${id} unavailable, updating local mock state`, err);
      }
    }

    let updatedItem: Intervention | null = null;
    dynamicInterventions = dynamicInterventions.map((item) => {
      if (item.id === id) {
        updatedItem = {
          ...item,
          status,
          completedDate: status === 'Completed' ? new Date().toISOString().split('T')[0] : item.completedDate,
        };
        return updatedItem;
      }
      return item;
    });

    return simulateDelay(updatedItem, 200);
  },

  // ==========================================
  // 8. Auth Operations
  // ==========================================
  async login(email: string): Promise<{ user: User; token: string }> {
    const matchedUser = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase()) || MOCK_USERS[0];
    const token = `mock-jwt-token-${matchedUser.id}-${Date.now()}`;
    localStorage.setItem('care_risk_token', token);
    localStorage.setItem('care_risk_user', JSON.stringify(matchedUser));
    return simulateDelay({ user: matchedUser, token }, 350);
  },

  async getCurrentUser(): Promise<User | null> {
    const userStr = localStorage.getItem('care_risk_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  logout(): void {
    localStorage.removeItem('care_risk_token');
    localStorage.removeItem('care_risk_user');
  },
};

// Default export and mockApiService alias for backward compatibility
export const mockApiService = apiService;
export default apiService;
