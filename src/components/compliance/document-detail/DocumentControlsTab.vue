<script setup lang="ts">
import { PhPlus, PhShieldCheck, PhTrash } from '@phosphor-icons/vue'
import { Button } from '@/components/ui/button'
import type { DocumentControlLink } from '@/composables/useDocuments'

defineProps<{
  linkedControls: DocumentControlLink[]
  orgSlug: string
}>()

const emit = defineEmits<{
  link: []
  unlink: [tenantControlId: string]
}>()
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-border bg-card">
    <div class="flex items-center justify-between border-b border-border bg-muted/20 p-4">
      <div>
        <h2 class="text-sm font-semibold text-foreground">Linked controls</h2>
        <p class="text-xs text-muted-foreground">Connect this document to tenant controls.</p>
      </div>
      <Button size="sm" class="gap-1.5" @click="emit('link')">
        <PhPlus :size="14" weight="bold" />
        Link control
      </Button>
    </div>

    <table v-if="linkedControls.length" class="w-full border-collapse text-left text-sm">
      <thead>
        <tr class="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
          <th class="w-[22%] px-5 py-2.5">Control ID</th>
          <th class="px-5 py-2.5">Control name</th>
          <th class="w-[20%] px-5 py-2.5">Status</th>
          <th class="w-12 px-5 py-2.5"><span class="sr-only">Actions</span></th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="control in linkedControls"
          :key="control.tenantControlId"
          class="border-b border-border/50 last:border-0"
        >
          <td class="px-5 py-3.5 font-mono text-xs font-semibold text-foreground">
            {{ control.controlKey }}
          </td>
          <td class="px-5 py-3.5">
            <router-link
              :to="{
                name: 'compliance-control-detail',
                params: { organizationSlug: orgSlug, controlId: control.controlKey },
              }"
              class="font-medium text-foreground hover:text-primary hover:underline"
            >
              {{ control.name }}
            </router-link>
          </td>
          <td class="px-5 py-3.5 text-xs capitalize text-muted-foreground">
            {{ control.implementationStatus.replace(/_/g, ' ') }}
          </td>
          <td class="px-5 py-3.5 text-right">
            <Button
              variant="ghost"
              size="icon-sm"
              class="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              :aria-label="`Unlink ${control.controlKey}`"
              @click="emit('unlink', control.tenantControlId)"
            >
              <PhTrash :size="14" />
            </Button>
          </td>
        </tr>
      </tbody>
    </table>

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
