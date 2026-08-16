import axios from 'axios';
import { 
  Member, 
  Intervention, 
  PopulationMetrics, 
  User, 
  RiskLevel, 
  InterventionStatus, 
  InterventionPriority 
} from '../types';
import { 
  MOCK_MEMBERS, 
  MOCK_INTERVENTIONS, 
  MOCK_POPULATION_METRICS, 
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
const simulateDelay = <T>(data: T, ms: number = 300): Promise<T> => {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
};

// In-memory working state for demo interactions (allows creating/updating interventions during session)
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

  // Population Analytics
  async getPopulationMetrics(): Promise<PopulationMetrics> {
    return simulateDelay(MOCK_POPULATION_METRICS, 250);
  },

  // Members
  async getMembers(params?: {
    search?: string;
    riskLevel?: RiskLevel | 'All';
    condition?: string;
  }): Promise<Member[]> {
    let result = [...dynamicMembers];

    if (params?.search) {
      const q = params.search.toLowerCase();
      result = result.filter(
        (m) =>
          m.firstName.toLowerCase().includes(q) ||
          m.lastName.toLowerCase().includes(q) ||
          m.memberCode.toLowerCase().includes(q) ||
          m.primaryCarePhysician.toLowerCase().includes(q)
      );
    }

    if (params?.riskLevel && params.riskLevel !== 'All') {
      result = result.filter((m) => m.riskSummary.riskLevel === params.riskLevel);
    }

    if (params?.condition && params.condition !== 'All') {
      result = result.filter((m) =>
        m.chronicConditions.some((c) =>
          c.name.toLowerCase().includes((params.condition || '').toLowerCase())
        )
      );
    }

    return simulateDelay(result, 300);
  },

  async getMemberById(id: string): Promise<Member | undefined> {
    const member = dynamicMembers.find((m) => m.id === id);
    return simulateDelay(member, 250);
  },

  // Interventions
  async getInterventions(params?: {
    status?: InterventionStatus | 'All';
    priority?: InterventionPriority | 'All';
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

    return simulateDelay(result, 300);
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

    return simulateDelay(created, 350);
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

    return simulateDelay(updatedItem, 250);
  },
};
