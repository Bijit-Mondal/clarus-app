<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  PhCaretRight,
  PhClock,
  PhCheckCircle,
  PhArrowLeft,
  PhX,
  PhPlus,
  PhTrash,
  PhUser,
  PhNoteBlank,
  PhUploadSimple,
  PhPaperPlaneTilt,
  PhArrowCounterClockwise,
  PhChatCircle,
  PhShieldCheck,
  PhDotsThree,
  PhPencilSimple,
  PhGear,
} from '@phosphor-icons/vue'
import { useDocuments } from '@/composables/useDocuments'
import DocumentEditor from '@/components/compliance/DocumentEditor.vue'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Local directive for auto-focusing elements
const vFocus = {
  mounted: (el: HTMLInputElement) => {
    el.focus()
  },
}

const route = useRoute()
const router = useRouter()

const documentId = computed(() => route.params.documentId as string)
const orgSlug = computed(() => route.params.organizationSlug as string)

const {
  getDocumentById,
  updateDocument,
  addActivity,
  addComment,
  publishVersion,
  requestApproval,
  addMappedControl,
  removeMappedControl,
} = useDocuments()

// Fetch document
const documentItem = computed(() => getDocumentById(documentId.value))

// Navigation helpers
function goBack() {
  void router.push({
    name: 'compliance-documents',
    params: { organizationSlug: orgSlug.value },
  })
}

// Active Tab
const activeTab = ref<'overview' | 'content' | 'mappings' | 'versions' | 'activity' | 'comments'>(
  'content',
)

const tabs = computed(
  () =>
    [
      { id: 'overview', label: 'Overview', count: 0 },
      { id: 'content', label: 'Content', count: 0 },
      { id: 'mappings', label: 'Mappings', count: documentItem.value?.mappedControls.length || 0 },
      { id: 'versions', label: 'Versions', count: documentItem.value?.versions.length || 0 },
      { id: 'activity', label: 'Activity', count: documentItem.value?.activity.length || 0 },
      { id: 'comments', label: 'Comments', count: documentItem.value?.comments.length || 0 },
    ] as const,
)

// Initials helper
function getUserInitials(name: string) {
  if (!name) return 'U'
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Title Edit state
const isEditingTitle = ref(false)
const titleInput = ref('')

function startEditingTitle() {
  if (!documentItem.value) return
  titleInput.value = documentItem.value.title
  isEditingTitle.value = true
}

function saveTitle() {
  if (!documentItem.value || !titleInput.value.trim()) {
    isEditingTitle.value = false
    return
  }
  const oldTitle = documentItem.value.title
  updateDocument(documentItem.value.id, { title: titleInput.value.trim() })
  addActivity(
    documentItem.value.id,
    `Renamed document from "${oldTitle}" to "${titleInput.value.trim()}"`,
  )
  isEditingTitle.value = false
}

// Status Badges config
const statusConfig = computed(() => {
  const status = documentItem.value?.status || 'draft'
  if (status === 'approved') {
    return {
      label: 'Approved',
      icon: PhCheckCircle,
      class: 'border-success/30 bg-success/10 text-success-emphasis',
    }
  }
  if (status === 'in-review') {
    return {
      label: 'In review',
      icon: PhClock,
      class: 'border-warning/30 bg-warning/10 text-warning-emphasis',
    }
  }
  return {
    label: 'Draft',
    icon: PhNoteBlank,
    class: 'border-border bg-secondary text-muted-foreground',
  }
})

// Auto-save notification state
const saveStatus = ref<'saved' | 'saving' | 'unsaved'>('saved')

watch(
  () => documentItem.value?.content,
  (newContent, oldContent) => {
    if (oldContent !== undefined && newContent !== oldContent) {
      saveStatus.value = 'saving'
      setTimeout(() => {
        saveStatus.value = 'saved'
      }, 1000)
    }
  },
)

// Publish Dialog state
const isPublishDialogOpen = ref(false)
const publishChangelog = ref('')
const publishApprovers = ref<string[]>([])
const newApproverName = ref('')

const availableApproverPool = [
  'Sarah Connor',
  'David Miller',
  'Virat Kohli',
  'Alex Rivera',
  'John Doe',
]

function openPublishDialog() {
  if (!documentItem.value) return
  publishChangelog.value = ''
  // Pre-fill with current approvers
  publishApprovers.value = [...documentItem.value.approvers]
  isPublishDialogOpen.value = true
}

function addApprover() {
  const name = newApproverName.value.trim()
  if (name && !publishApprovers.value.includes(name)) {
    publishApprovers.value.push(name)
    newApproverName.value = ''
  }
}

function removeApprover(name: string) {
  publishApprovers.value = publishApprovers.value.filter((n) => n !== name)
}

function handlePublish(versionType: 'minor' | 'major') {
  if (!documentItem.value) return
  publishVersion(documentItem.value.id, {
    changelog: publishChangelog.value,
    approvers: publishApprovers.value,
    versionType,
  })
  isPublishDialogOpen.value = false
}

function handleRequestApproval() {
  if (!documentItem.value) return
  requestApproval(documentItem.value.id, {
    changelog: publishChangelog.value,
    approvers: publishApprovers.value,
  })
  isPublishDialogOpen.value = false
}

// Link Control Dialog state
const isLinkControlDialogOpen = ref(false)
const selectedControlKey = ref('')

const availableControls = [
  { key: 'CC6.1', name: 'Access Authorization' },
  { key: 'CC6.2', name: 'User Registration and Access Provisioning' },
  { key: 'CC6.3', name: 'Access Modification and Revocation' },
  { key: 'CC6.4', name: 'Role-Based Access Controls' },
  { key: 'CC7.1', name: 'Vulnerability Management' },
  { key: 'CC7.2', name: 'Patch Management' },
  { key: 'CC7.3', name: 'Incident Containment and Recovery' },
  { key: 'CC8.1', name: 'Change Management' },
]

function openLinkControlDialog() {
  selectedControlKey.value = ''
  isLinkControlDialogOpen.value = true
}

function linkControl() {
  if (!documentItem.value || !selectedControlKey.value) return
  const control = availableControls.find((c) => c.key === selectedControlKey.value)
  if (control) {
    addMappedControl(documentItem.value.id, {
      controlKey: control.key,
      name: control.name,
      implementationStatus: 'implemented',
    })
  }
  isLinkControlDialogOpen.value = false
}

function unlinkControl(key: string) {
  if (!documentItem.value) return
  removeMappedControl(documentItem.value.id, key)
}

// Comments state
const newCommentContent = ref('')

function postComment() {
  if (!documentItem.value || !newCommentContent.value.trim()) return
  addComment(documentItem.value.id, newCommentContent.value.trim())
  newCommentContent.value = ''
}

// Restore previous version
function restoreVersion(versionContent: string, versionLabel: string) {
  if (!documentItem.value) return
  updateDocument(documentItem.value.id, { content: versionContent })
  addActivity(documentItem.value.id, `Restored content to version ${versionLabel}`)
  activeTab.value = 'content'
}

// Handle Metadata changes
function updateMetadata(field: 'category' | 'classification', value: unknown) {
  if (!documentItem.value || !value) return
  const strVal = String(value)
  if (field === 'category') {
    updateDocument(documentItem.value.id, { category: strVal as 'policy' | 'procedure' | 'sop' })
  } else if (field === 'classification') {
    updateDocument(documentItem.value.id, {
      classification: strVal as 'Public' | 'Internal' | 'Confidential' | 'Restricted',
    })
  }
  addActivity(documentItem.value.id, `Updated ${field} to ${strVal}`)
}
</script>

<template>
  <div v-if="documentItem" class="flex flex-col gap-6">
    <!-- Breadcrumbs & Actions Header -->
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <!-- Left side: Breadcrumb & Title -->
      <div class="flex flex-col gap-1.5">
        <nav
          class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
          aria-label="Breadcrumb"
        >
          <router-link
            :to="{ name: 'compliance-documents', params: { organizationSlug: orgSlug } }"
            class="hover:text-foreground transition-colors capitalize"
          >
            {{ documentItem.category }}s
          </router-link>
          <PhCaretRight :size="10" class="text-muted-foreground/60" />
          <span class="text-foreground max-w-[200px] truncate">{{ documentItem.title }}</span>
        </nav>

        <div class="flex items-center gap-2.5">
          <button
            @click="goBack"
            class="mr-1 flex size-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <PhArrowLeft :size="14" />
          </button>

          <!-- Editable Title -->
          <div v-if="isEditingTitle" class="flex items-center gap-2">
            <Input
              v-model="titleInput"
              class="h-9 w-[300px] text-lg font-semibold"
              @keydown.enter="saveTitle"
              @keydown.escape="isEditingTitle = false"
              v-focus
            />
            <Button size="sm" class="h-9 px-3" @click="saveTitle">Save</Button>
            <Button size="sm" variant="ghost" class="h-9 px-3" @click="isEditingTitle = false"
              >Cancel</Button
            >
          </div>
          <div v-else class="flex items-center gap-2 group">
            <h1 class="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              {{ documentItem.title }}
            </h1>
            <button
              @click="startEditingTitle"
              class="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
              title="Edit Title"
            >
              <PhPencilSimple :size="16" />
            </button>
          </div>

          <Badge
            variant="outline"
            :class="[
              'gap-1 capitalize py-0.5 px-2 rounded-full font-medium text-xs',
              statusConfig.class,
            ]"
          >
            <component :is="statusConfig.icon" :size="12" weight="fill" />
            {{ statusConfig.label }}
          </Badge>
        </div>
      </div>

      <!-- Right side: Actions -->
      <div class="flex items-center gap-2">
        <Button size="sm" class="gap-1.5" @click="openPublishDialog">
          <PhUploadSimple :size="15" weight="bold" />
          Publish
        </Button>

        <Button variant="outline" size="sm" class="gap-1.5" @click="activeTab = 'versions'">
          <PhClock :size="15" />
          Version history
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline" size="icon-sm" class="size-9">
              <PhDotsThree :size="18" weight="bold" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-48">
            <DropdownMenuItem @click="startEditingTitle" class="gap-2">
              <PhPencilSimple :size="15" />
              Rename document
            </DropdownMenuItem>
            <DropdownMenuItem
              @click="updateMetadata('classification', 'Confidential')"
              class="gap-2"
            >
              <PhGear :size="15" />
              Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <!-- Metadata Card / Properties (matches document_probo2.png) -->
    <div class="rounded-lg border border-border bg-card p-5">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Left Side: Basic Meta Fields -->
        <div class="flex flex-col gap-4">
          <div class="grid grid-cols-3 items-center gap-4">
            <Label
              for="meta-category"
              class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >Type</Label
            >
            <div class="col-span-2">
              <Select
                :model-value="documentItem.category"
                @update:model-value="(val) => updateMetadata('category', val)"
              >
                <SelectTrigger id="meta-category" class="h-8 text-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent class="text-xs">
                  <SelectItem value="policy">Policy</SelectItem>
                  <SelectItem value="procedure">Procedure</SelectItem>
                  <SelectItem value="sop">SOP (Standard Operating Procedure)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div class="grid grid-cols-3 items-center gap-4">
            <Label
              for="meta-version"
              class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >Version</Label
            >
            <div class="col-span-2 text-sm font-mono text-foreground pl-3">
              {{ documentItem.version }}
            </div>
          </div>

          <div class="grid grid-cols-3 items-center gap-4">
            <Label
              for="meta-classification"
              class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >Classification</Label
            >
            <div class="col-span-2">
              <Select
                :model-value="documentItem.classification"
                @update:model-value="(val) => updateMetadata('classification', val)"
              >
                <SelectTrigger id="meta-classification" class="h-8 text-xs">
                  <SelectValue placeholder="Select classification" />
                </SelectTrigger>
                <SelectContent class="text-xs">
                  <SelectItem value="Public">Public</SelectItem>
                  <SelectItem value="Internal">Internal</SelectItem>
                  <SelectItem value="Confidential">Confidential</SelectItem>
                  <SelectItem value="Restricted">Restricted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <!-- Right Side: Approvers & Owner -->
        <div class="flex flex-col gap-4">
          <div class="grid grid-cols-3 items-start gap-4">
            <Label
              class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1.5"
              >Owner</Label
            >
            <div class="col-span-2 flex items-center gap-2">
              <Avatar class="size-7">
                <AvatarFallback
                  class="text-[10px] bg-secondary text-secondary-foreground font-semibold"
                >
                  {{ getUserInitials(documentItem.owner) }}
                </AvatarFallback>
              </Avatar>
              <span class="text-sm font-medium text-foreground">{{ documentItem.owner }}</span>
            </div>
          </div>

          <div class="grid grid-cols-3 items-start gap-4">
            <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1"
              >Approvers</Label
            >
            <div class="col-span-2 flex flex-wrap gap-1.5 items-center">
              <Badge
                v-for="app in documentItem.approvers"
                :key="app"
                variant="secondary"
                class="gap-1 rounded-sm text-xs py-0.5 px-2 bg-secondary text-secondary-foreground font-medium"
              >
                {{ app }}
              </Badge>
              <button
                @click="openPublishDialog"
                class="flex size-6 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground transition-colors"
                title="Manage Approvers"
              >
                <PhPencilSimple :size="12" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex border-b border-border">
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        class="relative px-4 py-3 text-sm font-medium transition-all focus:outline-hidden"
        :class="
          activeTab === t.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
        "
        @click="activeTab = t.id"
      >
        <div class="flex items-center gap-1.5">
          <span>{{ t.label }}</span>
          <span
            v-if="t.count > 0"
            class="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold"
            :class="
              activeTab === t.id ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
            "
          >
            {{ t.count }}
          </span>
        </div>
        <span
          v-if="activeTab === t.id"
          class="absolute inset-x-0 bottom-0 h-[2px] rounded-t bg-primary"
        />
      </button>
    </div>

    <!-- Tabs Content Container -->
    <div class="min-h-[400px]">
      <!-- Overview Tab -->
      <div v-if="activeTab === 'overview'" class="flex flex-col gap-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="md:col-span-2 rounded-lg border border-border bg-card p-6">
            <h3 class="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Document Details
            </h3>
            <div class="flex flex-col gap-5">
              <div>
                <Label class="text-xs font-semibold text-muted-foreground">Document Code</Label>
                <p class="mt-1 font-mono text-sm font-bold text-foreground">
                  {{ documentItem.code }}
                </p>
              </div>

              <div>
                <Label class="text-xs font-semibold text-muted-foreground">Description</Label>
                <p class="mt-1.5 text-sm text-foreground leading-relaxed max-w-2xl">
                  {{ documentItem.description }}
                </p>
              </div>

              <div>
                <Label class="text-xs font-semibold text-muted-foreground"
                  >Classification Policy</Label
                >
                <p class="mt-1 text-sm text-foreground">
                  This is classified as
                  <span class="font-semibold">{{ documentItem.classification }}</span> data.
                  Distribution is limited to authorized personnel as defined in the Information
                  Security Policy.
                </p>
              </div>
            </div>
          </div>

          <div class="rounded-lg border border-border bg-card p-6 flex flex-col gap-4">
            <h3 class="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Meta Info
            </h3>
            <div class="flex flex-col gap-3.5 text-sm">
              <div class="flex justify-between border-b border-border/50 pb-2.5">
                <span class="text-muted-foreground">File size equivalent</span>
                <span class="font-medium text-foreground">{{ documentItem.fileSize }}</span>
              </div>
              <div class="flex justify-between border-b border-border/50 pb-2.5">
                <span class="text-muted-foreground">Current Version</span>
                <span class="font-mono font-semibold text-foreground">{{
                  documentItem.version
                }}</span>
              </div>
              <div class="flex justify-between border-b border-border/50 pb-2.5">
                <span class="text-muted-foreground">Last modified</span>
                <span class="text-foreground">{{ documentItem.updatedAt }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted-foreground">Controls linked</span>
                <span class="font-semibold text-foreground">{{ documentItem.controlsCount }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Content/Editor Tab -->
      <div v-if="activeTab === 'content'" class="flex flex-col gap-3">
        <!-- Editor Status bar -->
        <div class="flex items-center justify-between px-1 text-xs">
          <div class="flex items-center gap-1.5 text-muted-foreground">
            <div
              class="size-2 rounded-full"
              :class="
                saveStatus === 'saved'
                  ? 'bg-success'
                  : saveStatus === 'saving'
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-muted'
              "
            />
            <span v-if="saveStatus === 'saved'">Changes saved automatically</span>
            <span v-else-if="saveStatus === 'saving'">Saving changes...</span>
            <span v-else>Unsaved changes</span>
          </div>
          <span class="font-mono text-muted-foreground/80">Press Ctrl+S to force save</span>
        </div>

        <DocumentEditor v-model="documentItem.content" />
      </div>

      <!-- Mappings Tab -->
      <div
        v-if="activeTab === 'mappings'"
        class="rounded-lg border border-border bg-card overflow-hidden"
      >
        <div class="flex items-center justify-between border-b border-border p-4 bg-muted/20">
          <div>
            <h3 class="text-sm font-semibold text-foreground">Linked Controls</h3>
            <p class="text-xs text-muted-foreground">
              Map this document to specific compliance framework controls to satisfy auditor
              inquiries.
            </p>
          </div>
          <Button size="sm" class="gap-1.5" @click="openLinkControlDialog">
            <PhPlus :size="14" weight="bold" />
            Link control
          </Button>
        </div>

        <table
          v-if="documentItem.mappedControls.length"
          class="w-full text-left border-collapse text-sm"
        >
          <thead>
            <tr
              class="border-b border-border bg-muted/40 text-xs text-muted-foreground font-semibold uppercase tracking-wider"
            >
              <th class="px-5 py-3 w-[25%]">Control ID</th>
              <th class="px-5 py-3 w-[55%]">Control Name</th>
              <th class="px-5 py-3 w-[15%]">Status</th>
              <th class="px-5 py-3 w-10 text-right"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="c in documentItem.mappedControls"
              :key="c.controlKey"
              class="border-b border-border/50 last:border-0 hover:bg-muted/15 transition-colors"
            >
              <td class="px-5 py-4 align-middle">
                <span
                  class="inline-flex items-center rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-xs font-bold text-muted-foreground uppercase leading-none"
                >
                  {{ c.controlKey }}
                </span>
              </td>
              <td class="px-5 py-4 align-middle">
                <router-link
                  :to="{
                    name: 'compliance-control-detail',
                    params: { organizationSlug: orgSlug, controlId: c.controlKey },
                  }"
                  class="font-medium text-foreground text-xs leading-normal hover:text-primary hover:underline"
                >
                  {{ c.name }}
                </router-link>
              </td>
              <td class="px-5 py-4 align-middle whitespace-nowrap">
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border capitalize border-success/30 bg-success/10 text-success-emphasis"
                >
                  {{ c.implementationStatus.replace('_', ' ') }}
                </span>
              </td>
              <td class="px-5 py-4 text-right align-middle">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  class="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Unlink Control"
                  @click="unlinkControl(c.controlKey)"
                >
                  <PhTrash :size="14" />
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="py-14 flex flex-col items-center justify-center text-center">
          <span
            class="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground/50 mb-3"
          >
            <PhShieldCheck :size="22" />
          </span>
          <p class="text-sm font-medium text-foreground">No controls mapped yet</p>
          <p class="text-xs text-muted-foreground mt-1 max-w-[280px]">
            Link this compliance document to framework controls to evidence policy enforcement.
          </p>
          <Button variant="outline" size="sm" class="mt-4 gap-1.5" @click="openLinkControlDialog">
            <PhPlus :size="14" weight="bold" />
            Link first control
          </Button>
        </div>
      </div>

      <!-- Versions Tab -->
      <div
        v-if="activeTab === 'versions'"
        class="rounded-lg border border-border bg-card overflow-hidden"
      >
        <div class="flex items-center justify-between border-b border-border p-4 bg-muted/20">
          <div>
            <h3 class="text-sm font-semibold text-foreground">Version History</h3>
            <p class="text-xs text-muted-foreground">
              Review prior iterations, changelogs, and choose to restore old versions if needed.
            </p>
          </div>
        </div>

        <table v-if="documentItem.versions.length" class="w-full text-left border-collapse text-sm">
          <thead>
            <tr
              class="border-b border-border bg-muted/40 text-xs text-muted-foreground font-semibold uppercase tracking-wider"
            >
              <th class="px-5 py-3 w-[15%]">Version</th>
              <th class="px-5 py-3 w-[20%]">Published Date</th>
              <th class="px-5 py-3 w-[20%]">Author</th>
              <th class="px-5 py-3 w-[35%]">Changelog</th>
              <th class="px-5 py-3 w-[10%] text-right"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="v in documentItem.versions"
              :key="v.version"
              class="border-b border-border/50 last:border-0 hover:bg-muted/15 transition-colors"
            >
              <td class="px-5 py-4 align-middle font-mono font-semibold text-foreground">
                {{ v.version }}
              </td>
              <td class="px-5 py-4 align-middle text-muted-foreground">{{ v.updatedAt }}</td>
              <td class="px-5 py-4 align-middle">
                <div class="flex items-center gap-1.5">
                  <PhUser :size="13" class="text-muted-foreground" />
                  <span>{{ v.owner }}</span>
                </div>
              </td>
              <td
                class="px-5 py-4 align-middle text-muted-foreground italic leading-relaxed text-xs"
              >
                "{{ v.changelog }}"
              </td>
              <td class="px-5 py-4 text-right align-middle">
                <Button
                  variant="outline"
                  size="sm"
                  class="gap-1 text-xs"
                  @click="restoreVersion(v.content, v.version)"
                >
                  <PhArrowCounterClockwise :size="13" />
                  Restore
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="py-14 flex flex-col items-center justify-center text-center">
          <span
            class="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground/50 mb-3"
          >
            <PhClock :size="22" />
          </span>
          <p class="text-sm font-medium text-foreground">No historical versions</p>
          <p class="text-xs text-muted-foreground mt-1 max-w-[280px]">
            Once you publish changes, older iterations will appear here for audit safety.
          </p>
        </div>
      </div>

      <!-- Activity Tab (matches document02.png) -->
      <div v-if="activeTab === 'activity'" class="rounded-lg border border-border bg-card p-6">
        <h3 class="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-5">
          Recent Activity
        </h3>

        <div v-if="documentItem.activity.length" class="flex flex-col divide-y divide-border/50">
          <div
            v-for="act in documentItem.activity"
            :key="act.id"
            class="flex items-start justify-between py-3.5 first:pt-0 last:pb-0"
          >
            <div class="flex items-center gap-3">
              <Avatar class="size-7">
                <AvatarFallback
                  class="text-[10px] bg-secondary text-secondary-foreground font-semibold"
                >
                  {{ getUserInitials(act.user) }}
                </AvatarFallback>
              </Avatar>
              <div>
                <span class="font-semibold text-foreground text-sm">{{ act.user }}</span>
                <span class="text-muted-foreground text-sm ml-1.5">{{ act.action }}</span>
              </div>
            </div>
            <span class="text-xs text-muted-foreground">{{ act.timestamp }}</span>
          </div>
        </div>
        <div v-else class="py-10 text-center text-muted-foreground text-sm">
          No activity logs recorded.
        </div>
      </div>

      <!-- Comments Tab -->
      <div v-if="activeTab === 'comments'" class="flex flex-col gap-6">
        <!-- New Comment Input -->
        <div class="rounded-lg border border-border bg-card p-4">
          <Label for="new-comment" class="sr-only">Add comment</Label>
          <Textarea
            id="new-comment"
            v-model="newCommentContent"
            placeholder="Discuss document compliance, policies, or request changes..."
            class="min-h-[80px] text-sm resize-none mb-3"
          />
          <div class="flex justify-between items-center">
            <span class="text-xs text-muted-foreground"
              >Comments are visible to all internal members.</span
            >
            <Button
              size="sm"
              class="gap-1.5"
              :disabled="!newCommentContent.trim()"
              @click="postComment"
            >
              <PhChatCircle :size="15" />
              Post comment
            </Button>
          </div>
        </div>

        <!-- Comments Feed -->
        <div class="flex flex-col gap-4">
          <div v-if="documentItem.comments.length" class="flex flex-col gap-3.5">
            <div
              v-for="com in documentItem.comments"
              :key="com.id"
              class="rounded-lg border border-border bg-card p-4 flex gap-3.5"
            >
              <Avatar class="size-8">
                <AvatarFallback
                  class="text-xs bg-secondary text-secondary-foreground font-semibold"
                >
                  {{ getUserInitials(com.user) }}
                </AvatarFallback>
              </Avatar>
              <div class="flex-1 flex flex-col gap-1">
                <div class="flex items-center justify-between">
                  <span class="font-semibold text-foreground text-sm">{{ com.user }}</span>
                  <span class="text-[11px] text-muted-foreground">{{ com.timestamp }}</span>
                </div>
                <p class="text-sm text-foreground leading-relaxed mt-0.5">{{ com.content }}</p>
              </div>
            </div>
          </div>
          <div
            v-else
            class="py-12 text-center text-muted-foreground text-sm border border-dashed border-border rounded-lg bg-card/50"
          >
            No comments yet. Start a discussion for compliance auditing.
          </div>
        </div>
      </div>
    </div>

    <!-- Publish Document Modal (matches document_probo2.png) -->
    <Dialog :open="isPublishDialogOpen" @update:open="isPublishDialogOpen = $event">
      <DialogContent class="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Publish document</DialogTitle>
          <DialogDescription class="text-xs">
            Review changes, specify versions, and request compliance approvals.
          </DialogDescription>
        </DialogHeader>

        <div class="grid gap-4 py-4">
          <div class="grid gap-2">
            <Label for="changelog" class="text-xs font-semibold text-foreground">Changelog</Label>
            <Textarea
              id="changelog"
              v-model="publishChangelog"
              placeholder="Describe what changed in this version..."
              class="h-24 text-sm"
            />
            <p class="text-[11px] text-muted-foreground">
              Approvers will receive an email and the document will be published as a major version
              once all have approved. Remove all approvers to publish directly as major.
            </p>
          </div>

          <div class="grid gap-2">
            <Label class="text-xs font-semibold text-foreground">Approvers</Label>
            <div
              class="flex flex-wrap gap-1.5 p-2 rounded-md border border-border bg-muted/10 min-h-[40px]"
            >
              <Badge
                v-for="name in publishApprovers"
                :key="name"
                variant="secondary"
                class="gap-1 rounded-sm text-xs py-0.5 px-1.5 bg-secondary text-secondary-foreground font-medium"
              >
                {{ name }}
                <button
                  type="button"
                  @click="removeApprover(name)"
                  class="text-muted-foreground hover:text-foreground"
                >
                  <PhX :size="10" />
                </button>
              </Badge>
              <span v-if="!publishApprovers.length" class="text-xs text-muted-foreground"
                >No approvers specified</span
              >
            </div>

            <!-- Quick select approver -->
            <div class="flex gap-2 mt-1">
              <Select v-model="newApproverName">
                <SelectTrigger class="h-8 text-xs flex-1">
                  <SelectValue placeholder="Add an approver..." />
                </SelectTrigger>
                <SelectContent class="text-xs">
                  <SelectItem
                    v-for="user in availableApproverPool"
                    :key="user"
                    :value="user"
                    :disabled="publishApprovers.includes(user)"
                  >
                    {{ user }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                class="h-8"
                @click="addApprover"
                :disabled="!newApproverName"
              >
                Add
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter class="flex sm:justify-between items-center gap-2">
          <Button variant="outline" size="sm" @click="isPublishDialogOpen = false">Cancel</Button>
          <div class="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              class="gap-1 text-xs"
              @click="handlePublish('minor')"
            >
              <PhUploadSimple :size="14" />
              Publish as minor
            </Button>
            <Button
              size="sm"
              class="gap-1 bg-primary text-primary-foreground text-xs"
              @click="handleRequestApproval"
            >
              <PhPaperPlaneTilt :size="14" />
              Request approval
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Link Control Modal -->
    <Dialog :open="isLinkControlDialogOpen" @update:open="isLinkControlDialogOpen = $event">
      <DialogContent class="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Link Control Requirement</DialogTitle>
          <DialogDescription class="text-xs">
            Link this document as evidence for specific security compliance framework controls.
          </DialogDescription>
        </DialogHeader>

        <div class="grid gap-4 py-3">
          <div class="grid gap-2">
            <Label for="link-control-select">Select Control</Label>
            <Select v-model="selectedControlKey">
              <SelectTrigger id="link-control-select">
                <SelectValue placeholder="Choose control..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="c in availableControls"
                  :key="c.key"
                  :value="c.key"
                  :disabled="documentItem.mappedControls.some((mc) => mc.controlKey === c.key)"
                >
                  <span class="font-mono text-xs font-semibold mr-1.5">{{ c.key }}</span>
                  <span>{{ c.name }}</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="isLinkControlDialogOpen = false">Cancel</Button>
          <Button :disabled="!selectedControlKey" @click="linkControl">Link Control</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
  <div v-else class="py-20 text-center">
    <p class="text-lg text-muted-foreground">Document not found.</p>
    <Button @click="goBack" class="mt-4">Back to Documents</Button>
  </div>
</template>
