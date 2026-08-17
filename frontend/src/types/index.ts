export type RiskLevel = 'Very High' | 'High' | 'Medium' | 'Low';
export type RiskCategory = RiskLevel;

export type InterventionStatus = 'Pending' | 'In Progress' | 'Completed' | 'Deferred';

export type InterventionPriority = 'Urgent' | 'High' | 'Medium' | 'Standard';

export type InterventionCategory = 
  | 'Clinical' 
  | 'Preventive Care' 
  | 'Transportation / SDOH' 
  | 'Food Access / Community Support' 
  | 'Healthcare Access';

// Unified SHAP Feature Attribution Driver
export interface SHAPDriver {
  rank: number;
  feature: string;
  value: string | number;
  shap_value?: number; // snake_case (FastAPI backend convention)
  shapValue?: number;  // camelCase (Frontend mock convention)
  category?: 'Health' | 'Utilization' | 'SDOH' | 'Clinical' | 'Medication' | 'Vitals' | string;
  description?: string;
}

// Backward-compatible alias
export type ShapDriver = SHAPDriver;

export interface SdohIndicators {
  countyFips: string;
  countyName: string;
  state: string;
  sviScore: number; // 0.0 to 1.0 (CDC Social Vulnerability Index)
  sviTier: 'Low' | 'Moderate' | 'High' | 'Very High';
  transportationAccessScore: number; // 0 to 100
  transportationNotes: string;
  healthcareAccessScore: number; // 0 to 100
  healthcareAccessNotes: string;
  foodAccessScore: number; // 0 to 100
  foodAccessNotes: string;
}

export interface UtilizationMetrics {
  hospitalizationsLast12m: number;
  erVisitsLast12m: number;
  outpatientVisitsLast12m: number;
  telehealthVisitsLast12m: number;
  readmissionCount30d: number;
}

// Risk component vector breakdown
export interface RiskBreakdown {
  healthRiskScore: number; // 0 to 100
  utilizationRiskScore: number; // 0 to 100
  sdohRiskScore: number; // 0 to 100
  combinedRiskScore: number; // 0 to 100
  // snake_case aliases for direct FastAPI response alignment
  health_risk_score?: number;
  utilization_risk_score?: number;
  sdoh_risk_score?: number;
  combined_risk_score?: number;
}

export type RiskComponent = RiskBreakdown;

export interface RecommendedIntervention {
  id: string;
  title: string;
  category: InterventionCategory;
  priority: InterventionPriority;
  reason: string;
}

export interface RiskDriver {
  id: string;
  factor: string;
  category: 'Clinical' | 'Medication' | 'Utilization' | 'SDOH' | 'Vitals';
  impactWeight: number;
  description: string;
  trend: 'increasing' | 'stable' | 'decreasing';
}

export interface RiskSummary {
  overallRiskScore: number; // 0 to 100
  riskLevel: RiskLevel;
  hospitalAdmissionRiskPct: number; // 0 to 100%
  edVisitRiskPct: number;
  medicationAdherenceRiskPct: number;
  lastAssessedDate: string;
  trendDirection: 'up' | 'down' | 'neutral' | 'stable';
  topDrivers: RiskDriver[];
}

export interface ChronicCondition {
  name: string;
  diagnosedDate: string;
  severity: 'Mild' | 'Moderate' | 'Severe';
  icd10Code: string;
}

export interface ClinicalVitals {
  bloodPressure: string;
  heartRateBpm: number;
  bmi: number;
  hba1c?: number;
  cholesterolMgl?: number;
  lastUpdated: string;
}

export interface Member {
  id: string;
  memberCode: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  dob: string;
  contactNumber: string;
  email: string;
  address: string;
  insurancePlan: string;
  primaryCarePhysician: string;
  chronicConditions: ChronicCondition[];
  vitals: ClinicalVitals;
  riskSummary: RiskSummary;
  riskBreakdown: RiskBreakdown;
  sdohData: SdohIndicators;
  utilizationData: UtilizationMetrics;
  shapDrivers: SHAPDriver[];
  recommendedInterventions: RecommendedIntervention[];
  activeInterventionsCount: number;
  assignedCareManager: string;
  enrollmentStatus: 'Active' | 'Under Review' | 'Discharged';
}

// GET /members/{member_id}/explanation response schema
export interface MemberExplanation {
  member_id: string;
  risk_score: number;
  risk_category: RiskCategory;
  risk_drivers: SHAPDriver[];
  summary?: string;
}

export interface Intervention {
  id: string;
  memberId: string;
  memberName: string;
  memberCode: string;
  memberRiskLevel: RiskLevel;
  title: string;
  type: InterventionCategory | string;
  description: string;
  priority: InterventionPriority;
  status: InterventionStatus;
  assignedTo: string;
  dueDate: string;
  createdDate: string;
  completedDate?: string;
  notes?: string[];
  actionRequired: string;
}

// GET /risk-summary population response
export interface PopulationMetrics {
  totalMembers: number;
  veryHighRiskCount: number;
  veryHighRiskPercentage: number;
  highRiskCount: number;
  highRiskPercentage: number;
  mediumRiskCount: number;
  mediumRiskPercentage: number;
  lowRiskCount: number;
  lowRiskPercentage: number;
  activeInterventionsCount: number;
  pendingInterventionsCount: number;
  completedInterventionsCount: number;
  averageRiskScore: number;
  projectedReadmissionReductionPct: number;
}

export type RiskSummaryResponse = PopulationMetrics;

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Care Manager' | 'Chief Medical Officer' | 'Clinical Nurse Specialist' | 'Administrator';
  hospitalAffiliation: string;
  avatarUrl?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
}

// POST /upload response schema
export interface UploadResponse {
  success: boolean;
  message: string;
  filename: string;
  fileSizeBytes: number;
  recordsCount: number;
  uploadedAt: string;
  batchId: string;
  detectedHeaders?: string[];
  status: 'Validated' | 'Ready for Model Scoring' | 'Failed' | 'Processing';
  processingNote?: string;
}

export type UploadCsvResponse = UploadResponse;

export interface UploadProgressState {
  stage: 'idle' | 'validating' | 'uploading' | 'parsing_metadata' | 'success' | 'error';
  progressPercentage: number;
  currentMessage?: string;
  error?: string;
}

// Filter query parameters for API calls
export interface MemberQueryParams {
  search?: string;
  riskLevel?: RiskLevel | 'All';
  riskCategory?: RiskCategory | 'All';
  sdohTier?: string;
  condition?: string;
  sortBy?: string;
}

export interface InterventionQueryParams {
  status?: InterventionStatus | 'All';
  priority?: InterventionPriority | 'All';
  category?: InterventionCategory | 'All';
  memberId?: string;
}

// Standard UI Async State wrapper
export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}
