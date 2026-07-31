/**
 * Centralized Department Configuration
 * 
 * This is the single source of truth for department definitions.
 * All department-related features should use this configuration.
 * 
 * Usage:
 * - Company signup/seed: Use getDepartmentsForCompany(companyName)
 * - Department synchronization: Use syncCompanyDepartments(companyId, companyName)
 * - Any department initialization: Import from this file
 * 
 * Departments are organized by company type:
 * - Targfit: Full department set (17 departments)
 * - Default: Standard department set (6 departments)
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface DepartmentConfig {
  name: string;
  code: string;
  budget: number;
  description?: string;
}

/**
 * Targfit-specific departments
 * Full department set for Targfit company
 */
const TARGFIT_DEPARTMENTS: DepartmentConfig[] = [
  { name: 'Human Resources', code: 'HR', budget: 90000 },
  { name: 'Finance & Accounts', code: 'FIN', budget: 120000 },
  { name: 'Inventory', code: 'INV', budget: 150000 },
  { name: 'Procurement', code: 'PRC', budget: 100000 },
  { name: 'Sales & CRM', code: 'SLS', budget: 180000 },
  { name: 'Client Servicing', code: 'CS', budget: 80000 },
  { name: 'Client Marketing', code: 'CM', budget: 70000 },
  { name: 'Legal', code: 'LEG', budget: 60000 },
  { name: 'Graphics', code: 'GRX', budget: 50000 },
  { name: 'Administration', code: 'ADM', budget: 110000 },
  { name: 'Operations', code: 'OPS', budget: 200000 },
  { name: 'Logistics', code: 'LOG', budget: 130000 },
  { name: 'IT', code: 'IT', budget: 140000 },
  { name: 'Media', code: 'MED', budget: 75000 },
  { name: 'Internal Control', code: 'IC', budget: 65000 },
  { name: 'Quality Assurance & Quality Control', code: 'QAQC', budget: 85000 },
  { name: 'Manufacturing', code: 'MFG', budget: 250000 },
];

/**
 * Default departments for all other companies
 * Standard department set for non-Targfit companies
 */
const DEFAULT_DEPARTMENTS: DepartmentConfig[] = [
  { name: 'Human Resources', code: 'HR', budget: 90000 },
  { name: 'Finance & Accounts', code: 'FIN', budget: 120000 },
  { name: 'Administration', code: 'ADM', budget: 110000 },
  { name: 'Inventory', code: 'INV', budget: 150000 },
  { name: 'Sales & CRM', code: 'SLS', budget: 180000 },
  { name: 'Quality Assurance & Quality Control', code: 'QAQC', budget: 85000 },
];

/**
 * Get departments for a specific company
 * 
 * @param companyName - The name of the company
 * @returns Array of department configurations for that company
 */
export function getDepartmentsForCompany(companyName?: string): DepartmentConfig[] {
  if (!companyName) {
    return DEFAULT_DEPARTMENTS;
  }

  const isTargfit = companyName.toLowerCase() === 'targfit';
  
  if (isTargfit) {
    return TARGFIT_DEPARTMENTS;
  }
  
  return DEFAULT_DEPARTMENTS;
}

/**
 * Get all available department configurations
 * Useful for admin/debugging purposes
 */
export function getAllDepartmentConfigs(): Record<string, DepartmentConfig[]> {
  return {
    targfit: TARGFIT_DEPARTMENTS,
    default: DEFAULT_DEPARTMENTS,
  };
}

/**
 * Check if a company is Targfit
 */
export function isTargfitCompany(companyName?: string): boolean {
  if (!companyName) return false;
  return companyName.toLowerCase() === 'targfit';
}

/**
 * Synchronize company departments with the centralized configuration
 * 
 * This function ensures that the departments table matches the configuration in lib/departments.ts
 * - Updates existing departments (name, code, budget)
 * - Creates missing departments
 * - Removes departments that are no longer in the configuration
 * 
 * @param companyId - The ID of the company
 * @param companyName - The name of the company (to determine which department set to use)
 * @param branchId - Optional branch ID to assign to new departments (defaults to company's HQ branch)
 * @param forceDelete - If true, will delete departments even if they have assigned employees
 * @returns Object with sync results: { created, updated, deleted, errors }
 */
export async function syncCompanyDepartments(
  companyId: string,
  companyName?: string,
  branchId?: string,
  forceDelete: boolean = false
): Promise<{ created: number; updated: number; deleted: number; errors: string[] }> {
  console.log('[DEPT SYNC] Starting department sync for company:', companyName);
  console.log('[DEPT SYNC] Company ID:', companyId);

  const errors: string[] = [];
  let created = 0;
  let updated = 0;
  let deleted = 0;

  try {
    // Get expected departments from configuration
    const expectedDepts = getDepartmentsForCompany(companyName);
    const expectedDeptNames = new Set(expectedDepts.map(d => d.name));

    // Get existing departments from database
    const { data: existingDepts, error: fetchError } = await supabase
      .from('departments')
      .select('*')
      .eq('company_id', companyId);

    if (fetchError) {
      errors.push(`Failed to fetch existing departments: ${fetchError.message}`);
      return { created, updated, deleted, errors };
    }

    const existingDeptMap = new Map(
      (existingDepts || []).map((d: any) => [d.name, d])
    );
    const existingDeptNames = new Set(existingDeptMap.keys());

    // If no branch ID provided, try to get the company's HQ branch
    if (!branchId) {
      const { data: branches } = await supabase
        .from('branches')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_headquarter', true)
        .limit(1);

      if (branches && branches.length > 0) {
        branchId = branches[0].id;
      }
    }

    // Step 1: Update existing departments and create missing ones
    for (const expectedDept of expectedDepts) {
      const existingDept = existingDeptMap.get(expectedDept.name);

      if (existingDept) {
        // Update existing department
        const { error: updateError } = await supabase
          .from('departments')
          .update({
            code: expectedDept.code,
            budget: expectedDept.budget,
            description: expectedDept.description,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingDept.id);

        if (updateError) {
          errors.push(`Failed to update department "${expectedDept.name}": ${updateError.message}`);
        } else {
          updated++;
          console.log('[DEPT SYNC] Updated department:', expectedDept.name);
        }
      } else {
        // Create missing department
        const { error: createError } = await supabase
          .from('departments')
          .insert({
            company_id: companyId,
            name: expectedDept.name,
            code: expectedDept.code,
            budget: expectedDept.budget,
            description: expectedDept.description,
            branch_id: branchId || null,
            is_active: true,
          });

        if (createError) {
          errors.push(`Failed to create department "${expectedDept.name}": ${createError.message}`);
        } else {
          created++;
          console.log('[DEPT SYNC] Created department:', expectedDept.name);
        }
      }
    }

    // Step 2: Remove departments that are no longer in configuration
    const existingDeptArray = Array.from(existingDeptMap.entries());
    for (const [deptName, dept] of existingDeptArray) {
      if (!expectedDeptNames.has(deptName)) {
        // Check all foreign key references
        const [employees, budgets, purchaseRequests, projects, assets] = await Promise.all([
          supabase.from('employees').select('id').eq('department_id', dept.id).limit(1),
          supabase.from('budgets').select('id').eq('department_id', dept.id).limit(1),
          supabase.from('purchase_requests').select('id').eq('department_id', dept.id).limit(1),
          supabase.from('projects').select('id').eq('department_id', dept.id).limit(1),
          supabase.from('assets').select('id').eq('department_id', dept.id).limit(1),
        ]);

        const hasDependencies = 
          (employees.data && employees.data.length > 0) ||
          (budgets.data && budgets.data.length > 0) ||
          (purchaseRequests.data && purchaseRequests.data.length > 0) ||
          (projects.data && projects.data.length > 0) ||
          (assets.data && assets.data.length > 0);

        if (hasDependencies && !forceDelete) {
          const reasons = [];
          if (employees.data && employees.data.length > 0) reasons.push('assigned employees');
          if (budgets.data && budgets.data.length > 0) reasons.push('associated budgets');
          if (purchaseRequests.data && purchaseRequests.data.length > 0) reasons.push('purchase requests');
          if (projects.data && projects.data.length > 0) reasons.push('projects');
          if (assets.data && assets.data.length > 0) reasons.push('assets');
          errors.push(`Cannot delete department "${deptName}" - it has ${reasons.join(', ')}`);
          console.log('[DEPT SYNC] Skipped deletion of department with dependencies:', deptName);
        } else {
          // If force delete is enabled, clear all foreign key references
          if (forceDelete) {
            console.log('[DEPT SYNC] Force delete: Clearing dependencies for department:', deptName);
            
            await Promise.all([
              // Unassign employees
              employees.data && employees.data.length > 0
                ? supabase.from('employees').update({ department_id: null }).eq('department_id', dept.id)
                : Promise.resolve(),
              // Clear budget references
              budgets.data && budgets.data.length > 0
                ? supabase.from('budgets').update({ department_id: null }).eq('department_id', dept.id)
                : Promise.resolve(),
              // Clear purchase request references
              purchaseRequests.data && purchaseRequests.data.length > 0
                ? supabase.from('purchase_requests').update({ department_id: null }).eq('department_id', dept.id)
                : Promise.resolve(),
              // Clear project references
              projects.data && projects.data.length > 0
                ? supabase.from('projects').update({ department_id: null }).eq('department_id', dept.id)
                : Promise.resolve(),
              // Clear asset references
              assets.data && assets.data.length > 0
                ? supabase.from('assets').update({ department_id: null }).eq('department_id', dept.id)
                : Promise.resolve(),
            ]);
          }

          const { error: deleteError } = await supabase
            .from('departments')
            .delete()
            .eq('id', dept.id);

          if (deleteError) {
            errors.push(`Failed to delete department "${deptName}": ${deleteError.message}`);
          } else {
            deleted++;
            console.log('[DEPT SYNC] Deleted department:', deptName);
          }
        }
      }
    }

    console.log('[DEPT SYNC] Sync complete:', { created, updated, deleted, errors });
  } catch (error: any) {
    errors.push(`Sync failed: ${error.message}`);
    console.error('[DEPT SYNC] Sync error:', error);
  }

  return { created, updated, deleted, errors };
}
