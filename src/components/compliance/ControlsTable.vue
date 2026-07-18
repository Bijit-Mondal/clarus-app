<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  PhArrowDown,
  PhArrowUp,
  PhDotsThreeOutline,
  PhEye,
  PhPencilSimple,
  PhTrash,
} from '@phosphor-icons/vue'
import ControlStatusBadge from '@/components/compliance/ControlStatusBadge.vue'
import ClarusLoadingState from '@/components/feedback/ClarusLoadingState.vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import type { TenantControl } from '@/api/controls'
import type { ControlStatus } from '@/data/controls'

const props = withDefaults(
  defineProps<{
    controls: TenantControl[]
    isLoading?: boolean
    showActions?: boolean
    organizationSlug: string
    sortKey?: string
    sortDir?: 'asc' | 'desc'
  }>(),
  {
    isLoading: false,
    showActions: false,
    sortKey: 'code',
    sortDir: 'asc',
  },
)

const emit = defineEmits<{
  (e: 'edit', control: TenantControl): void
  (e: 'delete', controlKey: string): void
  (e: 'toggle-sort'): void
}>()

const router = useRouter()

function mapStatus(apiStatus: string): ControlStatus {
  if (apiStatus === 'implemented') return 'passing'
  if (
    apiStatus === 'in_progress' ||
    apiStatus === 'partially_implemented' ||
    apiStatus === 'needs_review'
  )
    return 'attention'
  if (apiStatus === 'not_started') return 'not_started'
  if (apiStatus === 'not_applicable') return 'not_applicable'
  return 'failing'
}

function goToDetail(control: TenantControl) {
  void router.push({
    name: 'compliance-control-detail',
    params: {
      organizationSlug: props.organizationSlug,
      controlId: control.controlKey,
    },
    state: {
      controlData: JSON.parse(JSON.stringify(control)),
    },
  })
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full min-w-[800px] border-collapse text-sm">
      <thead>
        <tr class="border-b border-border text-left align-middle bg-muted/20">
          <th scope="col" class="px-5 py-3 font-medium text-muted-foreground w-[40%]">
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              @click="emit('toggle-sort')"
            >
              Control
              <PhArrowUp
                v-if="sortKey === 'code' && sortDir === 'asc'"
                :size="12"
                aria-hidden="true"
              />
              <PhArrowDown
                v-else-if="sortKey === 'code' && sortDir === 'desc'"
                :size="12"
                aria-hidden="true"
              />
            </button>
          </th>
          <th scope="col" class="px-5 py-3 font-medium text-muted-foreground w-[30%]">Category</th>
          <th scope="col" class="px-5 py-3 font-medium text-muted-foreground w-[20%]">State</th>
          <th v-if="showActions" scope="col" class="w-[10%] px-5 py-3 text-right"></th>
        </tr>
      </thead>
      <tbody v-if="!isLoading">
        <tr
          v-for="control in controls"
          :key="control.$id"
          class="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30 cursor-pointer"
          @click="goToDetail(control)"
        >
          <!-- Control Code & Name -->
          <td class="px-5 py-4">
            <div class="flex flex-col gap-0.5">
              <span
                class="font-mono text-[10px] font-semibold text-muted-foreground tracking-wider uppercase"
              >
                {{ control.controlKey }}
              </span>
              <span class="font-medium text-foreground hover:text-primary transition-colors">
                {{ control.name }}
              </span>
            </div>
          </td>
          <!-- Category -->
          <td class="px-5 py-4">
            <span
              class="text-xs font-medium text-foreground bg-muted/65 px-2 py-1 rounded-md border border-border/40"
            >
              {{ control.category || 'General' }}
            </span>
          </td>
          <!-- Status / State -->
          <td class="px-5 py-4" @click.stop>
            <ControlStatusBadge :status="mapStatus(control.implementationStatus)" />
          </td>
          <!-- Actions -->
          <td v-if="showActions" class="px-5 py-4 text-right" @click.stop>
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  class="h-7 w-7 text-muted-foreground hover:text-foreground"
                >
                  <PhDotsThreeOutline :size="15" weight="fill" />
                  <span class="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-[140px]">
                <DropdownMenuItem @click="goToDetail(control)" class="gap-2">
                  <PhEye :size="14" />
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem @click="emit('edit', control)" class="gap-2">
                  <PhPencilSimple :size="14" />
                  Edit control
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  @click="emit('delete', control.controlKey)"
                  class="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <PhTrash :size="14" />
                  Delete control
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </td>
        </tr>
      </tbody>
      <tbody v-else>
        <tr>
          <td :colspan="showActions ? 4 : 3" class="p-0">
            <ClarusLoadingState variant="table-rows" :rows="5" label="Loading controls" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
