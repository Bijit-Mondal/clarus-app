<script setup lang="ts">
import { PhArrowCounterClockwise, PhClock, PhUser } from '@phosphor-icons/vue'
import { Button } from '@/components/ui/button'
import type { DocumentVersion } from '@/composables/useDocuments'

defineProps<{
  versions: DocumentVersion[]
}>()

const emit = defineEmits<{
  restore: [content: string, versionLabel: string]
}>()
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-border bg-card">
    <div class="border-b border-border bg-muted/20 p-4">
      <h2 class="text-sm font-semibold text-foreground">Version history</h2>
      <p class="text-xs text-muted-foreground">
        Review prior iterations and restore earlier content when needed.
      </p>
    </div>

    <table v-if="versions.length" class="w-full border-collapse text-left text-sm">
      <thead>
        <tr class="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
          <th class="w-[15%] px-5 py-2.5">Version</th>
          <th class="w-[20%] px-5 py-2.5">Published</th>
          <th class="w-[20%] px-5 py-2.5">Author</th>
          <th class="w-[35%] px-5 py-2.5">Changelog</th>
          <th class="w-[10%] px-5 py-2.5 text-right"></th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="v in versions"
          :key="v.version"
          class="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/15"
        >
          <td class="px-5 py-3.5 align-middle font-mono font-semibold text-foreground">
            {{ v.version }}
          </td>
          <td class="px-5 py-3.5 align-middle text-muted-foreground">{{ v.updatedAt }}</td>
          <td class="px-5 py-3.5 align-middle">
            <div class="flex items-center gap-1.5">
              <PhUser :size="13" class="text-muted-foreground" />
              <span>{{ v.owner }}</span>
            </div>
          </td>
          <td class="px-5 py-3.5 align-middle text-xs italic leading-relaxed text-muted-foreground">
            "{{ v.changelog }}"
          </td>
          <td class="px-5 py-3.5 text-right align-middle">
            <Button
              variant="outline"
              size="sm"
              class="gap-1 text-xs"
              @click="emit('restore', v.content, v.version)"
            >
              <PhArrowCounterClockwise :size="13" />
              Restore
            </Button>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-else class="flex flex-col items-center justify-center py-14 text-center">
      <span
        class="mb-3 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground/50"
      >
        <PhClock :size="22" />
      </span>
      <p class="text-sm font-medium text-foreground">No published versions yet</p>
      <p class="mt-1 max-w-[280px] text-xs text-muted-foreground">
        Published versions appear here so you can audit changes over time.
      </p>
    </div>
  </div>
</template>
