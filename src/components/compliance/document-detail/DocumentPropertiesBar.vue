<script setup lang="ts">
import { computed } from 'vue'
import { PhClock, PhShieldCheck, PhSliders, PhUploadSimple, PhUser } from '@phosphor-icons/vue'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getClassificationLabel, type DocumentItem } from '@/composables/useDocuments'
import { getCategoryDisplayLabel, getUserInitials } from '@/lib/documentDisplay'

const props = defineProps<{
  document: DocumentItem
}>()

const publishedVersionLabel = computed(() => {
  const published = props.document.currentPublishedVersion
  return published ? published : 'Not published'
})

const visibleApprovers = computed(() => props.document.approvers.slice(0, 3))

const approverSummary = computed(() => {
  const list = props.document.approvers
  if (list.length === 0) return ''
  if (list.length <= 2) return list.join(', ')
  return `${list[0]}, ${list[1]} +${list.length - 2}`
})
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border/60 bg-muted/30 px-3.5 py-2.5 text-xs text-muted-foreground"
    aria-label="Document properties"
  >
    <div class="inline-flex items-center gap-1.5">
      <PhSliders :size="14" class="text-success/85" />
      <span class="text-muted-foreground">Type:</span>
      <span class="font-semibold capitalize text-foreground">{{
        getCategoryDisplayLabel(document.category)
      }}</span>
    </div>

    <span class="select-none text-muted-foreground/35" aria-hidden="true">&bull;</span>

    <div class="inline-flex items-center gap-1.5">
      <PhShieldCheck :size="14" class="text-info/80" />
      <span class="text-muted-foreground">Classification:</span>
      <span class="font-semibold text-foreground">{{
        getClassificationLabel(document.classification)
      }}</span>
    </div>

    <span class="select-none text-muted-foreground/35" aria-hidden="true">&bull;</span>

    <div class="inline-flex items-center gap-1.5">
      <PhUser :size="14" class="text-primary/70" />
      <span class="text-muted-foreground">Approvers:</span>
      <span
        v-if="document.approvers.length"
        class="inline-flex items-center gap-1.5 font-medium text-foreground"
      >
        <span class="flex -space-x-1.5" aria-hidden="true">
          <Avatar
            v-for="approver in visibleApprovers"
            :key="approver"
            class="size-4 ring-2 ring-card"
          >
            <AvatarFallback class="text-[8px] font-bold">{{
              getUserInitials(approver)
            }}</AvatarFallback>
          </Avatar>
        </span>
        {{ approverSummary }}
      </span>
      <span v-else class="italic text-muted-foreground">None assigned</span>
    </div>

    <span class="select-none text-muted-foreground/35" aria-hidden="true">&bull;</span>

    <div class="inline-flex items-center gap-1.5">
      <PhUploadSimple :size="14" class="text-success/85" />
      <span class="text-muted-foreground">Published:</span>
      <span
        class="font-semibold"
        :class="
          document.currentPublishedVersion ? 'text-foreground' : 'italic text-muted-foreground'
        "
      >
        {{ publishedVersionLabel }}
      </span>
    </div>

    <span class="select-none text-muted-foreground/35" aria-hidden="true">&bull;</span>

    <div class="inline-flex items-center gap-1.5">
      <PhClock :size="14" class="text-warning-emphasis/80" />
      <span class="text-muted-foreground">Updated:</span>
      <span class="font-medium text-foreground">{{ document.updatedAt }}</span>
    </div>
  </div>
</template>
