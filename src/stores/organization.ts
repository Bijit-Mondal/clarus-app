import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Tenant } from '@/api/tenants'

export type Organization = {
  id: string
  name: string
  slug: string
  /** One or two letters for the avatar fallback */
  initials: string
}

const activeOrganizationStorageKey = 'clarus.active-organization-id'

function getStoredOrganizationId() {
  if (typeof window === 'undefined') return undefined

  try {
    return window.localStorage.getItem(activeOrganizationStorageKey) ?? undefined
  } catch {
    return undefined
  }
}

function storeOrganizationId(id: string | undefined) {
  if (typeof window === 'undefined') return

  try {
    if (id) window.localStorage.setItem(activeOrganizationStorageKey, id)
    else window.localStorage.removeItem(activeOrganizationStorageKey)
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

export const useOrganizationStore = defineStore('organization', () => {
  const organizations = ref<Organization[]>([])
  const activeOrgId = ref<string | undefined>(getStoredOrganizationId())

  const activeOrganization = computed(
    () => organizations.value.find((org) => org.id === activeOrgId.value) ?? organizations.value[0],
  )

  function setOrganizations(nextOrganizations: Organization[]) {
    const selectedId = activeOrgId.value
    organizations.value = [...nextOrganizations]
    activeOrgId.value = nextOrganizations.some((org) => org.id === selectedId)
      ? selectedId
      : nextOrganizations[0]?.id
    storeOrganizationId(activeOrgId.value)
  }

  function addOrganization(organization: Tenant) {
    const nextOrganizations = organizations.value.some((org) => org.id === organization.id)
      ? organizations.value
      : [...organizations.value, organization]
    setOrganizations(nextOrganizations)
    activeOrgId.value = organization.id
    storeOrganizationId(activeOrgId.value)
  }

  function selectOrganization(id: string) {
    if (!organizations.value.some((org) => org.id === id)) return
    activeOrgId.value = id
    storeOrganizationId(id)
  }

  return {
    organizations,
    activeOrgId,
    activeOrganization,
    setOrganizations,
    addOrganization,
    selectOrganization,
  }
})
