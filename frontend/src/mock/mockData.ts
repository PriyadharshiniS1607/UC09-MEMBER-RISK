import { User } from '../types';

export const MOCK_USERS: User[] = [
  {
    id: 'usr-001',
    username: 'swetha_test',
    name: 'Swetha SivaKumar',
    email: 'swetha@healthfirst.org',
    role: 'clinical_analyst',
    hospitalAffiliation: 'Clinical Population Health Operations',
  },
  {
    id: 'usr-002',
    username: 'care_manager_test',
    name: 'Elena Rostova, RN',
    email: 'e.rostova@healthfirst.org',
    role: 'care_manager',
    hospitalAffiliation: 'Care Coordination Network',
  },
  {
    id: 'usr-003',
    username: 'payer_admin_test',
    name: 'Marcus Vance',
    email: 'admin@healthfirst.org',
    role: 'payer_admin',
    hospitalAffiliation: 'Regional Payer Operations HQ',
  },
  {
    id: 'usr-004',
    username: 'payer_viewer_test',
    name: 'David Keller',
    email: 'viewer@healthfirst.org',
    role: 'payer_viewer',
    hospitalAffiliation: 'Payer Advisory & Analytics Board',
  },
];
