<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import {
  PhCheck,
  PhPencilSimple,
  PhX,
  PhWarning,
  PhShieldWarning,
  PhCircleNotch,
} from '@phosphor-icons/vue'
import PageHeader from '@/components/shell/PageHeader.vue'
import { Button } from '@/components/ui/button'
import {
  useTenantContextsQuery,
  useUpdateTenantContextMutation,
} from '@/composables/useTenantContexts'
import ContextEditor from '@/components/workspace/ContextEditor.vue'
import ContextViewer from '@/components/workspace/ContextViewer.vue'

type ContextSectionId = 'product' | 'architecture' | 'team' | 'processes' | 'customers'

type ContextSectionDef = {
  id: ContextSectionId
  title: string
  description: string
  placeholder: string
}

const SECTIONS: ContextSectionDef[] = [
  {
    id: 'product',
    title: 'Product',
    description: 'Describe what your product does, its main features, and value proposition.',
    placeholder: 'Describe your product…',
  },
  {
    id: 'architecture',
    title: 'Architecture',
    description: 'Describe your technical architecture, infrastructure, and key design decisions.',
    placeholder: 'Describe your architecture…',
  },
  {
    id: 'team',
    title: 'Team',
    description: 'Describe your team structure, roles, and responsibilities.',
    placeholder: 'Describe your team…',
  },
  {
    id: 'processes',
    title: 'Processes',
    description: 'Describe your key processes, workflows, and operational procedures.',
    placeholder: 'Describe your processes…',
  },
  {
    id: 'customers',
    title: 'Customers',
    description: 'Describe your target market, customer segments, and use cases.',
    placeholder: 'Describe your customers…',
  },
]

const { data: contextData, isLoading, isError, error, refetch } = useTenantContextsQuery()
const updateMutation = useUpdateTenantContextMutation()

const contextsMap = computed(() => {
  const map: Record<string, { content: string; empty: boolean }> = {}
  if (contextData.value?.contexts) {
    for (const ctx of contextData.value.contexts) {
      map[ctx.section] = ctx
    }
  }
  return map
})

const drafts = reactive<Record<ContextSectionId, string>>({
  product: '',
  architecture: '',
  team: '',
  processes: '',
  customers: '',
})

const editing = reactive<Record<ContextSectionId, boolean>>({
  product: false,
  architecture: false,
  team: false,
  processes: false,
  customers: false,
})

const savingSectionId = ref<ContextSectionId | null>(null)

function startEdit(id: ContextSectionId) {
  const currentContent = contextsMap.value[id]?.content || '{"type":"doc","content":[]}'
  drafts[id] = currentContent
  editing[id] = true
}

function cancelEdit(id: ContextSectionId) {
  editing[id] = false
  drafts[id] = ''
}

async function saveEdit(id: ContextSectionId) {
  savingSectionId.value = id
  try {
    await updateMutation.mutateAsync({
      section: id,
      content: drafts[id],
    })
    editing[id] = false
    drafts[id] = ''
  } catch (err) {
    console.error('Failed to save context:', err)
  } finally {
    savingSectionId.value = null
  }
}
</script>

<template>
  <article class="space-y-6">
    <PageHeader />

    <!-- Loading state -->
    <div v-if="isLoading" class="flex flex-col gap-4">
      <div
        v-for="section in SECTIONS"
        :key="section.id"
        class="rounded-lg border border-border bg-card p-5 sm:p-6 animate-pulse"
      >
        <div class="h-5 w-32 bg-muted rounded mb-2"></div>
        <div class="h-4 w-2/3 bg-muted rounded mb-6"></div>
        <div class="h-20 bg-muted rounded"></div>
      </div>
    </div>

    <!-- Error state -->
    <div
      v-else-if="isError"
      class="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center"
    >
      <PhShieldWarning :size="32" class="mx-auto text-destructive mb-3" />
      <h3 class="text-sm font-semibold text-foreground">Failed to load workspace context</h3>
      <p class="text-xs text-muted-foreground mt-1 mb-4">
        {{
          error instanceof Error ? error.message : 'Check your network connection and try again.'
        }}
      </p>
      <Button size="sm" variant="outline" @click="refetch"> Try again </Button>
    </div>

    <!-- Loaded list of sections -->
    <div v-else class="flex flex-col gap-4">
      <section
        v-for="section in SECTIONS"
        :key="section.id"
        class="rounded-lg border border-border bg-card p-5 sm:p-6"
        :aria-labelledby="`context-${section.id}-title`"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <h2
              :id="`context-${section.id}-title`"
              class="text-base font-semibold tracking-tight text-foreground text-balance"
            >
              {{ section.title }}
            </h2>
            <p class="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
              {{ section.description }}
            </p>
          </div>

          <Button
            v-if="!editing[section.id]"
            variant="outline"
            size="sm"
            class="shrink-0"
            :aria-label="`Edit ${section.title}`"
            @click="startEdit(section.id)"
          >
            <PhPencilSimple :size="14" weight="bold" aria-hidden="true" />
            Edit
          </Button>
        </div>

        <!-- Edit state -->
        <div v-if="editing[section.id]" class="mt-4 space-y-4">
          <ContextEditor
            :id="`context-${section.id}-editor`"
            v-model="drafts[section.id]"
            :placeholder="section.placeholder"
            :editable="savingSectionId !== section.id"
          />
          <div class="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              :disabled="savingSectionId === section.id"
              @click="cancelEdit(section.id)"
            >
              <PhX :size="14" weight="bold" aria-hidden="true" />
              Cancel
            </Button>
            <Button
              size="sm"
              :disabled="savingSectionId === section.id"
              @click="saveEdit(section.id)"
            >
              <PhCircleNotch
                v-if="savingSectionId === section.id"
                :size="14"
                weight="bold"
                class="animate-spin mr-1.5"
                aria-hidden="true"
              />
              <PhCheck v-else :size="14" weight="bold" aria-hidden="true" />
              Save
            </Button>
          </div>
        </div>

        <!-- View state -->
        <div v-else class="mt-4">
          <ContextViewer
            v-if="contextsMap[section.id] && !contextsMap[section.id].empty"
            :value="contextsMap[section.id].content"
          />
          <p v-else class="text-sm italic text-muted-foreground flex items-center gap-1.5 py-1">
            <PhWarning :size="14" class="opacity-60" aria-hidden="true" />
            No content yet. Click Edit to add one.
          </p>
        </div>
      </section>
    </div>
  </article>
</template>
