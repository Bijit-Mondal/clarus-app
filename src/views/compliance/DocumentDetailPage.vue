<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  useDocuments,
  useDocumentQuery,
  useDocumentVersionsQuery,
  useDocumentControlsQuery,
  useDocumentApprovalsQuery,
  useWriteDocumentMutation,
  usePublishDocumentMutation,
  type DocumentControlLink,
} from '@/composables/useDocuments'
import { useDocumentAutosave } from '@/composables/useDocumentAutosave'
import { useTenantUsersQuery } from '@/composables/useTenants'
import { useAuth } from '@/composables/useAuth'
import ClarusLoadingState from '@/components/feedback/ClarusLoadingState.vue'
import DocumentDetailHeader from '@/components/compliance/document-detail/DocumentDetailHeader.vue'
import DocumentPropertiesBar from '@/components/compliance/document-detail/DocumentPropertiesBar.vue'
import DocumentTabNav from '@/components/compliance/document-detail/DocumentTabNav.vue'
import DocumentContentTab from '@/components/compliance/document-detail/DocumentContentTab.vue'
import DocumentControlsTab from '@/components/compliance/document-detail/DocumentControlsTab.vue'
import DocumentVersionsTab from '@/components/compliance/document-detail/DocumentVersionsTab.vue'
import DocumentActivityTab from '@/components/compliance/document-detail/DocumentActivityTab.vue'
import DocumentApprovalsTab from '@/components/compliance/document-detail/DocumentApprovalsTab.vue'
import DocumentSignaturesTab from '@/components/compliance/document-detail/DocumentSignaturesTab.vue'
import DocumentPublishDialog from '@/components/compliance/document-detail/DocumentPublishDialog.vue'
import DocumentLinkControlDialog from '@/components/compliance/document-detail/DocumentLinkControlDialog.vue'
import DocumentEditDialog from '@/components/compliance/document-detail/DocumentEditDialog.vue'
import type { DocumentTab } from '@/components/compliance/document-detail/types'
import { Button } from '@/components/ui/button'

const route = useRoute()
const router = useRouter()

const documentId = computed(() => route.params.documentId as string)
const orgSlug = computed(() => route.params.organizationSlug as string)

const { isPending: isDocumentLoading, isError: isDocumentError } = useDocumentQuery(documentId)
const { data: versionsResponse } = useDocumentVersionsQuery(documentId)
const versionsCount = computed(() => versionsResponse.value?.total ?? 0)

const { data: approvalsResponse } = useDocumentApprovalsQuery(documentId, {
  limit: 8,
  offset: 0,
})
const approvalsCount = computed(() => approvalsResponse.value?.total ?? 0)

const {
  data: controlsResponse,
  isPending: isControlsLoading,
  isError: isControlsError,
} = useDocumentControlsQuery(documentId, { limit: 25, offset: 0 })
const documentControls = computed(() => controlsResponse.value?.tenantControls ?? [])
const controlsCount = computed(() => controlsResponse.value?.total ?? 0)

const linkedControlsForDialog = computed<DocumentControlLink[]>(() =>
  documentControls.value.map((control) => ({
    tenantControlId: control.$id,
    controlKey: control.controlKey,
    name: control.name,
    implementationStatus: control.implementationStatus,
  })),
)

const { mutateAsync: writeDocument } = useWriteDocumentMutation()
const { mutateAsync: publishDocument, isPending: isPublishing } = usePublishDocumentMutation()
const { data: tenantUsersData } = useTenantUsersQuery()
const tenantUsers = computed(() => tenantUsersData.value?.users ?? [])

const { accountQuery } = useAuth()
const currentUserEmail = computed(() => accountQuery.data.value?.email ?? '')

const { getDocumentById, addActivity, linkDocumentControl } = useDocuments()

const documentItem = computed(() => getDocumentById(documentId.value))

const { draftTitle, draftContent, saveStatus, flushAutosave, ensureDocumentSaved } =
  useDocumentAutosave({
    documentId,
    documentItem,
    writeDocument,
    addActivity,
  })

const activeTab = ref<DocumentTab>('content')
const isEditDialogOpen = ref(false)
const isPublishDialogOpen = ref(false)
const isLinkControlDialogOpen = ref(false)

const signatureCount = computed(() => {
  const doc = documentItem.value
  if (!doc || doc.category !== 'policy' || !doc.approvers.length) return 0
  return doc.approvers.length
})

const tabs = computed(
  () =>
    [
      { id: 'content' as const, label: 'Content', count: 0 },
      { id: 'controls' as const, label: 'Controls', count: controlsCount.value },
      {
        id: 'versions' as const,
        label: 'Versions',
        count: versionsCount.value,
      },
      {
        id: 'activity' as const,
        label: 'Activity',
        count: documentItem.value?.activity.length || 0,
      },
      {
        id: 'approvals' as const,
        label: 'Approvals',
        count: approvalsCount.value,
      },
      { id: 'signatures' as const, label: 'Signatures', count: signatureCount.value },
    ] as const,
)

function goBack() {
  void router.push({
    name: 'compliance-documents',
    params: { organizationSlug: orgSlug.value },
  })
}

function openPublishDialog() {
  flushAutosave()
  isPublishDialogOpen.value = true
}

async function handlePublishMinor(changeLog: string) {
  if (!documentItem.value || isPublishing.value) return
  await ensureDocumentSaved()
  try {
    await publishDocument({
      documentId: documentItem.value.id,
      versionType: 'minor',
      changeLog,
    })
    isPublishDialogOpen.value = false
  } catch {
    // Dialog stays open for retry
  }
}

async function handlePublishMajor(changeLog: string) {
  if (!documentItem.value || isPublishing.value) return
  await ensureDocumentSaved()
  try {
    await publishDocument({
      documentId: documentItem.value.id,
      versionType: 'major',
      changeLog,
    })
    isPublishDialogOpen.value = false
    activeTab.value = 'approvals'
  } catch {
    // Dialog stays open for retry
  }
}

function handleLinkControl(control: DocumentControlLink) {
  if (!documentItem.value) return
  linkDocumentControl(documentItem.value.id, control)
  isLinkControlDialogOpen.value = false
}

function restoreVersion(versionContent: string, versionLabel: string) {
  if (!documentItem.value || !versionContent.trim()) return
  activeTab.value = 'content'
  draftContent.value = versionContent
  flushAutosave()
  addActivity(documentItem.value.id, `Restored content to version ${versionLabel}`)
}
</script>

<template>
  <ClarusLoadingState
    v-if="isDocumentLoading"
    variant="compact"
    label="Loading document…"
    class="py-20"
  />
  <div v-else-if="isDocumentError" class="py-20 text-center">
    <p class="text-lg text-muted-foreground">Failed to load document.</p>
    <Button class="mt-4" @click="goBack">Back to Documents</Button>
  </div>
  <div v-else-if="documentItem" class="flex flex-col gap-5">
    <DocumentDetailHeader
      :document="documentItem"
      :org-slug="orgSlug"
      :draft-title="draftTitle"
      :save-status="saveStatus"
      @update:draft-title="draftTitle = $event"
      @title-saved="flushAutosave()"
      @edit="isEditDialogOpen = true"
      @publish="openPublishDialog()"
    />

    <DocumentPropertiesBar :document="documentItem" />

    <div class="space-y-4">
      <DocumentTabNav v-model:active-tab="activeTab" :tabs="tabs" />

      <div class="min-h-[400px]">
        <DocumentContentTab
          v-if="activeTab === 'content'"
          :document="documentItem"
          :document-id="documentId"
          :draft-title="draftTitle"
          :draft-content="draftContent"
          :save-status="saveStatus"
          :download-user-email="currentUserEmail"
          @update:draft-content="draftContent = $event"
          @blur="flushAutosave()"
        />

        <DocumentControlsTab
          v-else-if="activeTab === 'controls'"
          :controls="documentControls"
          :is-loading="isControlsLoading"
          :is-error="isControlsError"
          :organization-slug="orgSlug"
          @link="isLinkControlDialogOpen = true"
        />

        <DocumentVersionsTab
          v-else-if="activeTab === 'versions'"
          :document-id="documentId"
          @restore="restoreVersion"
        />

        <DocumentActivityTab
          v-else-if="activeTab === 'activity'"
          :activity="documentItem.activity"
        />

        <DocumentApprovalsTab v-else-if="activeTab === 'approvals'" :document-id="documentId" />

        <DocumentSignaturesTab v-else-if="activeTab === 'signatures'" :document="documentItem" />
      </div>
    </div>

    <DocumentPublishDialog
      v-model:open="isPublishDialogOpen"
      :document="documentItem"
      :tenant-users="tenantUsers"
      :is-publishing="isPublishing"
      @publish-minor="handlePublishMinor"
      @publish-major="handlePublishMajor"
    />

    <DocumentLinkControlDialog
      v-model:open="isLinkControlDialogOpen"
      :linked-controls="linkedControlsForDialog"
      @link="handleLinkControl"
    />

    <DocumentEditDialog
      v-model:open="isEditDialogOpen"
      :document="documentItem"
      :tenant-users="tenantUsers"
    />
  </div>
  <div v-else class="py-20 text-center">
    <p class="text-lg text-muted-foreground">Document not found.</p>
    <Button class="mt-4" @click="goBack">Back to Documents</Button>
  </div>
</template>
