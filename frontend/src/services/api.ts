import axios from 'axios';
import { 
  Member, 
  Intervention, 
  PopulationMetrics, 
  User, 
  RiskLevel, 
  InterventionStatus, 
  InterventionPriority,
  InterventionCategory
} from '../types';
import { 
  MOCK_MEMBERS, 
  MOCK_INTERVENTIONS, 
  MOCK_USERS 
} from '../mock/mockData';

// Configured Axios instance ready for future backend integration
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 10000,
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

// Synthetic latency simulator helper
const simulateDelay = <T>(data: T, ms: number = 250): Promise<T> => {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
};

// In-memory working state for demo interactions
let dynamicMembers: Member[] = [...MOCK_MEMBERS];
let dynamicInterventions: Intervention[] = [...MOCK_INTERVENTIONS];

export const mockApiService = {
  // Authentication
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

  // Population Analytics - Dynamic metrics calculation from existing mock data
  async getPopulationMetrics(): Promise<PopulationMetrics> {
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

  // Members Retrieval with Filters, Search, and Sorting
  async getMembers(params?: {
    search?: string;
    riskLevel?: RiskLevel | 'All';
    sdohTier?: string;
    condition?: string;
    sortBy?: string;
  }): Promise<Member[]> {
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

    if (params?.riskLevel && params.riskLevel !== 'All') {
      result = result.filter((m) => m.riskSummary.riskLevel === params.riskLevel);
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
          break;
      }
    } else {
      // Default sort by risk score descending
      result.sort((a, b) => b.riskSummary.overallRiskScore - a.riskSummary.overallRiskScore);
    }

    return simulateDelay(result, 250);
  },

  async getMemberById(id: string): Promise<Member | undefined> {
    const member = dynamicMembers.find((m) => m.id === id);
    return simulateDelay(member, 200);
  },

  // Future Backend API Simulation: GET /members/{member_id}/explanation
  async getMemberExplanation(memberId: string): Promise<{
    member_id: string;
    risk_score: number;
    risk_category: RiskLevel;
    risk_drivers: {
      feature: string;
      value: string | number;
      shap_value: number;
      rank: number;
      category?: string;
      description?: string;
    }[];
  } | undefined> {
    const member = dynamicMembers.find((m) => m.id === memberId);
    if (!member) return undefined;

    const drivers = member.shapDrivers.map((d) => ({
      feature: d.feature,
      value: d.value,
      shap_value: d.shapValue,
      rank: d.rank,
      category: d.category,
      description: d.description,
    }));

    return simulateDelay({
      member_id: member.id,
      risk_score: member.riskSummary.overallRiskScore,
      risk_category: member.riskSummary.riskLevel,
      risk_drivers: drivers,
    }, 200);
  },

  // Interventions
  async getInterventions(params?: {
    status?: InterventionStatus | 'All';
    priority?: InterventionPriority | 'All';
    category?: InterventionCategory | 'All';
    memberId?: string;
  }): Promise<Intervention[]> {
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

  async createIntervention(newIntervention: Omit<Intervention, 'id' | 'createdDate'>): Promise<Intervention> {
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

  // CSV Data Ingestion Service (Simulating POST /upload)
  async uploadMemberCsv(
    file: File, 
    options?: { simulateError?: boolean }
  ): Promise<import('../types').UploadCsvResponse> {
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
      await simulateDelay(null, 600);
      throw new Error('Simulated Ingestion Error: Schema validation failed. Column "member_id" or "demographics" was missing or corrupted.');
    }

    // 4. Inspect headers & row count (Metadata extraction only - NO risk calculation or ML preprocessing)
    let headers: string[] = [];
    let lineCount = 0;

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      lineCount = Math.max(0, lines.length - 1); // Exclude header row
      if (lines.length > 0) {
        headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
      }
    } catch {
      lineCount = 150; // Fallback mock estimate if text reading is blocked
      headers = ['member_id', 'age', 'gender', 'systolic_bp', 'hba1c', 'chronic_conditions', 'admissions_l12m'];
    }

    if (headers.length === 0) {
      headers = ['member_id', 'age', 'gender', 'systolic_bp', 'hba1c', 'chronic_conditions'];
    }

    const response: import('../types').UploadCsvResponse = {
      success: true,
      message: 'Member cohort CSV successfully ingested and queued for backend risk scoring.',
      filename: file.name,
      fileSizeBytes: file.size,
      recordsCount: lineCount > 0 ? lineCount : 120,
      uploadedAt: new Date().toISOString(),
      batchId: `BATCH-UC09-${Date.now().toString(36).toUpperCase()}`,
      detectedHeaders: headers.slice(0, 10),
      status: 'Ready for Model Scoring',
      processingNote: 'File buffered in memory. Backend FastAPI ML prediction pipeline will calculate risk indices in Phase 2.',
    };

    return simulateDelay(response, 1000);
  },
};
