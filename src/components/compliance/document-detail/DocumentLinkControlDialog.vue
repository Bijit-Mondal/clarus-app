<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useTenantControlSearchQuery } from '@/composables/useControls'
import type { DocumentControlLink } from '@/composables/useDocuments'

const props = defineProps<{
  open: boolean
  linkedControls: DocumentControlLink[]
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  link: [control: DocumentControlLink]
}>()

const controlSearchQuery = ref('')
const selectedControlId = ref('')

const isControlSearchEnabled = computed(
  () => props.open && controlSearchQuery.value.trim().length > 0,
)

const { data: controlSearchData, isPending: isControlSearchPending } = useTenantControlSearchQuery(
  controlSearchQuery,
  isControlSearchEnabled,
)

const availableControls = computed(() => controlSearchData.value?.tenantControls ?? [])

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    controlSearchQuery.value = ''
    selectedControlId.value = ''
  },
)

function confirmLink() {
  if (!selectedControlId.value) return
  const control = availableControls.value.find(
    (candidate) => candidate.tenantControlId === selectedControlId.value,
  )
  if (!control) return
  emit('link', control)
}

function isAlreadyLinked(tenantControlId: string) {
  return props.linkedControls.some((link) => link.tenantControlId === tenantControlId)
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-[520px]">
      <DialogHeader>
        <DialogTitle>Link control</DialogTitle>
        <DialogDescription>
          Search the controls available to this tenant and select one to link.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-3 py-2">
        <Label for="control-search">Search controls</Label>
        <Input
          id="control-search"
          v-model="controlSearchQuery"
          placeholder="Search by control ID or name…"
          autocomplete="off"
        />

        <div class="max-h-64 overflow-y-auto rounded-md border border-border" aria-live="polite">
          <p
            v-if="!controlSearchQuery.trim()"
            class="px-4 py-8 text-center text-sm text-muted-foreground"
          >
            Enter a control ID or name to search.
          </p>
          <p
            v-else-if="isControlSearchPending"
            class="px-4 py-8 text-center text-sm text-muted-foreground"
          >
            Searching controls…
          </p>
          <p
            v-else-if="availableControls.length === 0"
            class="px-4 py-8 text-center text-sm text-muted-foreground"
          >
            No matching controls found.
          </p>
          <div v-else class="divide-y divide-border">
            <Button
              v-for="control in availableControls"
              :key="control.tenantControlId"
              type="button"
              variant="ghost"
              class="h-auto w-full justify-start rounded-none px-4 py-3 text-left"
              :class="{
                'bg-accent text-accent-foreground': selectedControlId === control.tenantControlId,
              }"
              :disabled="isAlreadyLinked(control.tenantControlId)"
              @click="selectedControlId = control.tenantControlId"
            >
              <span class="min-w-0">
                <span class="flex items-center gap-2">
                  <span class="font-mono text-xs font-semibold">{{ control.controlKey }}</span>
                  <span
                    v-if="isAlreadyLinked(control.tenantControlId)"
                    class="text-xs text-muted-foreground"
                  >
                    Already linked
                  </span>
                </span>
                <span class="mt-0.5 block truncate text-sm font-normal text-muted-foreground">
                  {{ control.name }}
                </span>
              </span>
            </Button>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">Cancel</Button>
        <Button :disabled="!selectedControlId" @click="confirmLink">Link control</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
