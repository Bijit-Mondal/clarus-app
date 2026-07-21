<script setup lang="ts">
import { PhPlus, PhShieldCheck } from '@phosphor-icons/vue'
import { Button } from '@/components/ui/button'
import ControlsTable from '@/components/compliance/ControlsTable.vue'
import type { TenantControl } from '@/api/controls'

defineProps<{
  controls: TenantControl[]
  isLoading?: boolean
  isError?: boolean
  organizationSlug: string
}>()

const emit = defineEmits<{
  link: []
}>()
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-border bg-card">
    <div class="flex items-center justify-between border-b border-border bg-muted/20 p-4">
      <div>
        <h2 class="text-sm font-semibold text-foreground">Linked controls</h2>
        <p class="text-xs text-muted-foreground">Controls this document supports or evidences.</p>
      </div>
      <Button size="sm" class="gap-1.5" @click="emit('link')">
        <PhPlus :size="14" weight="bold" />
        Link control
      </Button>
    </div>

    <div v-if="isError" class="flex flex-col items-center justify-center px-5 py-14 text-center">
      <PhShieldCheck :size="22" class="mb-3 text-muted-foreground" />
      <p class="text-sm font-medium text-foreground">Couldn’t load controls</p>
      <p class="mt-1 max-w-[300px] text-xs text-muted-foreground">
        Something went wrong fetching linked controls. Try reloading the page.
      </p>
    </div>

    <ControlsTable
      v-else-if="isLoading || controls.length"
      :controls="controls"
      :is-loading="isLoading"
      :organization-slug="organizationSlug"
      :show-actions="false"
    />

    <div v-else class="flex flex-col items-center justify-center px-5 py-14 text-center">
      <PhShieldCheck :size="22" class="mb-3 text-muted-foreground" />
      <p class="text-sm font-medium text-foreground">No controls linked</p>
      <p class="mt-1 max-w-[300px] text-xs text-muted-foreground">
        Search your tenant controls and link the ones supported by this document.
      </p>
      <Button variant="outline" size="sm" class="mt-4 gap-1.5" @click="emit('link')">
        <PhPlus :size="14" weight="bold" />
        Link control
      </Button>
    </div>
  </div>
</template>
