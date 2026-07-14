<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PhCaretDown } from '@phosphor-icons/vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getModuleById, getModulePagePath } from '@/config/navigation'

const route = useRoute()
const router = useRouter()

const module = computed(() => {
  const moduleId = route.meta.module as string | undefined
  return moduleId ? getModuleById(moduleId) : undefined
})

const activePageId = computed(() => route.meta.page as string | undefined)
const activePageLabel = computed(
  () => module.value?.pages.find((p) => p.id === activePageId.value)?.label,
)
const organizationSlug = computed(() =>
  typeof route.params.organizationSlug === 'string' ? route.params.organizationSlug : undefined,
)

function goToPage(pageId: string) {
  if (!module.value) return
  router.push(getModulePagePath(module.value.id, pageId, organizationSlug.value))
}
</script>

<template>
  <DropdownMenu v-if="module">
    <DropdownMenuTrigger as-child>
      <Button
        variant="outline"
        size="sm"
        class="md:hidden"
        :aria-label="`Switch page in ${module.label}`"
      >
        <span class="max-w-[140px] truncate">{{ activePageLabel }}</span>
        <PhCaretDown :size="14" class="ml-1 opacity-60" aria-hidden="true" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="w-48">
      <DropdownMenuItem
        v-for="page in module.pages"
        :key="page.id"
        :class="activePageId === page.id ? 'bg-accent' : ''"
        @select="goToPage(page.id)"
      >
        {{ page.label }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
