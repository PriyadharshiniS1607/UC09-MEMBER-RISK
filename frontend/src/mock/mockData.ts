import { Member, Intervention, PopulationMetrics, User } from '../types';

export const MOCK_USERS: User[] = [
  {
    id: 'usr-001',
    name: 'Dr. Sarah Jenkins, MD',
    email: 's.jenkins@healthfirst.org',
    role: 'Chief Medical Officer',
    hospitalAffiliation: 'Metro Health Alliance',
    avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr-002',
    name: 'Elena Rostova, RN',
    email: 'e.rostova@healthfirst.org',
    role: 'Care Manager',
    hospitalAffiliation: 'St. Jude Clinical Network',
    avatarUrl: 'https://images.unsplash.com/photo-1594824813636-224490b4d45d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr-003',
    name: 'Marcus Vance',
    email: 'admin@healthfirst.org',
    role: 'Administrator',
    hospitalAffiliation: 'Regional Health System HQ',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  }
];

export const MOCK_MEMBERS: Member[] = [
  {
    id: 'mem-105',
    memberCode: 'MBR-83194',
    firstName: 'Beatrice',
    lastName: 'Sterling',
    age: 81,
    gender: 'Female',
    dob: '1945-07-30',
    contactNumber: '+1 (555) 441-2098',
    email: 'b.sterling@example.com',
    address: '502 Lake Shore Drive, Chicago, IL 60611',
    insurancePlan: 'Humana Gold Plus HMO',
    primaryCarePhysician: 'Dr. Anita Desai, MD',
    enrollmentStatus: 'Active',
    assignedCareManager: 'Sarah Jenkins, MD',
    activeInterventionsCount: 3,
    vitals: {
      bloodPressure: '162/98',
      heartRateBpm: 92,
      bmi: 33.1,
      hba1c: 8.8,
      cholesterolMgl: 260,
      lastUpdated: '2026-08-13',
    },
    chronicConditions: [
      { name: 'Atrial Fibrillation', diagnosedDate: '2015-08-14', severity: 'Severe', icd10Code: 'I48.91' },
      { name: 'Peripheral Vascular Disease', diagnosedDate: '2018-12-01', severity: 'Severe', icd10Code: 'I73.9' },
      { name: 'Type 2 Diabetes', diagnosedDate: '2010-04-19', severity: 'Moderate', icd10Code: 'E11.9' },
      { name: 'History of Falls & Fragility', diagnosedDate: '2024-02-15', severity: 'Severe', icd10Code: 'R29.6' }
    ],
    riskSummary: {
      overallRiskScore: 94,
      riskLevel: 'Very High',
      hospitalAdmissionRiskPct: 88,
      edVisitRiskPct: 91,
      medicationAdherenceRiskPct: 78,
      lastAssessedDate: '2026-08-15',
      trendDirection: 'up',
      topDrivers: [
        {
          id: 'drv-10',
          factor: 'High Fall Risk with Anticoagulant Therapy (Apixaban)',
          category: 'Clinical',
          impactWeight: 0.40,
          description: 'High risk of catastrophic intracranial hemorrhage in event of unassisted fall.',
          trend: 'increasing',
        },
        {
          id: 'drv-11',
          factor: 'Complex Polypharmacy (11 Daily Active Prescriptions)',
          category: 'Medication',
          impactWeight: 0.35,
          description: 'Frequent confusion regarding morning vs. bedtime dosette distribution.',
          trend: 'increasing',
        },
        {
          id: 'drv-12',
          factor: 'Social Isolation & Limited Home Health Aide Hours',
          category: 'SDOH',
          impactWeight: 0.25,
          description: 'Lives alone with caregiver present only 2 days per week.',
          trend: 'increasing',
        }
      ],
    },
    riskBreakdown: {
      healthRiskScore: 92,
      utilizationRiskScore: 96,
      sdohRiskScore: 88,
      combinedRiskScore: 94,
    },
    sdohData: {
      countyFips: '17031',
      countyName: 'Cook County',
      state: 'IL',
      sviScore: 0.89,
      sviTier: 'Very High',
      transportationAccessScore: 35,
      transportationNotes: 'Limited mobility; relies on municipal transit with long wait times',
      healthcareAccessScore: 42,
      healthcareAccessNotes: 'High appointment lead times for vascular specialists in area',
      foodAccessScore: 38,
      foodAccessNotes: 'Low proximity to fresh produce markets; high reliance on processed goods',
    },
    utilizationData: {
      hospitalizationsLast12m: 4,
      erVisitsLast12m: 7,
      outpatientVisitsLast12m: 14,
      telehealthVisitsLast12m: 2,
      readmissionCount30d: 2,
    },
    shapDrivers: [
      {
        rank: 1,
        feature: 'Anticoagulant + Fall History Risk',
        value: 'Present (Apixaban + Fall in 6m)',
        shapValue: +0.38,
        category: 'Health',
        description: 'Co-occurrence of high fall risk and blood thinner medication increases acute bleeding probability.'
      },
      {
        rank: 2,
        feature: '30-Day Hospital Readmission Rate',
        value: '2 Inpatient Admissions',
        shapValue: +0.31,
        category: 'Utilization',
        description: 'Frequent hospital discharges without stabilized post-acute transitions.'
      },
      {
        rank: 3,
        feature: 'County SVI Vulnerability Index',
        value: '0.89 (Cook County, FIPS 17031)',
        shapValue: +0.22,
        category: 'SDOH',
        description: 'High socio-economic vulnerability score in local geographic block.'
      },
      {
        rank: 4,
        feature: 'Transportation Access Score',
        value: '35 / 100 Index',
        shapValue: +0.15,
        category: 'SDOH',
        description: 'Severe transit difficulty for specialist outpatient visits.'
      }
    ],
    recommendedInterventions: [
      {
        id: 'rec-101',
        title: 'Fall Prevention Home Safety & Physical Therapy Evaluation',
        category: 'Clinical',
        priority: 'Urgent',
        reason: 'Multiple fall incidents combined with active Apixaban anticoagulant prescription.'
      },
      {
        id: 'rec-102',
        title: 'Non-Emergency Medical Transportation (NEMT) Pass',
        category: 'Transportation / SDOH',
        priority: 'High',
        reason: 'Low transit access score (35/100) causing missed vascular follow-ups.'
      },
      {
        id: 'rec-103',
        title: 'Medication Organizer & Pharmacy Blister Packaging',
        category: 'Preventive Care',
        priority: 'High',
        reason: 'Polypharmacy complexity with 11 active daily prescriptions.'
      }
    ]
  },
  {
    id: 'mem-101',
    memberCode: 'MBR-98241',
    firstName: 'Eleanor',
    lastName: 'Vance',
    age: 72,
    gender: 'Female',
    dob: '1954-04-12',
    contactNumber: '+1 (555) 234-8901',
    email: 'eleanor.vance@example.com',
    address: '442 Oakridge Blvd, Chicago, IL 60614',
    insurancePlan: 'Medicare Advantage Platinum Plus',
    primaryCarePhysician: 'Dr. James Thorne, MD',
    enrollmentStatus: 'Active',
    assignedCareManager: 'Elena Rostova, RN',
    activeInterventionsCount: 2,
    vitals: {
      bloodPressure: '158/94',
      heartRateBpm: 88,
      bmi: 31.4,
      hba1c: 9.2,
      cholesterolMgl: 245,
      lastUpdated: '2026-08-10',
    },
    chronicConditions: [
      { name: 'Type 2 Diabetes Mellitus', diagnosedDate: '2016-03-15', severity: 'Severe', icd10Code: 'E11.65' },
      { name: 'Congestive Heart Failure (NYHA Class III)', diagnosedDate: '2019-11-20', severity: 'Severe', icd10Code: 'I50.9' },
      { name: 'Stage 3 Chronic Kidney Disease', diagnosedDate: '2021-06-04', severity: 'Moderate', icd10Code: 'N18.3' },
      { name: 'Essential Hypertension', diagnosedDate: '2012-08-19', severity: 'Moderate', icd10Code: 'I10' }
    ],
    riskSummary: {
      overallRiskScore: 89,
      riskLevel: 'High',
      hospitalAdmissionRiskPct: 78,
      edVisitRiskPct: 84,
      medicationAdherenceRiskPct: 65,
      lastAssessedDate: '2026-08-14',
      trendDirection: 'up',
      topDrivers: [
        {
          id: 'drv-01',
          factor: 'Elevated Glycated Hemoglobin (HbA1c 9.2%)',
          category: 'Clinical',
          impactWeight: 0.38,
          description: 'Uncontrolled glycemic spikes over past 90 days with recurrent symptomatic hypoglycemia events.',
          trend: 'increasing',
        },
        {
          id: 'drv-02',
          factor: 'Recent Inpatient Stay & 2 ED Visits in 60 Days',
          category: 'Utilization',
          impactWeight: 0.32,
          description: 'Recurrent fluid overload episodes triggering emergency department evaluations.',
          trend: 'increasing',
        },
        {
          id: 'drv-03',
          factor: 'ACE-Inhibitor Refill Gap (> 45 Days Past Due)',
          category: 'Medication',
          impactWeight: 0.20,
          description: 'Lisinopril refill delayed due to reported transportation barrier to pharmacy.',
          trend: 'increasing',
        },
        {
          id: 'drv-04',
          factor: 'Transportation Insecurity (SDOH)',
          category: 'SDOH',
          impactWeight: 0.10,
          description: 'Resides 12 miles from nearest specialist without personal vehicle or caregiver transit.',
          trend: 'stable',
        }
      ],
    },
    riskBreakdown: {
      healthRiskScore: 88,
      utilizationRiskScore: 92,
      sdohRiskScore: 78,
      combinedRiskScore: 89,
    },
    sdohData: {
      countyFips: '17031',
      countyName: 'Cook County',
      state: 'IL',
      sviScore: 0.76,
      sviTier: 'High',
      transportationAccessScore: 40,
      transportationNotes: '12 miles from specialist clinic; lacks personal vehicle',
      healthcareAccessScore: 58,
      healthcareAccessNotes: 'Moderate access to community primary care clinics',
      foodAccessScore: 45,
      foodAccessNotes: 'Moderate access to fresh food options via local markets',
    },
    utilizationData: {
      hospitalizationsLast12m: 3,
      erVisitsLast12m: 5,
      outpatientVisitsLast12m: 11,
      telehealthVisitsLast12m: 4,
      readmissionCount30d: 1,
    },
    shapDrivers: [
      {
        rank: 1,
        feature: 'Glycated Hemoglobin (HbA1c)',
        value: '9.2% (Uncontrolled)',
        shapValue: +0.36,
        category: 'Health',
        description: 'High HbA1c correlates with microvascular complications and acute CHF exacerbations.'
      },
      {
        rank: 2,
        feature: 'Emergency Department Visits (60d)',
        value: '2 Visits',
        shapValue: +0.28,
        category: 'Utilization',
        description: 'Frequent ED use for acute dyspnea and hypertension spikes.'
      },
      {
        rank: 3,
        feature: 'Medication Refill Gap (Lisinopril)',
        value: '45 Days Past Due',
        shapValue: +0.21,
        category: 'Health',
        description: 'Omission of cardiac meds destabilizes blood pressure control.'
      },
      {
        rank: 4,
        feature: 'Distance to Primary Care',
        value: '12.4 Miles',
        shapValue: +0.14,
        category: 'SDOH',
        description: 'Geographic barrier to routine clinical follow-up.'
      }
    ],
    recommendedInterventions: [
      {
        id: 'rec-104',
        title: 'Urgent Home Health Nurse Vitals & Med Box Setup',
        category: 'Clinical',
        priority: 'Urgent',
        reason: 'HbA1c at 9.2% with medication refill gap of 45 days.'
      },
      {
        id: 'rec-105',
        title: 'Diabetic Nutrition & Grocery Assistance Program',
        category: 'Food Access / Community Support',
        priority: 'High',
        reason: 'SVI food insecurity index indicates difficulty accessing low-glycemic foods.'
      }
    ]
  },
  {
    id: 'mem-102',
    memberCode: 'MBR-77319',
    firstName: 'Arthur',
    lastName: 'Pendleton',
    age: 68,
    gender: 'Male',
    dob: '1958-09-27',
    contactNumber: '+1 (555) 891-4522',
    email: 'arthur.p@example.com',
    address: '810 West Pine St, Aurora, IL 60506',
    insurancePlan: 'BlueCross Senior Care Select',
    primaryCarePhysician: 'Dr. Anita Desai, MD',
    enrollmentStatus: 'Active',
    assignedCareManager: 'Elena Rostova, RN',
    activeInterventionsCount: 1,
    vitals: {
      bloodPressure: '146/88',
      heartRateBpm: 76,
      bmi: 28.2,
      hba1c: 7.8,
      cholesterolMgl: 210,
      lastUpdated: '2026-08-08',
    },
    chronicConditions: [
      { name: 'Chronic Obstructive Pulmonary Disease (COPD)', diagnosedDate: '2017-02-11', severity: 'Severe', icd10Code: 'J44.1' },
      { name: 'Coronary Artery Disease', diagnosedDate: '2020-05-18', severity: 'Moderate', icd10Code: 'I25.10' }
    ],
    riskSummary: {
      overallRiskScore: 82,
      riskLevel: 'High',
      hospitalAdmissionRiskPct: 71,
      edVisitRiskPct: 75,
      medicationAdherenceRiskPct: 40,
      lastAssessedDate: '2026-08-12',
      trendDirection: 'up',
      topDrivers: [
        {
          id: 'drv-05',
          factor: 'Seasonal Acute Exacerbation of COPD',
          category: 'Clinical',
          impactWeight: 0.45,
          description: 'SpO2 drops below 90% during modest exertion; recent steroid taper completed.',
          trend: 'increasing',
        },
        {
          id: 'drv-06',
          factor: 'Lack of At-Home BiPAP Compliance Tracking',
          category: 'Utilization',
          impactWeight: 0.35,
          description: 'No telemetry log updates for positive airway pressure equipment over last 30 days.',
          trend: 'stable',
        }
      ],
    },
    riskBreakdown: {
      healthRiskScore: 84,
      utilizationRiskScore: 80,
      sdohRiskScore: 75,
      combinedRiskScore: 82,
    },
    sdohData: {
      countyFips: '17089',
      countyName: 'Kane County',
      state: 'IL',
      sviScore: 0.71,
      sviTier: 'High',
      transportationAccessScore: 50,
      transportationNotes: 'Moderate transit access; relies on family members for hospital visits',
      healthcareAccessScore: 62,
      healthcareAccessNotes: 'Pulmonology clinic located within 8 miles',
      foodAccessScore: 55,
      foodAccessNotes: 'Adequate access to local grocery chains',
    },
    utilizationData: {
      hospitalizationsLast12m: 2,
      erVisitsLast12m: 4,
      outpatientVisitsLast12m: 8,
      telehealthVisitsLast12m: 3,
      readmissionCount30d: 1,
    },
    shapDrivers: [
      {
        rank: 1,
        feature: 'COPD Exacerbation Frequency',
        value: '2 Exacerbations in 12m',
        shapValue: +0.41,
        category: 'Health',
        description: 'Frequent respiratory drops require emergency steroid bursts.'
      },
      {
        rank: 2,
        feature: 'DME Telemetry Sync Disconnection',
        value: '30 Days Inactive',
        shapValue: +0.29,
        category: 'Utilization',
        description: 'Absence of daily BiPAP compliance logging.'
      },
      {
        rank: 3,
        feature: 'County Air Quality Vulnerability',
        value: 'Kane County (FIPS 17089)',
        shapValue: +0.18,
        category: 'SDOH',
        description: 'Elevated particulate matter increases respiratory distress episodes.'
      }
    ],
    recommendedInterventions: [
      {
        id: 'rec-106',
        title: 'COPD Action Plan & BiPAP Telemetry Sync Check',
        category: 'Clinical',
        priority: 'High',
        reason: 'SpO2 instability and 30-day telemetry outage.'
      },
      {
        id: 'rec-107',
        title: 'In-Home Oxygen & Air Filtration Unit Delivery',
        category: 'Healthcare Access',
        priority: 'Medium',
        reason: 'Air quality vulnerability in Kane County FIPS 17089.'
      }
    ]
  },
  {
    id: 'mem-103',
    memberCode: 'MBR-61502',
    firstName: 'Rosa',
    lastName: 'Martinez',
    age: 59,
    gender: 'Female',
    dob: '1967-11-03',
    contactNumber: '+1 (555) 604-1299',
    email: 'rosa.martinez@example.com',
    address: '1249 S Damen Ave, Chicago, IL 60608',
    insurancePlan: 'Aetna Community Health Plan',
    primaryCarePhysician: 'Dr. Michael Cho, MD',
    enrollmentStatus: 'Active',
    assignedCareManager: 'Sarah Jenkins, MD',
    activeInterventionsCount: 1,
    vitals: {
      bloodPressure: '138/82',
      heartRateBpm: 72,
      bmi: 29.5,
      hba1c: 7.1,
      cholesterolMgl: 195,
      lastUpdated: '2026-08-01',
    },
    chronicConditions: [
      { name: 'Type 2 Diabetes (Well-Controlled)', diagnosedDate: '2022-01-10', severity: 'Mild', icd10Code: 'E11.9' },
      { name: 'Primary Hypertension', diagnosedDate: '2018-09-14', severity: 'Moderate', icd10Code: 'I10' }
    ],
    riskSummary: {
      overallRiskScore: 54,
      riskLevel: 'Medium',
      hospitalAdmissionRiskPct: 35,
      edVisitRiskPct: 42,
      medicationAdherenceRiskPct: 30,
      lastAssessedDate: '2026-08-09',
      trendDirection: 'down',
      topDrivers: [
        {
          id: 'drv-07',
          factor: 'Metformin Dose Titration Adherence',
          category: 'Medication',
          impactWeight: 0.50,
          description: 'Occasional gastrointestinal tolerance issues reported with nighttime dosage.',
          trend: 'decreasing',
        },
        {
          id: 'drv-08',
          factor: 'Pending Annual Retinal & Podiatry Screening',
          category: 'Clinical',
          impactWeight: 0.30,
          description: 'Overdue for diabetic retinopathy exam by 60 days.',
          trend: 'stable',
        }
      ],
    },
    riskBreakdown: {
      healthRiskScore: 52,
      utilizationRiskScore: 48,
      sdohRiskScore: 62,
      combinedRiskScore: 54,
    },
    sdohData: {
      countyFips: '17031',
      countyName: 'Cook County',
      state: 'IL',
      sviScore: 0.58,
      sviTier: 'Moderate',
      transportationAccessScore: 68,
      transportationNotes: 'Good bus line proximity; low transit barriers',
      healthcareAccessScore: 70,
      healthcareAccessNotes: 'Multiple urban health centers within 3 miles',
      foodAccessScore: 60,
      foodAccessNotes: 'Moderate access to fresh food markets',
    },
    utilizationData: {
      hospitalizationsLast12m: 1,
      erVisitsLast12m: 2,
      outpatientVisitsLast12m: 6,
      telehealthVisitsLast12m: 5,
      readmissionCount30d: 0,
    },
    shapDrivers: [
      {
        rank: 1,
        feature: 'Overdue Preventive Diabetes Screenings',
        value: '60 Days Overdue',
        shapValue: +0.25,
        category: 'Health',
        description: 'Delay in annual podiatry and retinal exams.'
      },
      {
        rank: 2,
        feature: 'Metformin Gastrointestinal Side Effects',
        value: 'Moderate GI Sensitivity',
        shapValue: +0.18,
        category: 'Health',
        description: 'GI discomfort leads to skipped evening doses.'
      },
      {
        rank: 3,
        feature: 'Outpatient Clinic Attendance Rate',
        value: '85% Attendance',
        shapValue: -0.12,
        category: 'Utilization',
        description: 'Consistent attendance at primary care appointments lowers risk.'
      }
    ],
    recommendedInterventions: [
      {
        id: 'rec-108',
        title: 'Diabetic Retinal & Foot Exam Scheduling Outreach',
        category: 'Preventive Care',
        priority: 'Medium',
        reason: '60 days overdue for annual diabetic preventive checkups.'
      }
    ]
  },
  {
    id: 'mem-106',
    memberCode: 'MBR-55219',
    firstName: 'Julian',
    lastName: 'Ortiz',
    age: 53,
    gender: 'Male',
    dob: '1973-10-15',
    contactNumber: '+1 (555) 902-3341',
    email: 'j.ortiz@example.com',
    address: '774 S Ashland Ave, Chicago, IL 60607',
    insurancePlan: 'Cigna HealthSpring',
    primaryCarePhysician: 'Dr. Michael Cho, MD',
    enrollmentStatus: 'Active',
    assignedCareManager: 'Elena Rostova, RN',
    activeInterventionsCount: 1,
    vitals: {
      bloodPressure: '142/86',
      heartRateBpm: 79,
      bmi: 27.6,
      hba1c: 6.9,
      cholesterolMgl: 218,
      lastUpdated: '2026-08-05',
    },
    chronicConditions: [
      { name: 'Moderate Persistent Asthma', diagnosedDate: '2014-06-22', severity: 'Moderate', icd10Code: 'J45.40' },
      { name: 'Hyperlipidemia', diagnosedDate: '2019-10-05', severity: 'Mild', icd10Code: 'E78.5' }
    ],
    riskSummary: {
      overallRiskScore: 48,
      riskLevel: 'Medium',
      hospitalAdmissionRiskPct: 29,
      edVisitRiskPct: 36,
      medicationAdherenceRiskPct: 24,
      lastAssessedDate: '2026-08-07',
      trendDirection: 'neutral',
      topDrivers: [
        {
          id: 'drv-13',
          factor: 'Inhaled Corticosteroid Refill Consistency',
          category: 'Medication',
          impactWeight: 0.55,
          description: 'Good compliance with rescue inhaler but sporadic daily maintenance controller usage.',
          trend: 'stable',
        }
      ],
    },
    riskBreakdown: {
      healthRiskScore: 46,
      utilizationRiskScore: 42,
      sdohRiskScore: 56,
      combinedRiskScore: 48,
    },
    sdohData: {
      countyFips: '17031',
      countyName: 'Cook County',
      state: 'IL',
      sviScore: 0.52,
      sviTier: 'Moderate',
      transportationAccessScore: 72,
      transportationNotes: 'Proximity to public transit subway stops',
      healthcareAccessScore: 75,
      healthcareAccessNotes: 'Well served by urban health system providers',
      foodAccessScore: 65,
      foodAccessNotes: 'Good access to local grocery options',
    },
    utilizationData: {
      hospitalizationsLast12m: 0,
      erVisitsLast12m: 2,
      outpatientVisitsLast12m: 5,
      telehealthVisitsLast12m: 3,
      readmissionCount30d: 0,
    },
    shapDrivers: [
      {
        rank: 1,
        feature: 'Asthma Maintenance Inhaler Adherence',
        value: '62% Refill Rate',
        shapValue: +0.22,
        category: 'Health',
        description: 'Irregular use of maintenance steroid inhaler increases risk of acute attacks.'
      },
      {
        rank: 2,
        feature: 'Emergency Room Asthma Visits',
        value: '2 Visits in 12m',
        shapValue: +0.16,
        category: 'Utilization',
        description: 'Acute exacerbations managed in ED setting.'
      }
    ],
    recommendedInterventions: [
      {
        id: 'rec-109',
        title: 'Maintenance Inhaler Refill & Usage Coaching',
        category: 'Clinical',
        priority: 'Standard',
        reason: 'Spacer technique demonstration and 90-day mail order setup.'
      }
    ]
  },
  {
    id: 'mem-104',
    memberCode: 'MBR-44910',
    firstName: 'David',
    lastName: 'Kowalski',
    age: 64,
    gender: 'Male',
    dob: '1962-02-19',
    contactNumber: '+1 (555) 732-9011',
    email: 'd.kowalski@example.com',
    address: '3200 Elm Street, Naperville, IL 60540',
    insurancePlan: 'UnitedHealthcare Choice Premier',
    primaryCarePhysician: 'Dr. James Thorne, MD',
    enrollmentStatus: 'Active',
    assignedCareManager: 'Elena Rostova, RN',
    activeInterventionsCount: 0,
    vitals: {
      bloodPressure: '122/76',
      heartRateBpm: 68,
      bmi: 24.8,
      hba1c: 5.6,
      cholesterolMgl: 172,
      lastUpdated: '2026-07-28',
    },
    chronicConditions: [
      { name: 'Mild Osteoarthritis', diagnosedDate: '2023-04-10', severity: 'Mild', icd10Code: 'M19.90' }
    ],
    riskSummary: {
      overallRiskScore: 22,
      riskLevel: 'Low',
      hospitalAdmissionRiskPct: 8,
      edVisitRiskPct: 12,
      medicationAdherenceRiskPct: 5,
      lastAssessedDate: '2026-08-11',
      trendDirection: 'stable',
      topDrivers: [
        {
          id: 'drv-09',
          factor: 'Routine Preventive Screening Maintenance',
          category: 'Clinical',
          impactWeight: 0.60,
          description: 'Up-to-date on all primary care checkups, immunizations, and lipid panels.',
          trend: 'stable',
        }
      ],
    },
    riskBreakdown: {
      healthRiskScore: 20,
      utilizationRiskScore: 18,
      sdohRiskScore: 28,
      combinedRiskScore: 22,
    },
    sdohData: {
      countyFips: '17043',
      countyName: 'DuPage County',
      state: 'IL',
      sviScore: 0.18,
      sviTier: 'Low',
      transportationAccessScore: 92,
      transportationNotes: 'High mobility; owns personal vehicle with seamless transit',
      healthcareAccessScore: 88,
      healthcareAccessNotes: 'Abundant primary care & specialist coverage in DuPage County',
      foodAccessScore: 90,
      foodAccessNotes: 'High access to fresh produce and organic food markets',
    },
    utilizationData: {
      hospitalizationsLast12m: 0,
      erVisitsLast12m: 0,
      outpatientVisitsLast12m: 3,
      telehealthVisitsLast12m: 1,
      readmissionCount30d: 0,
    },
    shapDrivers: [
      {
        rank: 1,
        feature: 'Primary Care Wellness Visit Compliance',
        value: 'Complete / Annual',
        shapValue: -0.28,
        category: 'Health',
        description: 'Proactive primary care visits significantly lower acute hospitalization risk.'
      },
      {
        rank: 2,
        feature: 'County SVI Vulnerability Index',
        value: '0.18 (DuPage County, FIPS 17043)',
        shapValue: -0.20,
        category: 'SDOH',
        description: 'Low socio-economic vulnerability score in resident county.'
      }
    ],
    recommendedInterventions: [
      {
        id: 'rec-110',
        title: 'Annual Physical & Immunization Wellness Reminder',
        category: 'Preventive Care',
        priority: 'Standard',
        reason: 'Routine annual preventive health maintenance.'
      }
    ]
  }
];

export const MOCK_INTERVENTIONS: Intervention[] = [
  {
    id: 'int-201',
    memberId: 'mem-101',
    memberName: 'Eleanor Vance',
    memberCode: 'MBR-98241',
    memberRiskLevel: 'High',
    title: 'Urgent Home Health Nurse Vitals & Med Box Setup',
    type: 'Clinical',
    description: 'Dispatch clinical nurse specialist to perform in-person blood pressure check, reconcile cardiac medications, and organize automated pill dispenser.',
    priority: 'Urgent',
    status: 'In Progress',
    assignedTo: 'Elena Rostova, RN',
    dueDate: '2026-08-18',
    createdDate: '2026-08-14',
    actionRequired: 'Complete physical assessment & sync wireless BP cuff with portal.',
    notes: [
      'Nurse contacted daughter to confirm home access code.',
      'Awaiting prescription drop-off from retail pharmacy.'
    ]
  },
  {
    id: 'int-202',
    memberId: 'mem-101',
    memberName: 'Eleanor Vance',
    memberCode: 'MBR-98241',
    memberRiskLevel: 'High',
    title: 'Non-Emergency Medical Transportation Setup (NEMT)',
    type: 'Transportation / SDOH',
    description: 'Coordinate county subsidized transit vouchers and dedicated medical taxi for upcoming cardiology appointment on Aug 24.',
    priority: 'High',
    status: 'Pending',
    assignedTo: 'Elena Rostova, RN',
    dueDate: '2026-08-20',
    createdDate: '2026-08-15',
    actionRequired: 'Verify insurance NEMT benefit authorization and dispatch itinerary.',
  },
  {
    id: 'int-203',
    memberId: 'mem-105',
    memberName: 'Beatrice Sterling',
    memberCode: 'MBR-83194',
    memberRiskLevel: 'Very High',
    title: 'Fall Prevention Home Safety & Physical Therapy Evaluation',
    type: 'Clinical',
    description: 'Assess bathroom grab bars, non-slip flooring, and evaluate mobility aids. Consult with PT for assistive walking device fitting.',
    priority: 'Urgent',
    status: 'In Progress',
    assignedTo: 'Sarah Jenkins, MD',
    dueDate: '2026-08-19',
    createdDate: '2026-08-13',
    actionRequired: 'Review physical therapy order and safety checklist certification.',
  },
  {
    id: 'int-204',
    memberId: 'mem-105',
    memberName: 'Beatrice Sterling',
    memberCode: 'MBR-83194',
    memberRiskLevel: 'Very High',
    title: 'Anticoagulation Therapy & INR Telehealth Protocol',
    type: 'Clinical',
    description: 'Telehealth review of bruising symptoms, diet vitamin K interactions, and confirm lab draw schedule.',
    priority: 'High',
    status: 'Pending',
    assignedTo: 'Sarah Jenkins, MD',
    dueDate: '2026-08-22',
    createdDate: '2026-08-14',
    actionRequired: 'Conduct 20-minute video clinical consult with patient and caregiver.',
  },
  {
    id: 'int-205',
    memberId: 'mem-102',
    memberName: 'Arthur Pendleton',
    memberCode: 'MBR-77319',
    memberRiskLevel: 'High',
    title: 'COPD Action Plan & BiPAP Telemetry Sync Check',
    type: 'Healthcare Access',
    description: 'Confirm adherence to daily dual-bronchodilator regimen and verify continuous pulse oximeter data transfer.',
    priority: 'High',
    status: 'In Progress',
    assignedTo: 'Elena Rostova, RN',
    dueDate: '2026-08-21',
    createdDate: '2026-08-11',
    actionRequired: 'Call patient to troubleshoot Bluetooth sync with pulse oximeter hub.',
  },
  {
    id: 'int-206',
    memberId: 'mem-103',
    memberName: 'Rosa Martinez',
    memberCode: 'MBR-61502',
    memberRiskLevel: 'Medium',
    title: 'Diabetic Retinal & Foot Exam Scheduling Outreach',
    type: 'Preventive Care',
    description: 'Assist member in booking annual dilated eye examination with in-network optometrist and podiatrist.',
    priority: 'Medium',
    status: 'Completed',
    assignedTo: 'Sarah Jenkins, MD',
    dueDate: '2026-08-15',
    createdDate: '2026-08-09',
    completedDate: '2026-08-15',
    actionRequired: 'Appointment confirmed for Sept 3 at Westgate Eye Center.',
    notes: [
      'Member preferred weekend morning slot.',
      'Transportation confirmed with son.'
    ]
  },
  {
    id: 'int-207',
    memberId: 'mem-106',
    memberName: 'Julian Ortiz',
    memberCode: 'MBR-55219',
    memberRiskLevel: 'Medium',
    title: 'Maintenance Inhaler Refill & Usage Coaching',
    type: 'Clinical',
    description: 'Pharmacist tele-consultation to demonstrate spacer technique and enroll in 90-day mail order delivery.',
    priority: 'Standard',
    status: 'Pending',
    assignedTo: 'Elena Rostova, RN',
    dueDate: '2026-08-25',
    createdDate: '2026-08-12',
    actionRequired: 'Send educational video link via SMS and schedule 10-minute check-in.',
  }
];

export const MOCK_POPULATION_METRICS: PopulationMetrics = {
  totalMembers: 1248,
  veryHighRiskCount: 187,
  veryHighRiskPercentage: 15.0,
  highRiskCount: 284,
  highRiskPercentage: 22.8,
  mediumRiskCount: 492,
  mediumRiskPercentage: 39.4,
  lowRiskCount: 285,
  lowRiskPercentage: 22.8,
  activeInterventionsCount: 142,
  pendingInterventionsCount: 68,
  completedInterventionsCount: 412,
  averageRiskScore: 61.2,
  projectedReadmissionReductionPct: 18.5,
};
