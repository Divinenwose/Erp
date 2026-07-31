import { NavItem, companyModules, navigationConfig, defaultNavigationConfig } from '@/config/navigation';

/**
 * Get company-specific navigation modules based on company name
 * This helper is shared between signup and login flows to ensure consistency
 * 
 * @param companyName - The company name (case-insensitive)
 * @returns Array of navigation items for the company
 */
export function getCompanyModules(companyName?: string | null): NavItem[] {
  if (!companyName) return [];
  
  const normalizedName = companyName.toLowerCase();
  
  // Check if company has specific modules (e.g., targfit)
  if (normalizedName === 'targfit') {
    return companyModules.targfit || [];
  }
  
  return [];
}

/**
 * Get full navigation config with company-specific modules merged
 * This is the main function to use for building the sidebar
 * 
 * @param companyName - The company name (case-insensitive)
 * @returns Complete navigation configuration for the company
 */
export function getNavigationConfig(companyName?: string | null): NavItem[] {
  if (!companyName) return defaultNavigationConfig;
  
  const normalizedName = companyName.toLowerCase();
  
  // Targfit gets full navigation + company-specific modules
  if (normalizedName === 'targfit') {
    const companySpecificModules = getCompanyModules(companyName);
    return [...navigationConfig, ...companySpecificModules];
  }
  
  // All other companies get default navigation
  return defaultNavigationConfig;
}
