import type { Component } from 'vue'
import { PhChartLineUp, PhFolderOpen, PhGearSix, PhHouse, PhShieldCheck } from '@phosphor-icons/vue'

export type AppModuleId = 'controls' | 'workspace' | 'analytics' | 'projects' | 'settings'

export type AppPage = {
  id: string
  label: string
  description: string
  /** Not yet available for navigation — rendered as a disabled nav item. */
  disabled?: boolean
}

export type AppModule = {
  id: AppModuleId
  label: string
  icon: Component
  pages: AppPage[]
}

export const appModules: AppModule[] = [
  {
    id: 'controls',
    label: 'Controls',
    icon: PhShieldCheck,
    pages: [
      {
        id: 'overview',
        label: 'Overview',
        description:
          'Track control readiness across every framework, and find what needs attention before your next review.',
      },
      {
        id: 'frameworks',
        label: 'Frameworks',
        description: 'SOC 2, ISO 27001, and GDPR — scope, progress, and requirement coverage.',
      },
      {
        id: 'evidence',
        label: 'Evidence',
        description: 'Collected evidence, freshness, and what needs to be renewed.',
      },
      {
        id: 'findings',
        label: 'Findings',
        description: 'Open gaps and exceptions raised during testing and audits.',
      },
      {
        id: 'reviews',
        label: 'Reviews',
        description: 'Upcoming and completed control reviews with their owners.',
      },
    ],
  },
  {
    id: 'workspace',
    label: 'Workspace',
    icon: PhHouse,
    pages: [
      {
        id: 'overview',
        label: 'Overview',
        description:
          'Your workspace at a glance — recent activity, pinned items, and quick actions.',
      },
      {
        id: 'activity',
        label: 'Activity',
        description: 'A chronological feed of changes across your workspace.',
      },
      {
        id: 'team',
        label: 'Team',
        description: 'Members, roles, and invitations for this workspace.',
      },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: PhChartLineUp,
    pages: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        description: 'Key metrics and trends for the current reporting period.',
      },
      {
        id: 'reports',
        label: 'Reports',
        description: 'Saved and scheduled reports you can share with stakeholders.',
      },
      {
        id: 'metrics',
        label: 'Metrics',
        description: 'Define and track custom metrics across your data sources.',
      },
    ],
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: PhFolderOpen,
    pages: [
      {
        id: 'all',
        label: 'All projects',
        description: 'Every project in this workspace, filterable by status and owner.',
      },
      {
        id: 'active',
        label: 'Active',
        description: 'Projects currently in progress with upcoming milestones.',
      },
      {
        id: 'archived',
        label: 'Archived',
        description: 'Completed or paused projects kept for reference.',
      },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: PhGearSix,
    pages: [
      {
        id: 'profile',
        label: 'Profile',
        description: 'Your name, avatar, and contact preferences.',
      },
      {
        id: 'billing',
        label: 'Billing',
        description: 'Plan, payment method, and invoice history.',
      },
      {
        id: 'integrations',
        label: 'Integrations',
        description: 'Connect external tools and manage API access.',
        disabled: true,
      },
    ],
  },
]

export const primaryModules = appModules.filter((m) => m.id !== 'settings')
export const settingsModule = appModules.find((m) => m.id === 'settings')!

export function getModuleById(id: string): AppModule | undefined {
  return appModules.find((m) => m.id === id)
}

export function getPageRouteName(moduleId: AppModuleId, pageId: string): string {
  return `${moduleId}-${pageId}`
}

export function getOrganizationPath(organizationSlug: string, path = '/dashboard'): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `/${encodeURIComponent(organizationSlug)}${normalizedPath}`
}

export function getOrganizationDashboardPath(organizationSlug: string): string {
  return getOrganizationPath(organizationSlug)
}

export function getModulePagePath(
  moduleId: AppModuleId,
  pageId: string,
  organizationSlug?: string,
): string {
  const path = `/dashboard/${moduleId}/${pageId}`
  return organizationSlug ? getOrganizationPath(organizationSlug, path) : path
}

export function scopeDashboardPath(organizationSlug: string | undefined, path: string): string {
  if (!organizationSlug || !path.startsWith('/dashboard')) return path
  return getOrganizationPath(organizationSlug, path)
}

export function resolveModulePage(moduleId: string, pageId: string) {
  const module = getModuleById(moduleId)
  const page = module?.pages.find((p) => p.id === pageId)
  return { module, page }
}
