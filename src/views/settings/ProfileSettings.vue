<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { PhCamera, PhCheckCircle, PhEnvelope, PhUser } from '@phosphor-icons/vue'
import PageHeader from '@/components/shell/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/composables/useAuth'
import { getModulePagePath } from '@/config/navigation'

const route = useRoute()
const { accountQuery } = useAuth()

const organizationSlug = computed(() =>
  typeof route.params.organizationSlug === 'string' ? route.params.organizationSlug : undefined,
)

// Active user session data or fallback
const userEmail = computed(() => accountQuery.data.value?.email ?? 'compliance.owner@clarus.io')
const userName = computed(() => accountQuery.data.value?.name ?? 'Alex Rivera')

// Form inputs
const formName = ref(userName.value)
const formEmail = ref(userEmail.value)
const formTitle = ref('Director of Information Security')
const formAvatar = ref<string | null>(null)

// Notifications preferences
const notifyReviews = ref(true)
const notifyFindings = ref(true)
const notifyEvidence = ref(false)

// Save state
const isSaving = ref(false)
const saveSuccess = ref(false)

// Initials helper
const initials = computed(() => {
  const name = formName.value.trim()
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) {
    const first = parts[0]
    return first ? first.slice(0, 2).toUpperCase() : '?'
  }
  const first = parts[0]?.[0] ?? ''
  const second = parts[1]?.[0] ?? ''
  return `${first}${second}`.toUpperCase()
})

const handleAvatarChange = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      formAvatar.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}

const handleSave = () => {
  isSaving.value = true
  saveSuccess.value = false

  setTimeout(() => {
    isSaving.value = false
    saveSuccess.value = true
    setTimeout(() => {
      saveSuccess.value = false
    }, 4000)
  }, 1000)
}
</script>

<template>
  <article class="space-y-6">
    <PageHeader />

    <!-- Settings Sub Navigation Tabs -->
    <nav class="flex border-b border-border" aria-label="Settings tabs">
      <RouterLink
        :to="getModulePagePath('settings', 'profile', organizationSlug)"
        class="border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors -mb-px border-primary text-primary focus-visible:outline-none"
        aria-current="page"
      >
        Profile
      </RouterLink>
      <RouterLink
        :to="getModulePagePath('settings', 'account', organizationSlug)"
        class="border-b-2 px-4 py-2.5 text-sm font-medium transition-colors -mb-px border-transparent text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Account
      </RouterLink>
      <RouterLink
        :to="getModulePagePath('settings', 'billing', organizationSlug)"
        class="border-b-2 px-4 py-2.5 text-sm font-medium transition-colors -mb-px border-transparent text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Billing
      </RouterLink>
    </nav>

    <!-- Main Profile Surface -->
    <div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <!-- Left column: Avatar and Card info -->
      <div class="space-y-6 lg:col-span-1">
        <div class="rounded-lg border border-border bg-card p-6 shadow-2xs">
          <div class="flex flex-col items-center text-center">
            <div class="group relative mb-4">
              <Avatar
                class="size-24 border-2 border-border transition-colors group-hover:border-primary"
              >
                <img
                  v-if="formAvatar"
                  :src="formAvatar"
                  alt="Avatar preview"
                  class="object-cover"
                />
                <AvatarFallback class="bg-secondary text-2xl font-bold text-secondary-foreground">
                  {{ initials }}
                </AvatarFallback>
              </Avatar>
              <label
                for="avatar-upload"
                class="absolute bottom-0 right-0 flex size-8 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-all hover:bg-secondary hover:text-foreground"
                aria-label="Upload photo"
              >
                <PhCamera :size="16" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  class="sr-only"
                  @change="handleAvatarChange"
                />
              </label>
            </div>
            <h3 class="text-base font-semibold text-foreground">{{ formName || 'Your Name' }}</h3>
            <p class="text-sm text-muted-foreground">{{ formTitle || 'Workspace Role' }}</p>
            <div
              class="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
            >
              <PhUser :size="12" />
              <span>Workspace Owner</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right column: Forms and Settings Details -->
      <div class="space-y-6 lg:col-span-2">
        <form @submit.prevent="handleSave" class="space-y-6">
          <!-- Profile Info Form Section -->
          <div class="rounded-lg border border-border bg-card p-6 shadow-2xs space-y-4">
            <h2 class="text-base font-semibold text-foreground">Personal Details</h2>
            <p class="text-xs text-muted-foreground -mt-2">
              Update your workspace identity. This information will be visible to auditors and other
              contributors.
            </p>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div class="space-y-2">
                <Label for="profile-name">Full Name</Label>
                <Input
                  id="profile-name"
                  v-model="formName"
                  placeholder="e.g. Alex Rivera"
                  required
                  class="bg-background focus:ring-2 focus:ring-primary"
                />
              </div>

              <div class="space-y-2">
                <Label for="profile-title">Job Title</Label>
                <Input
                  id="profile-title"
                  v-model="formTitle"
                  placeholder="e.g. Director of Security"
                  class="bg-background focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div class="space-y-2">
              <Label for="profile-email">Email Address</Label>
              <Input
                id="profile-email"
                type="email"
                v-model="formEmail"
                placeholder="e.g. alex@company.com"
                required
                class="bg-background focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <!-- Notification Preferences Section -->
          <div class="rounded-lg border border-border bg-card p-6 shadow-2xs space-y-4">
            <h2 class="text-base font-semibold text-foreground">Notification Preferences</h2>
            <p class="text-xs text-muted-foreground -mt-2">
              Control when and how you receive alerts regarding compliance workflow events.
            </p>

            <div class="divide-y divide-border">
              <div class="flex items-center justify-between py-3">
                <div class="space-y-0.5">
                  <Label
                    for="notify-reviews"
                    class="text-sm font-medium text-foreground cursor-pointer"
                  >
                    Control Review Deadlines
                  </Label>
                  <p class="text-xs text-muted-foreground">
                    Get notified when controls you own are due for recurring policy review.
                  </p>
                </div>
                <Switch id="notify-reviews" v-model="notifyReviews" />
              </div>

              <div class="flex items-center justify-between py-3">
                <div class="space-y-0.5">
                  <Label
                    for="notify-findings"
                    class="text-sm font-medium text-foreground cursor-pointer"
                  >
                    New Findings & Gaps
                  </Label>
                  <p class="text-xs text-muted-foreground">
                    Receive immediate updates when an auditor raises a finding or exception.
                  </p>
                </div>
                <Switch id="notify-findings" v-model="notifyFindings" />
              </div>

              <div class="flex items-center justify-between py-3">
                <div class="space-y-0.5">
                  <Label
                    for="notify-evidence"
                    class="text-sm font-medium text-foreground cursor-pointer"
                  >
                    Evidence Expiry Alerts
                  </Label>
                  <p class="text-xs text-muted-foreground">
                    Weekly digest of automated evidence collectors showing stale state or failures.
                  </p>
                </div>
                <Switch id="notify-evidence" v-model="notifyEvidence" />
              </div>
            </div>
          </div>

          <!-- Form Action Buttons -->
          <div class="flex items-center justify-end gap-3">
            <!-- Toast-like success notice -->
            <Transition
              enter-active-class="transition-opacity duration-200"
              enter-from-class="opacity-0"
              leave-active-class="transition-opacity duration-200"
              leave-to-class="opacity-0"
            >
              <div
                v-if="saveSuccess"
                class="flex items-center gap-1.5 text-sm font-medium text-success-emphasis"
                role="status"
              >
                <PhCheckCircle :size="18" weight="fill" />
                <span>Profile updated successfully</span>
              </div>
            </Transition>

            <Button type="submit" :disabled="isSaving" class="font-medium">
              {{ isSaving ? 'Saving...' : 'Save Changes' }}
            </Button>
          </div>
        </form>
      </div>
    </div>
  </article>
</template>
