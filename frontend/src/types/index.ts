export type RiskLevel = 'Very High' | 'High' | 'Medium' | 'Low';

export type InterventionStatus = 'Pending' | 'In Progress' | 'Completed' | 'Deferred';

export type InterventionPriority = 'Urgent' | 'High' | 'Medium' | 'Standard';

export type InterventionCategory = 
  | 'Clinical' 
  | 'Preventive Care' 
  | 'Transportation / SDOH' 
  | 'Food Access / Community Support' 
  | 'Healthcare Access';

export interface ShapDriver {
  rank: number;
  feature: string;
  value: string;
  shapValue: number; // e.g. +0.34 or -0.12
  impact?: number;
  direction?: 'increases_risk' | 'decreases_risk' | 'neutral' | string;
  category: 'Health' | 'Utilization' | 'SDOH';
  description: string;
}

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
  totalEncounters: number;
  hospitalizationsLast12m: number;
  erVisitsLast12m: number;
  medicationCount: number;
  preventiveCareGap: number;
}

export interface RiskBreakdown {
  healthRiskScore: number; // 0 to 100
  utilizationRiskScore: number; // 0 to 100
  sdohRiskScore: number; // 0 to 100
  combinedRiskScore: number; // 0 to 100
}

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
  diagnosedDate?: string;
  severity?: 'Mild' | 'Moderate' | 'Severe';
  icd10Code?: string;
}

export interface ClinicalVitals {
  diabetes: boolean;
  hypertension: boolean;
  heartDisease: boolean;
  copd: boolean;
  obesity: boolean;
  cancer: boolean;
  chronicConditionCount: number;
}

export interface Member {
  id: string;
  memberCode: string;
  firstName?: string;
  lastName?: string;
  age: number;
  gender: string;
  stateFips: string;
  countyFips: string;
  chronicConditions: ChronicCondition[];
  vitals: ClinicalVitals;
  riskSummary: RiskSummary;
  riskBreakdown: RiskBreakdown;
  sdohData: SdohIndicators;
  utilizationData: UtilizationMetrics;
  shapDrivers: ShapDriver[];
  recommendedInterventions: RecommendedIntervention[];
  activeInterventionsCount: number;
  assignedCareManager?: string;
  rawBackendData?: BackendMember;
}

export interface BackendMember {
  id: number;
  member_id: string;
  age: number | null;
  gender: string | null;
  state_fips: string | null;
  county_fips: string | null;
  diabetes: number | null;
  hypertension: number | null;
  heart_disease: number | null;
  copd: number | null;
  obesity: number | null;
  cancer: number | null;
  chronic_condition_count: number | null;
  total_encounters: number | null;
  ed_visits: number | null;
  hospitalizations: number | null;
  medication_count: number | null;
  preventive_care_gap: number | null;
  ep_pov150: number | null;
  ep_unemp: number | null;
  ep_hburd: number | null;
  ep_nohsdp: number | null;
  ep_uninsur: number | null;
  ep_age65: number | null;
  ep_age17: number | null;
  ep_disabl: number | null;
  ep_sngpnt: number | null;
  ep_limeng: number | null;
  ep_minrty: number | null;
  ep_munit: number | null;
  ep_mobile: number | null;
  ep_crowd: number | null;
  ep_noveh: number | null;
  ep_groupq: number | null;
  rpl_themes: number | null;
  diabetes_adjprev: number | null;
  obesity_adjprev: number | null;
  csmoking_adjprev: number | null;
  lpa_adjprev: number | null;
  bphigh_adjprev: number | null;
  highchol_adjprev: number | null;
  chd_adjprev: number | null;
  stroke_adjprev: number | null;
  copd_adjprev: number | null;
  casthma_adjprev: number | null;
  cancer_adjprev: number | null;
  depression_adjprev: number | null;
  mhlth_adjprev: number | null;
  phlth_adjprev: number | null;
  ghlth_adjprev: number | null;
  arthritis_adjprev: number | null;
  disability_adjprev: number | null;
  indeplive_adjprev: number | null;
  children_low_access_pct: number | null;
  no_vehicle_low_access_pct: number | null;
  low_income_low_access_pct: number | null;
  low_food_access_pct: number | null;
  seniors_low_access_pct: number | null;
  risk_score: number;
  risk_category: string;
  top_risk_drivers: BackendShapDriver[];
  prediction_id?: number | null;
  prediction_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
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
  healthAverageScore: number;
  utilizationAverageScore: number;
  sdohAverageScore: number;
}

export type BackendRole = 'payer_admin' | 'clinical_analyst' | 'care_manager' | 'payer_viewer';

export type UserRole = BackendRole | 'Care Manager' | 'Chief Medical Officer' | 'Clinical Nurse Specialist' | 'Administrator' | string;

export interface BackendShapDriver {
  feature: string;
  value: string | number;
  shap_value: number;
  impact?: number;
  direction?: 'increases_risk' | 'decreases_risk' | 'neutral' | string;
  description?: string;
}

export interface BackendPredictionItem {
  prediction_id: number;
  member_id: string;
  risk_score: number;
  risk_category: string;
  shap_explanation_id?: number;
  top_risk_drivers: BackendShapDriver[];
}

export interface PredictionResponse {
  message: string;
  requested_by: {
    id: number;
    username: string;
    role: string;
  };
  total_members: number;
  predictions: BackendPredictionItem[];
}

export interface User {
  id: string | number;
  username?: string;
  name: string;
  email: string;
  role: UserRole;
  is_active?: boolean;
  hospitalAffiliation?: string;
  avatarUrl?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
}

export interface UploadCsvResponse {
  success: boolean;
  message: string;
  filename: string;
  fileSizeBytes: number;
  recordsCount: number;
  uploadedAt: string;
  batchId: string;
  detectedHeaders?: string[];
  status: 'Validated' | 'Ready for Model Scoring' | 'Completed' | 'Failed';
  processingNote?: string;
  predictions?: BackendPredictionItem[];
}

export interface UploadProgressState {
  stage: 'idle' | 'validating' | 'uploading' | 'parsing_metadata' | 'scoring' | 'success' | 'error';
  progressPercentage: number;
  currentMessage?: string;
  error?: string;
}

export interface EmailLog {
  id: string;
  recipient: string;
  subject: string;
  timestamp: string;
  type: string;
  status: string;
  file_path?: string;
}
