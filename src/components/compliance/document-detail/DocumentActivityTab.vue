<script setup lang="ts">
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getUserInitials } from '@/lib/documentDisplay'
import type { DocumentActivity } from '@/composables/useDocuments'

defineProps<{
  activity: DocumentActivity[]
}>()
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-border bg-card">
    <div class="border-b border-border bg-muted/20 p-4">
      <h2 class="text-sm font-semibold text-foreground">Activity</h2>
      <p class="text-xs text-muted-foreground">A chronological log of changes to this document.</p>
    </div>

    <div v-if="activity.length" class="divide-y divide-border/50 px-5">
      <div
        v-for="act in activity"
        :key="act.id"
        class="flex items-start justify-between gap-4 py-3.5"
      >
        <div class="flex min-w-0 items-start gap-3">
          <Avatar class="size-7 shrink-0">
            <AvatarFallback
              class="bg-secondary text-[10px] font-semibold text-secondary-foreground"
            >
              {{ getUserInitials(act.user) }}
            </AvatarFallback>
          </Avatar>
          <div class="min-w-0">
            <p class="text-sm text-foreground">
              <span class="font-semibold">{{ act.user }}</span>
              <span class="text-muted-foreground"> {{ act.action }}</span>
            </p>
          </div>
        </div>
        <span class="shrink-0 text-xs text-muted-foreground">{{ act.timestamp }}</span>
      </div>
    </div>
    <div v-else class="py-14 text-center text-sm text-muted-foreground">
      No activity recorded yet.
    </div>
  </div>
</template>
