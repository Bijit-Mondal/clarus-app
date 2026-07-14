<script setup lang="ts">
import { RouterLink } from 'vue-router'
import ClarusLogo from '@/components/shell/ClarusLogo.vue'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  getModulePagePath,
  primaryModules,
  settingsModule,
  type AppModuleId,
} from '@/config/navigation'
import { cn } from '@/lib/utils'

const props = defineProps<{
  activeModuleId?: string
}>()

function isActive(moduleId: AppModuleId) {
  return props.activeModuleId === moduleId
}

const itemClass = (active: boolean) =>
  cn(
    'group relative flex size-10 items-center justify-center rounded-xl duration-200',
    'transition-[background-color,color,box-shadow,transform] active:scale-95 motion-reduce:active:scale-100',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar',
    active
      ? 'bg-primary/14 text-primary hover:bg-primary/18'
      : 'text-sidebar-foreground/60 hover:bg-sidebar-foreground/[0.06] hover:text-sidebar-foreground',
  )
</script>

<template>
  <nav aria-label="Modules" class="flex w-14 shrink-0 flex-col items-center gap-1 bg-sidebar py-3">
    <RouterLink
      to="/dashboard"
      class="mb-3 flex size-10 items-center justify-center rounded-xl text-sidebar-foreground/70 transition-colors duration-200 hover:bg-sidebar-foreground/[0.06] hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
      aria-label="Clarus home"
    >
      <ClarusLogo :size="22" />
    </RouterLink>

    <div class="flex flex-1 flex-col items-center gap-1">
      <Tooltip v-for="module in primaryModules" :key="module.id">
        <TooltipTrigger as-child>
          <RouterLink
            :to="getModulePagePath(module.id, module.pages[0]!.id)"
            :aria-current="isActive(module.id) ? 'page' : undefined"
            :class="itemClass(isActive(module.id))"
          >
            <span
              v-if="isActive(module.id)"
              aria-hidden="true"
              class="clarus-rail-pill pointer-events-none absolute -left-1.5 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-primary"
            />
            <component
              :is="module.icon"
              :size="22"
              :weight="isActive(module.id) ? 'fill' : 'regular'"
              aria-hidden="true"
            />
            <span class="sr-only">{{ module.label }}</span>
          </RouterLink>
        </TooltipTrigger>
        <TooltipContent side="right" :side-offset="10">
          {{ module.label }}
        </TooltipContent>
      </Tooltip>
    </div>

    <Tooltip>
      <TooltipTrigger as-child>
        <RouterLink
          :to="getModulePagePath(settingsModule.id, settingsModule.pages[0]!.id)"
          :aria-current="isActive(settingsModule.id) ? 'page' : undefined"
          :class="itemClass(isActive(settingsModule.id))"
        >
          <span
            v-if="isActive(settingsModule.id)"
            aria-hidden="true"
            class="clarus-rail-pill pointer-events-none absolute -left-1.5 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-primary"
          />
          <component
            :is="settingsModule.icon"
            :size="22"
            :weight="isActive(settingsModule.id) ? 'fill' : 'regular'"
            aria-hidden="true"
          />
          <span class="sr-only">{{ settingsModule.label }}</span>
        </RouterLink>
      </TooltipTrigger>
      <TooltipContent side="right" :side-offset="10">
        {{ settingsModule.label }}
      </TooltipContent>
    </Tooltip>
  </nav>
</template>
