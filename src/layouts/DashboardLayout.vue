<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import ModuleRail from '@/components/shell/ModuleRail.vue'
import ModuleSidebar from '@/components/shell/ModuleSidebar.vue'
import AppTopBar from '@/components/shell/AppTopBar.vue'
import ClarusAiPanel from '@/components/shell/ClarusAiPanel.vue'
import { getModuleById } from '@/config/navigation'

const route = useRoute()

const activeModuleId = computed(() => route.meta.module as string | undefined)
const activeModule = computed(() =>
  activeModuleId.value ? getModuleById(activeModuleId.value) : undefined,
)
</script>

<template>
  <TooltipProvider :delay-duration="300">
    <div class="flex h-svh min-h-0 bg-background text-foreground">
      <div class="flex shrink-0 border-r border-sidebar-border">
        <ModuleRail :active-module-id="activeModuleId" />

        <ModuleSidebar
          v-if="activeModule"
          :module="activeModule"
          :active-page-id="route.meta.page as string | undefined"
        />
      </div>

      <div class="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        <AppTopBar />

        <div class="flex min-h-0 min-w-0 flex-1">
          <main id="main-content" class="min-h-0 min-w-0 flex-1 overflow-y-auto">
            <div class="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10">
              <RouterView v-slot="{ Component: PageComponent }">
                <Transition
                  enter-active-class="transition-opacity duration-200 ease-out motion-reduce:transition-none"
                  enter-from-class="opacity-0"
                  leave-active-class="transition-opacity duration-150 ease-out motion-reduce:transition-none"
                  leave-to-class="opacity-0"
                  mode="out-in"
                >
                  <component :is="PageComponent" :key="route.fullPath" />
                </Transition>
              </RouterView>
            </div>
          </main>

          <ClarusAiPanel />
        </div>
      </div>
    </div>
  </TooltipProvider>
</template>
