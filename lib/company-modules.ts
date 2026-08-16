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

/**
 * A single Administration section, discovered from config/navigation.ts
 * rather than hand-maintained anywhere else.
 */
export interface AdministrationSection {
  title: string;
  href: string;
  icon?: NavItem['icon'];
  permission?: string;
}

/**
 * Discovers every Administration section directly from the existing
 * navigation configuration — the same data Sidebar.tsx renders from — so
 * there is exactly one source of truth for "what sections does the
 * Administration module have". Each section is represented by its first
 * child's href (typically an "Overview" page), since the group node itself
 * has no route of its own.
 *
 * This intentionally does not know or care about specific section names;
 * adding, renaming, or removing an Administration entry in
 * config/navigation.ts is automatically reflected here with no further
 * code change.
 *
 * @param companyName - The company name (case-insensitive), used the same
 *   way getNavigationConfig() uses it to pick the right nav tree.
 */
export function getAdministrationSections(companyName?: string | null): AdministrationSection[] {
  const config = getNavigationConfig(companyName);
  const adminGroup = config.find(item => item.module === 'admin');
  if (!adminGroup?.children) return [];

  return adminGroup.children
    .filter(section => section.children && section.children.length > 0 && section.children[0].href)
    .map(section => ({
      title: section.title,
      href: section.children![0].href!,
      icon: section.icon,
      permission: section.permission,
    }));
}
