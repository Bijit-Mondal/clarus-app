<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { PhLockSimple } from '@phosphor-icons/vue'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getModulePagePath, type AppModule } from '@/config/navigation'
import { useSidebar } from '@/composables/useSidebar'
import { cn } from '@/lib/utils'

defineProps<{
  module: AppModule
  activePageId?: string
}>()

const { collapsed } = useSidebar()
</script>

<template>
  <aside
    :aria-label="`${module.label} navigation`"
    :aria-hidden="collapsed"
    :inert="collapsed"
    :class="
      cn(
        'hidden shrink-0 overflow-hidden bg-sidebar md:block',
        'transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
        collapsed ? 'w-0' : 'w-64',
      )
    "
  >
    <div class="flex h-full w-64 flex-col">
      <div class="flex h-14 shrink-0 items-center gap-2.5 px-4">
        <component
          :is="module.icon"
          :size="19"
          weight="fill"
          class="shrink-0 text-primary"
          aria-hidden="true"
        />
        <h2
          class="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-sidebar-foreground"
        >
          {{ module.label }}
        </h2>
      </div>

      <ScrollArea class="min-h-0 flex-1 px-3 pb-4">
        <p class="px-3 pb-2 pt-1 text-xs font-medium text-sidebar-foreground/55">Pages</p>
        <ul class="flex flex-col gap-0.5" role="list">
          <li v-for="page in module.pages" :key="page.id">
            <span
              v-if="page.disabled"
              class="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2 text-sm text-sidebar-foreground/35"
              aria-disabled="true"
            >
              <span class="truncate">{{ page.label }}</span>
              <span
                class="flex items-center gap-1 text-[0.6875rem] font-medium uppercase tracking-wide"
              >
                <PhLockSimple :size="12" aria-hidden="true" />
                Soon
              </span>
            </span>
            <RouterLink
              v-else
              :to="getModulePagePath(module.id, page.id)"
              :aria-current="activePageId === page.id ? 'page' : undefined"
              :class="
                cn(
                  'flex items-center rounded-lg px-3 py-2 text-sm transition-colors duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  activePageId === page.id
                    ? 'bg-card font-medium text-foreground shadow-2xs'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-foreground/[0.06] hover:text-sidebar-foreground',
                )
              "
            >
              <span class="truncate">{{ page.label }}</span>
            </RouterLink>
          </li>
        </ul>
      </ScrollArea>
    </div>
  </aside>
</template>
