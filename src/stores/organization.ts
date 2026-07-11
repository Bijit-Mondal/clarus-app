import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export type Organization = {
  id: string
  name: string
  slug: string
  /** One or two letters for the avatar fallback */
  initials: string
}

const seedOrgs: Organization[] = [
  {
    id: '1',
    name: 'Acme Inc.',
    slug: 'acme',
    initials: 'AI',
  },
  {
    id: '2',
    name: 'Globex Corporation',
    slug: 'globex',
    initials: 'GC',
  },
]

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
}

export const useOrganizationStore = defineStore('organization', () => {
  const organizations = ref<Organization[]>([...seedOrgs])
  const activeOrgId = ref(seedOrgs[0]!.id)

  const activeOrganization = computed(
    () => organizations.value.find((org) => org.id === activeOrgId.value) ?? organizations.value[0],
  )

  function selectOrganization(id: string) {
    if (!organizations.value.some((org) => org.id === id)) return
    activeOrgId.value = id
  }

  function createOrganization(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return null

    const org: Organization = {
      id: crypto.randomUUID(),
      name: trimmed,
      slug: slugify(trimmed) || 'org',
      initials: initialsFrom(trimmed),
    }

    organizations.value = [...organizations.value, org]
    activeOrgId.value = org.id
    return org
  }

  return {
    organizations,
    activeOrgId,
    activeOrganization,
    selectOrganization,
    createOrganization,
  }
})
