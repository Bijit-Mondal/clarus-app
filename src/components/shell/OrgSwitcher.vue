<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PhCaretDown, PhCheck, PhPlus } from '@phosphor-icons/vue'
import { storeToRefs } from 'pinia'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useOrganizationStore } from '@/stores/organization'
import { cn } from '@/lib/utils'
import { getOrganizationPath } from '@/config/navigation'
import { useTenantsQuery } from '@/composables/useTenants'

const orgStore = useOrganizationStore()
const { organizations, activeOrganization } = storeToRefs(orgStore)
const route = useRoute()
const router = useRouter()
const tenantsQuery = useTenantsQuery()

const open = ref(false)
const mode = ref<'list' | 'create'>('list')
const orgName = ref('')
const nameInputId = 'org-switcher-name'

const canCreate = computed(() => orgName.value.trim().length > 0)

watch(open, (isOpen) => {
  if (isOpen) void tenantsQuery.loadTenants()
  if (!isOpen) {
    mode.value = 'list'
    orgName.value = ''
  }
})

watch(mode, async (next) => {
  if (next === 'create') {
    await nextTick()
    document.getElementById(nameInputId)?.focus()
  }
})

function selectOrg(id: string) {
  orgStore.selectOrganization(id)
  const organization = organizations.value.find((candidate) => candidate.id === id)
  if (organization) {
    const currentSlug = route.params.organizationSlug
    const currentPath =
      typeof currentSlug === 'string' && route.path.startsWith(`/${currentSlug}`)
        ? route.path.slice(currentSlug.length + 1)
        : '/dashboard'
    router.push(getOrganizationPath(organization.slug, currentPath))
  }
  open.value = false
}

function startCreate() {
  mode.value = 'create'
}

function backToList() {
  mode.value = 'list'
  orgName.value = ''
}

function createOrg() {
  if (!canCreate.value) return
  orgStore.createOrganization(orgName.value)
  open.value = false
}
</script>

<template>
  <Dialog v-model:open="open">
    <button
      type="button"
      class="group flex min-w-0 max-w-[220px] items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      :aria-label="`Switch organization. Current: ${activeOrganization?.name ?? 'None'}`"
      aria-haspopup="dialog"
      :aria-expanded="open"
      @click="open = true"
    >
      <Avatar class="size-6 rounded-md">
        <AvatarFallback
          class="rounded-md bg-primary/12 text-[10px] font-semibold tracking-wide text-primary"
        >
          {{ activeOrganization?.initials }}
        </AvatarFallback>
      </Avatar>
      <span
        class="min-w-0 max-w-[9rem] flex-1 truncate text-sm font-medium text-foreground sm:max-w-[12rem]"
      >
        {{ activeOrganization?.name }}
      </span>
      <PhCaretDown
        :size="12"
        weight="bold"
        class="shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
        aria-hidden="true"
      />
    </button>

    <DialogContent
      class="gap-0 overflow-hidden p-0 sm:max-w-md"
      :show-close-button="mode === 'list'"
    >
      <template v-if="mode === 'list'">
        <DialogHeader class="gap-1 border-b border-border px-6 py-5 text-left">
          <DialogTitle>Switch organization</DialogTitle>
          <DialogDescription>
            Choose where you work, or create a new organization.
          </DialogDescription>
        </DialogHeader>

        <ul class="flex max-h-[min(360px,50vh)] flex-col gap-1 overflow-y-auto p-3" role="list">
          <li v-for="org in organizations" :key="org.id">
            <button
              type="button"
              :class="
                cn(
                  'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                  'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  org.id === activeOrganization?.id && 'bg-muted',
                )
              "
              :aria-current="org.id === activeOrganization?.id ? 'true' : undefined"
              @click="selectOrg(org.id)"
            >
              <Avatar class="size-9 rounded-lg">
                <AvatarFallback
                  class="rounded-lg bg-primary/12 text-xs font-semibold tracking-wide text-primary"
                >
                  {{ org.initials }}
                </AvatarFallback>
              </Avatar>
              <span class="flex min-w-0 flex-1 flex-col">
                <span class="truncate text-sm font-medium text-foreground">{{ org.name }}</span>
                <span class="truncate font-mono text-xs text-muted-foreground">{{ org.slug }}</span>
              </span>
              <PhCheck
                v-if="org.id === activeOrganization?.id"
                :size="18"
                weight="bold"
                class="shrink-0 text-primary"
                aria-hidden="true"
              />
            </button>
          </li>
        </ul>

        <div class="border-t border-border p-3">
          <Button variant="outline" class="w-full justify-start" @click="startCreate">
            <PhPlus :size="16" weight="bold" aria-hidden="true" />
            Create organization
          </Button>
        </div>
      </template>

      <template v-else>
        <DialogHeader class="gap-1 border-b border-border px-6 py-5 text-left">
          <DialogTitle>Create organization</DialogTitle>
          <DialogDescription>
            Name the organization as it should appear across Clarus.
          </DialogDescription>
        </DialogHeader>

        <form class="flex flex-col gap-4 px-6 py-5" @submit.prevent="createOrg">
          <div class="flex flex-col gap-2">
            <Label :for="nameInputId">Organization name</Label>
            <Input
              :id="nameInputId"
              v-model="orgName"
              placeholder="e.g. Northwind Security"
              autocomplete="organization"
            />
          </div>
          <DialogFooter class="gap-2 sm:justify-between">
            <Button type="button" variant="ghost" @click="backToList"> Back </Button>
            <Button type="submit" :disabled="!canCreate"> Create organization </Button>
          </DialogFooter>
        </form>
      </template>
    </DialogContent>
  </Dialog>
</template>
