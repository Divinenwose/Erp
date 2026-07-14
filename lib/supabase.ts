import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      companies: { Row: Company; Insert: Omit<Company, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Company> };
      profiles: { Row: Profile; Insert: Omit<Profile, 'created_at' | 'updated_at'>; Update: Partial<Profile> };
      employees: { Row: Employee; Insert: Omit<Employee, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Employee> };
      departments: { Row: Department; Insert: Omit<Department, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Department> };
      branches: { Row: Branch; Insert: Omit<Branch, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Branch> };
    };
  };
};

export interface Company {
  id: string;
  name: string;
  slug: string;
  industry?: string;
  size?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  currency: string;
  timezone: string;
  logo_url?: string;
  subscription_plan: string;
  subscription_status: string;
  trial_ends_at?: string;
  max_users: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  company_id?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  job_title?: string;
  department_id?: string;
  branch_id?: string;
  role: string;
  is_active: boolean;
  last_seen_at?: string;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  company_id: string;
  user_id?: string;
  employee_number?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  department_id?: string;
  branch_id?: string;
  job_title?: string;
  employment_type: string;
  employment_status: string;
  hire_date?: string;
  manager_id?: string;
  salary?: number;
  salary_currency: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  company_id: string;
  branch_id?: string;
  name: string;
  code?: string;
  description?: string;
  parent_id?: string;
  head_id?: string;
  budget: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  company_id: string;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
  is_headquarter: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
