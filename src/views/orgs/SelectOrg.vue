<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { PhPlus, PhCaretRight, PhCheck } from '@phosphor-icons/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import ClarusLogo from '@/components/shell/ClarusLogo.vue'
import { useOrganizationStore } from '@/stores/organization'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api'
import { useCreateTenantMutation, useTenantsQuery } from '@/composables/useTenants'
import { getOrganizationDashboardPath } from '@/config/navigation'

const router = useRouter()
const orgStore = useOrganizationStore()
const { organizations, activeOrganization } = storeToRefs(orgStore)
const tenantsQuery = useTenantsQuery()
const createTenantMutation = useCreateTenantMutation()

void tenantsQuery.loadTenants()

const open = ref(false)
const orgName = ref('')
const submitError = ref('')
const isCreating = computed(() => createTenantMutation.isPending.value)

function selectOrg(orgId: string) {
  orgStore.selectOrganization(orgId)
  const organization = organizations.value.find((org) => org.id === orgId)
  if (organization) router.push(getOrganizationDashboardPath(organization.slug))
}

async function createAndEnter() {
  const name = orgName.value.trim()
  if (!name) return

  submitError.value = ''
  let createdSlug = ''
  try {
    const created = await createTenantMutation.mutateAsync({ name })
    if (!created) throw new Error('The server did not return the created organization.')
    orgStore.selectOrganization(created.id)
    createdSlug = created.slug
  } catch (error: unknown) {
    submitError.value = getApiErrorMessage(
      error,
      'We could not create the organization. Try again.',
    )
    return
  }

  open.value = false
  orgName.value = ''
  router.push(getOrganizationDashboardPath(createdSlug))
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background px-4 py-12">
    <div class="w-full max-w-md">
      <div class="flex flex-col gap-8">
        <div class="flex flex-col items-center gap-4">
          <ClarusLogo :size="48" />
          <div class="flex flex-col gap-1 text-center">
            <h1 class="text-2xl font-semibold tracking-tight text-foreground">
              Select an organization
            </h1>
            <p class="text-pretty text-sm text-muted-foreground">
              Choose an existing organization or create a new one to continue
            </p>
          </div>
        </div>

        <div
          v-if="tenantsQuery.isPending.value"
          class="rounded-lg border border-border bg-card px-4 py-4 text-sm text-muted-foreground"
        >
          Loading your organizations…
        </div>
        <div
          v-else-if="tenantsQuery.isError.value"
          class="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-4 text-sm text-destructive-emphasis"
          role="alert"
        >
          We could not load your organizations.
          <button
            class="ml-1 font-medium underline underline-offset-4"
            type="button"
            @click="tenantsQuery.refetch()"
          >
            Try again
          </button>
        </div>
        <p
          v-else-if="!organizations.length"
          class="rounded-lg border border-border bg-card px-4 py-4 text-sm text-muted-foreground"
        >
          You do not have an organization yet. Create one to continue.
        </p>
        <ul v-else class="flex flex-col gap-2" role="list">
          <li v-for="org in organizations" :key="org.id">
            <button
              type="button"
              :class="
                cn(
                  'group flex w-full items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring',
                  org.id === activeOrganization?.id && 'border-ring bg-muted',
                )
              "
              @click="selectOrg(org.id)"
            >
              <span
                class="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-primary/12 text-xs font-semibold tracking-wide text-primary"
                aria-hidden="true"
              >
                {{ org.initials }}
              </span>
              <span class="flex min-w-0 flex-1 flex-col">
                <span class="truncate text-sm font-medium text-foreground">{{ org.name }}</span>
                <span class="truncate font-mono text-xs text-muted-foreground">{{ org.slug }}</span>
              </span>
              <PhCheck
                v-if="org.id === activeOrganization?.id"
                :size="16"
                weight="bold"
                class="shrink-0 text-primary"
                aria-hidden="true"
              />
              <PhCaretRight
                v-else
                :size="16"
                class="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                aria-hidden="true"
              />
            </button>
          </li>
        </ul>

        <div class="relative flex items-center" role="separator" aria-hidden="true">
          <div class="grow border-t border-border" />
          <span class="shrink-0 px-3 text-xs uppercase tracking-wider text-muted-foreground"
            >or</span
          >
          <div class="grow border-t border-border" />
        </div>

        <Dialog v-model:open="open">
          <DialogTrigger as-child>
            <Button class="w-full" size="default">
              <PhPlus class="mr-2 h-4 w-4" weight="bold" />
              Create organization
            </Button>
          </DialogTrigger>
          <DialogContent class="max-w-md">
            <DialogHeader>
              <DialogTitle>Create organization</DialogTitle>
              <DialogDescription>
                Create a new organization to manage your compliance and security needs.
              </DialogDescription>
            </DialogHeader>
            <form class="flex flex-col gap-2 py-2" @submit.prevent="createAndEnter">
              <Label for="org-name">Organization name</Label>
              <Input id="org-name" v-model="orgName" placeholder="Organization name" />
              <p class="text-pretty text-xs text-muted-foreground">
                The name of your organization as it will appear throughout the platform.
              </p>
              <DialogFooter class="pt-2">
                <p v-if="submitError" class="text-sm text-destructive-emphasis" role="alert">
                  {{ submitError }}
                </p>
                <Button type="submit" class="w-full" :disabled="!orgName.trim() || isCreating">
                  {{ isCreating ? 'Creating…' : 'Create organization' }}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  </div>
</template>
