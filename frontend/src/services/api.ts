import axios from 'axios';
import { 
  Member, 
  BackendMember,
  Intervention, 
  PopulationMetrics, 
  User, 
  RiskLevel, 
  InterventionStatus, 
  InterventionPriority, 
  InterventionCategory,
  PredictionResponse,
  UploadCsvResponse,
  ShapDriver,
  RagRecommendationResponse
} from '../types';

// API Base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// Configured Axios instance for FastAPI backend
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 minutes for ML ensemble scoring & SHAP TreeExplainer
  headers: {
    'Accept': 'application/json',
  },
});

// Request interceptor: attach Authorization Bearer token cleanly
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('care_risk_token');
  if (token) {
    const cleanToken = token.startsWith('Bearer ') ? token.replace(/^Bearer\s+/i, '') : token;
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${cleanToken.trim()}`;
  }
  return config;
});

// Response interceptor: handle 401 token expiration cleanly
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('care_risk_token');
      localStorage.removeItem('care_risk_user');
    }
    return Promise.reject(error);
  }
);

// Format backend role code into human-friendly label
export const formatRoleName = (role?: string): string => {
  switch (role?.toLowerCase()) {
    case 'payer_admin':
      return 'Payer Administrator';
    case 'clinical_analyst':
      return 'Clinical Analyst';
    case 'care_manager':
      return 'Care Manager';
    case 'payer_viewer':
      return 'Payer Viewer';
    default:
      return role || 'Clinical User';
  }
};

// Normalize risk category from backend (e.g. "VERY HIGH" -> "Very High")
export const normalizeRiskLevel = (cat?: string): RiskLevel => {
  const upper = (cat || '').toUpperCase().trim();
  if (upper === 'VERY HIGH' || upper === 'VERY_HIGH') return 'Very High';
  if (upper === 'HIGH') return 'High';
  if (upper === 'MEDIUM' || upper === 'MODERATE') return 'Medium';
  return 'Low';
};

// Categorize SHAP feature name into domain group
export const categorizeShapFeature = (feat: string): 'Health' | 'Utilization' | 'SDOH' => {
  const f = feat.toLowerCase();
  if (f.startsWith('ep_') || f.startsWith('rpl_') || f.includes('fips') || f.includes('access') || f.includes('pct') || f.includes('svi') || f.includes('adjprev')) {
    return 'SDOH';
  }
  if (f.includes('encounter') || f.includes('ed_') || f.includes('hospital') || f.includes('medication') || f.includes('admission') || f.includes('preventive')) {
    return 'Utilization';
  }
  return 'Health';
};

// Convert a backend PostgreSQL member record into frontend Member view model
export const transformBackendMember = (bm: BackendMember): Member => {
  const riskLevel = normalizeRiskLevel(bm.risk_category);
  const score = typeof bm.risk_score === 'number' ? Math.round(bm.risk_score * 10) / 10 : 0.0;

  // Transform SHAP drivers
  const shapDrivers: ShapDriver[] = (bm.top_risk_drivers || []).map((d, idx) => {
    const sVal = typeof d.shap_value === 'number' ? d.shap_value : 0.0;
    const cat = categorizeShapFeature(d.feature);
    const dir = d.direction || (sVal > 0 ? 'increases_risk' : sVal < 0 ? 'decreases_risk' : 'neutral');
    const dirLabel = dir === 'increases_risk' ? 'Increases risk' : dir === 'decreases_risk' ? 'Decreases risk' : 'Neutral impact';

    return {
      rank: idx + 1,
      feature: d.feature,
      value: String(d.value ?? 'N/A'),
      shapValue: Math.round(sVal * 100) / 100,
      impact: d.impact ?? Math.abs(sVal),
      direction: dir,
      category: cat,
      description: d.description || `${d.feature} impact on ensemble risk: ${dirLabel} (${sVal > 0 ? '+' : ''}${sVal.toFixed(2)})`,
    };
  });

  // Calculate domain component scores from real data
  const healthChronicCount = bm.chronic_condition_count ?? 0;
  const healthComponent = Math.min(100, Math.max(10, Math.round(healthChronicCount * 18 + (bm.copd ? 15 : 0) + (bm.heart_disease ? 15 : 0) + (bm.diabetes ? 12 : 0) + (bm.cancer ? 15 : 0))));
  
  const edV = bm.ed_visits ?? 0;
  const hospV = bm.hospitalizations ?? 0;
  const medV = bm.medication_count ?? 0;
  const utilComponent = Math.min(100, Math.max(5, Math.round(hospV * 25 + edV * 18 + medV * 4 + (bm.preventive_care_gap ?? 0) * 10)));
  
  const rplThemes = bm.rpl_themes ?? 0.5;
  const sdohComponent = Math.min(100, Math.max(10, Math.round(rplThemes * 70 + (bm.ep_uninsur ?? 5) * 1.5 + (bm.ep_pov150 ?? 10) * 0.8)));

  // Chronic conditions list from real binary flags
  const chronicList = [];
  if (bm.diabetes) chronicList.push({ name: 'Type 2 Diabetes', severity: riskLevel === 'Very High' ? 'Severe' as const : 'Moderate' as const, icd10Code: 'E11.9' });
  if (bm.hypertension) chronicList.push({ name: 'Essential Hypertension', severity: 'Moderate' as const, icd10Code: 'I10' });
  if (bm.heart_disease) chronicList.push({ name: 'Coronary Heart Disease', severity: 'Severe' as const, icd10Code: 'I25.1' });
  if (bm.copd) chronicList.push({ name: 'COPD / Chronic Lower Respiratory', severity: 'Severe' as const, icd10Code: 'J44.9' });
  if (bm.obesity) chronicList.push({ name: 'Clinical Obesity', severity: 'Moderate' as const, icd10Code: 'E66.9' });
  if (bm.cancer) chronicList.push({ name: 'Malignant Neoplasm (Cancer History)', severity: 'Severe' as const, icd10Code: 'C80.1' });

  // Recommended intervention derived from top SHAP driver
  const topShap = shapDrivers[0];
  const recInterventions = [
    {
      id: `rec-${bm.member_id}-1`,
      title: topShap ? `Protocol for High ${topShap.feature.toUpperCase()}` : 'Proactive Clinical Care Coordination',
      category: (topShap?.category === 'SDOH' ? 'Transportation / SDOH' : topShap?.category === 'Utilization' ? 'Clinical' : 'Preventive Care') as InterventionCategory,
      priority: (riskLevel === 'Very High' ? 'Urgent' : riskLevel === 'High' ? 'High' : 'Medium') as InterventionPriority,
      reason: topShap ? `Driven by ${topShap.feature} (SHAP impact: ${topShap.shapValue > 0 ? '+' : ''}${topShap.shapValue.toFixed(2)})` : 'High composite risk score assessment',
    },
  ];

  return {
    id: bm.member_id,
    memberCode: bm.member_id,
    age: bm.age ?? 0,
    gender: bm.gender || 'Unknown',
    stateFips: bm.state_fips || 'N/A',
    countyFips: bm.county_fips || 'N/A',
    chronicConditions: chronicList,
    vitals: {
      diabetes: Boolean(bm.diabetes),
      hypertension: Boolean(bm.hypertension),
      heartDisease: Boolean(bm.heart_disease),
      copd: Boolean(bm.copd),
      obesity: Boolean(bm.obesity),
      cancer: Boolean(bm.cancer),
      chronicConditionCount: bm.chronic_condition_count ?? chronicList.length,
    },
    riskSummary: {
      overallRiskScore: score,
      riskLevel,
      hospitalAdmissionRiskPct: Math.min(100, Math.round(score * 0.85)),
      edVisitRiskPct: Math.min(100, Math.round(score * 0.75)),
      medicationAdherenceRiskPct: Math.min(100, Math.round(score * 0.65)),
      lastAssessedDate: bm.prediction_date ? bm.prediction_date.split('T')[0] : (bm.created_at ? bm.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
      trendDirection: riskLevel === 'Very High' ? 'up' : 'stable',
      topDrivers: shapDrivers.map((d, i) => ({
        id: `drv-${i}`,
        factor: d.feature,
        category: d.category === 'Health' ? 'Clinical' : d.category === 'Utilization' ? 'Utilization' : 'SDOH',
        impactWeight: Math.abs(d.shapValue),
        description: d.description,
        trend: d.shapValue > 0 ? 'increasing' : 'stable',
      })),
    },
    riskBreakdown: {
      healthRiskScore: healthComponent,
      utilizationRiskScore: utilComponent,
      sdohRiskScore: sdohComponent,
      combinedRiskScore: score,
    },
    sdohData: {
      countyFips: bm.county_fips || 'N/A',
      countyName: `County FIPS ${bm.county_fips || 'N/A'}`,
      state: bm.state_fips || 'N/A',
      sviScore: bm.rpl_themes ?? 0.5,
      sviTier: (bm.rpl_themes ?? 0) >= 0.75 ? 'Very High' : (bm.rpl_themes ?? 0) >= 0.5 ? 'High' : 'Moderate',
      transportationAccessScore: bm.ep_noveh ? Math.max(0, Math.round(100 - bm.ep_noveh * 4)) : 75,
      transportationNotes: bm.ep_noveh ? `${bm.ep_noveh}% households without vehicles in county.` : 'County transportation index available.',
      healthcareAccessScore: bm.ep_uninsur ? Math.max(0, Math.round(100 - bm.ep_uninsur * 3)) : 70,
      healthcareAccessNotes: bm.ep_uninsur ? `${bm.ep_uninsur}% uninsured rate in county.` : 'County healthcare access metrics.',
      foodAccessScore: bm.low_food_access_pct ? Math.max(0, Math.round(100 - bm.low_food_access_pct)) : 65,
      foodAccessNotes: bm.low_food_access_pct ? `${bm.low_food_access_pct}% low food access rate.` : 'USDA Food Access Research Atlas index.',
    },
    utilizationData: {
      totalEncounters: bm.total_encounters ?? 0,
      hospitalizationsLast12m: bm.hospitalizations ?? 0,
      erVisitsLast12m: bm.ed_visits ?? 0,
      medicationCount: bm.medication_count ?? 0,
      preventiveCareGap: bm.preventive_care_gap ?? 0,
    },
    shapDrivers,
    recommendedInterventions: recInterventions,
    activeInterventionsCount: riskLevel === 'Very High' ? 2 : riskLevel === 'High' ? 1 : 0,
    assignedCareManager: 'Care Coordination Team',
    rawBackendData: bm,
  };
};

export const apiService = {
  // ============================================================
  // AUTHENTICATION APIs
  // ============================================================

  async login(credentials: { username: string; password: string }): Promise<{ user: User; token: string }> {
    // 1. Clear previous session
    localStorage.removeItem('care_risk_token');
    localStorage.removeItem('care_risk_user');

    // 2. Authenticate
    const response = await apiClient.post('/auth/login', credentials);
    const data = response.data;
    const token = data.access_token;

    // 3. Immediately store fresh JWT
    localStorage.setItem('care_risk_token', token);

    // 4. Resolve authoritative role and user identity via GET /auth/me
    const meResponse = await apiClient.get('/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const backendUser = meResponse.data;

    const user: User = {
      id: backendUser.id,
      username: backendUser.username,
      name: backendUser.username.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      email: backendUser.email,
      role: backendUser.role,
      is_active: backendUser.is_active,
      hospitalAffiliation: 'Payer Population Health Operations',
    };

    localStorage.setItem('care_risk_user', JSON.stringify(user));
    return { user, token };
  },

  async getCurrentUser(): Promise<User | null> {
    const token = localStorage.getItem('care_risk_token');
    if (!token) return null;

    try {
      const response = await apiClient.get('/auth/me');
      const backendUser = response.data;
      const user: User = {
        id: backendUser.id,
        username: backendUser.username,
        name: backendUser.username.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        email: backendUser.email,
        role: backendUser.role,
        is_active: backendUser.is_active,
        hospitalAffiliation: 'Payer Population Health Operations',
      };
      localStorage.setItem('care_risk_user', JSON.stringify(user));
      return user;
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        localStorage.removeItem('care_risk_token');
        localStorage.removeItem('care_risk_user');
      }
      return null;
    }
  },

  logout(): void {
    localStorage.removeItem('care_risk_token');
    localStorage.removeItem('care_risk_user');
    sessionStorage.clear();
  },

  async register(data: { username: string; email: string; password: string; confirm_password: string }): Promise<any> {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  async getUsers(): Promise<any[]> {
    const response = await apiClient.get('/auth/users');
    return response.data.users || [];
  },

  async updateUserRole(userId: number, role: string): Promise<any> {
    const response = await apiClient.patch(`/auth/users/${userId}/role`, { role });
    return response.data;
  },

  // ============================================================
  // MEMBER RETRIEVAL FROM POSTGRESQL (GET /members)
  // ============================================================

  async getMembers(params?: {
    riskCategory?: string;
    search?: string;
    countyFips?: string;
    sortBy?: string;
  }): Promise<Member[]> {
    const response = await apiClient.get('/members/');
    const rawMembers: BackendMember[] = response.data.members || [];
    let members = rawMembers.map(transformBackendMember);

    // Apply client-side filters if requested
    if (params?.riskCategory && params.riskCategory !== 'All') {
      members = members.filter(m => m.riskSummary.riskLevel.toLowerCase() === params.riskCategory?.toLowerCase());
    }

    if (params?.countyFips && params.countyFips !== 'All') {
      members = members.filter(m => m.countyFips === params.countyFips);
    }

    if (params?.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      members = members.filter(m => 
        m.id.toLowerCase().includes(q) ||
        m.countyFips.toLowerCase().includes(q) ||
        m.stateFips.toLowerCase().includes(q)
      );
    }

    if (params?.sortBy === 'riskScore_desc') {
      members.sort((a, b) => b.riskSummary.overallRiskScore - a.riskSummary.overallRiskScore);
    } else if (params?.sortBy === 'riskScore_asc') {
      members.sort((a, b) => a.riskSummary.overallRiskScore - b.riskSummary.overallRiskScore);
    } else if (params?.sortBy === 'age_desc') {
      members.sort((a, b) => b.age - a.age);
    }

    return members;
  },

  async getMemberById(memberId: string): Promise<Member | null> {
    try {
      const response = await apiClient.get(`/members/${memberId}`);
      const rawMember: BackendMember = response.data.member;
      if (!rawMember) return null;
      return transformBackendMember(rawMember);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return null;
      }
      throw err;
    }
  },

  // ============================================================
  // POPULATION METRICS FROM REAL POSTGRESQL COHORT
  // ============================================================

  async getPopulationMetrics(): Promise<PopulationMetrics> {
    const members = await this.getMembers();
    const total = members.length;
    const vHigh = members.filter(m => m.riskSummary.riskLevel === 'Very High').length;
    const high = members.filter(m => m.riskSummary.riskLevel === 'High').length;
    const med = members.filter(m => m.riskSummary.riskLevel === 'Medium').length;
    const low = members.filter(m => m.riskSummary.riskLevel === 'Low').length;

    const totalScoreSum = members.reduce((acc, m) => acc + m.riskSummary.overallRiskScore, 0);
    const avgScore = total > 0 ? Math.round((totalScoreSum / total) * 10) / 10 : 0;

    const healthAvg = total > 0 ? Math.round(members.reduce((acc, m) => acc + m.riskBreakdown.healthRiskScore, 0) / total) : 0;
    const utilAvg = total > 0 ? Math.round(members.reduce((acc, m) => acc + m.riskBreakdown.utilizationRiskScore, 0) / total) : 0;
    const sdohAvg = total > 0 ? Math.round(members.reduce((acc, m) => acc + m.riskBreakdown.sdohRiskScore, 0) / total) : 0;

    const interventions = await this.getInterventions();
    const activeCount = interventions.filter(i => i.status === 'In Progress').length;
    const pendingCount = interventions.filter(i => i.status === 'Pending').length;
    const completedCount = interventions.filter(i => i.status === 'Completed').length;

    return {
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
      healthAverageScore: healthAvg,
      utilizationAverageScore: utilAvg,
      sdohAverageScore: sdohAvg,
    };
  },

  // ============================================================
  // PREDICTION API (POST /predict/)
  // ============================================================

  async uploadMemberCsv(file: File): Promise<UploadCsvResponse> {
    if (!file || file.size === 0) {
      throw new Error('The selected CSV file is empty (0 bytes). Please select a valid population dataset.');
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      throw new Error(`Unsupported file format: "${file.name}". Only standard comma-separated (.csv) files are permitted.`);
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<PredictionResponse>('/predict/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const result = response.data;
    const predictions = result.predictions || [];

    return {
      success: true,
      message: result.message || 'Dataset successfully processed and saved.',
      filename: file.name,
      fileSizeBytes: file.size,
      recordsCount: result.total_members || predictions.length,
      uploadedAt: new Date().toISOString(),
      batchId: `BATCH-UC09-${Date.now().toString(36).toUpperCase()}`,
      status: 'Completed',
      processingNote: `Successfully executed 3-Model Stacking Ensemble & SHAP attribution for ${result.total_members || predictions.length} members.`,
      predictions,
    };
  },

  // ============================================================
  // INTERVENTIONS WORKFLOW (Decoupled from backend CRUD - Module handled separately)
  // ============================================================

  async getInterventions(filters?: {
    status?: InterventionStatus | 'All';
    priority?: InterventionPriority | 'All';
    category?: InterventionCategory | 'All';
    memberId?: string;
  }): Promise<Intervention[]> {
    let list: Intervention[] = [];
    try {
      const stored = localStorage.getItem('care_risk_interventions_local');
      if (stored) {
        list = JSON.parse(stored);
      }
    } catch {
      list = [];
    }

    if (filters?.memberId) {
      list = list.filter(i => i.memberId === filters.memberId || i.memberCode === filters.memberId);
    }
    if (filters?.status && filters.status !== 'All') {
      list = list.filter(i => i.status === filters.status);
    }
    if (filters?.priority && filters.priority !== 'All') {
      list = list.filter(i => i.priority === filters.priority);
    }
    if (filters?.category && filters.category !== 'All') {
      list = list.filter(i => i.type === filters.category);
    }
    return list;
  },

  async createIntervention(data: Omit<Intervention, 'id' | 'createdDate'>): Promise<Intervention> {
    const newItem: Intervention = {
      id: `INTV-${Date.now().toString().slice(-6)}`,
      ...data,
      createdDate: new Date().toISOString().split('T')[0],
    };

    try {
      const stored = localStorage.getItem('care_risk_interventions_local');
      const list: Intervention[] = stored ? JSON.parse(stored) : [];
      list.unshift(newItem);
      localStorage.setItem('care_risk_interventions_local', JSON.stringify(list));
    } catch (e) {
      console.warn('Could not save intervention locally:', e);
    }

    return newItem;
  },

  async updateInterventionStatus(id: string, status: InterventionStatus): Promise<Intervention | null> {
    try {
      const stored = localStorage.getItem('care_risk_interventions_local');
      if (!stored) return null;
      const list: Intervention[] = JSON.parse(stored);
      const item = list.find(i => i.id === id);
      if (item) {
        item.status = status;
        if (status === 'Completed') {
          item.completedDate = new Date().toISOString().split('T')[0];
        }
        localStorage.setItem('care_risk_interventions_local', JSON.stringify(list));
        return item;
      }
    } catch (e) {
      console.warn('Could not update intervention status locally:', e);
    }
    return null;
  },

  // ============================================================
  // RAG INTERVENTION RECOMMENDATIONS (GET /recommendations/{member_id})
  // ============================================================

  async getMemberRecommendations(memberId: string): Promise<RagRecommendationResponse> {
    const cleanId = String(memberId).trim();
    const response = await apiClient.get(`/recommendations/${encodeURIComponent(cleanId)}`);
    return response.data;
  },
};

export const mockApiService = apiService;

