export type RiskLevel = 'High' | 'Medium' | 'Low';

export type InterventionStatus = 'Pending' | 'In Progress' | 'Completed' | 'Deferred';

export type InterventionPriority = 'Urgent' | 'High' | 'Medium' | 'Standard';

export interface RiskDriver {
  id: string;
  factor: string;
  category: 'Clinical' | 'Medication' | 'Utilization' | 'SDOH' | 'Vitals';
  impactWeight: number; // e.g. 0.0 to 1.0 or percentage
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
  activeInterventionsCount: number;
  assignedCareManager: string;
  enrollmentStatus: 'Active' | 'Under Review' | 'Discharged';
}

export interface Intervention {
  id: string;
  memberId: string;
  memberName: string;
  memberCode: string;
  memberRiskLevel: RiskLevel;
  title: string;
  type: 
    | 'Medication Adherence Outreach' 
    | 'Diabetic Care Management' 
    | 'Telehealth Clinical Review' 
    | 'In-Home Nurse Visit' 
    | 'Cardiology Follow-Up' 
    | 'Social Determinants Support';
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

export interface UploadCsvResponse {
  success: boolean;
  message: string;
  filename: string;
  fileSizeBytes: number;
  recordsCount: number;
  uploadedAt: string;
  batchId: string;
  detectedHeaders?: string[];
  status: 'Validated' | 'Ready for Model Scoring' | 'Failed';
  processingNote?: string;
}

export interface UploadProgressState {
  stage: 'idle' | 'validating' | 'uploading' | 'parsing_metadata' | 'success' | 'error';
  progressPercentage: number;
  currentMessage?: string;
  error?: string;
}
