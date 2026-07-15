<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  PhCheckCircle,
  PhClock,
  PhDeviceMobile,
  PhGlobe,
  PhMonitor,
  PhQrCode,
  PhShieldWarning,
  PhTrash,
  PhWarning,
} from '@phosphor-icons/vue'
import PageHeader from '@/components/shell/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { getModulePagePath } from '@/config/navigation'

const route = useRoute()

const organizationSlug = computed(() =>
  typeof route.params.organizationSlug === 'string' ? route.params.organizationSlug : undefined,
)

// Password form fields
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordSaving = ref(false)
const passwordSuccess = ref(false)
const passwordError = ref('')

const handlePasswordChange = () => {
  passwordError.value = ''
  passwordSuccess.value = false

  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'New passwords do not match'
    return
  }

  if (newPassword.value.length < 8) {
    passwordError.value = 'Password must be at least 8 characters long'
    return
  }

  passwordSaving.value = true
  setTimeout(() => {
    passwordSaving.value = false
    passwordSuccess.value = true
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    setTimeout(() => {
      passwordSuccess.value = false
    }, 4000)
  }, 1200)
}

// 2FA state
const is2FaEnabled = ref(false)
const show2FaSetup = ref(false)
const mfaCodeInput = ref('')
const isVerifyingMfa = ref(false)
const backupCodes = ref<string[]>([
  '49C2-8E7B',
  '90A3-1F4D',
  'C82A-5D1F',
  '6E7B-0A2C',
  '5B9D-3C8A',
  '1F4D-7E2B',
])

const handleToggle2Fa = (value: boolean) => {
  if (value) {
    show2FaSetup.value = true
  } else {
    is2FaEnabled.value = false
    show2FaSetup.value = false
  }
}

const verifyMfa = () => {
  isVerifyingMfa.value = true
  setTimeout(() => {
    isVerifyingMfa.value = false
    is2FaEnabled.value = true
    show2FaSetup.value = false
  }, 1000)
}

// Active Sessions
interface UserSession {
  id: string
  device: 'desktop' | 'mobile'
  browser: string
  os: string
  location: string
  ip: string
  lastActive: string
  isCurrent: boolean
}

const sessions = ref<UserSession[]>([
  {
    id: 'sess_01',
    device: 'desktop',
    browser: 'Chrome 126.0',
    os: 'macOS Sonoma',
    location: 'San Francisco, CA, USA',
    ip: '64.233.160.21',
    lastActive: 'Active now',
    isCurrent: true,
  },
  {
    id: 'sess_02',
    device: 'desktop',
    browser: 'Firefox 127.0',
    os: 'Linux x86_64',
    location: 'Munich, Germany',
    ip: '88.130.49.201',
    lastActive: '2 hours ago',
    isCurrent: false,
  },
  {
    id: 'sess_03',
    device: 'mobile',
    browser: 'Safari Mobile',
    os: 'iOS 17.5',
    location: 'San Francisco, CA, USA',
    ip: '172.56.21.144',
    lastActive: 'Yesterday at 3:45 PM',
    isCurrent: false,
  },
])

const revokeSession = (sessionId: string) => {
  sessions.value = sessions.value.filter((s) => s.id !== sessionId)
}

const revokeAllOtherSessions = () => {
  sessions.value = sessions.value.filter((s) => s.isCurrent)
}
</script>

<template>
  <article class="space-y-6">
    <PageHeader />

    <!-- Settings Sub Navigation Tabs -->
    <nav class="flex border-b border-border" aria-label="Settings tabs">
      <RouterLink
        :to="getModulePagePath('settings', 'profile', organizationSlug)"
        class="border-b-2 px-4 py-2.5 text-sm font-medium transition-colors -mb-px border-transparent text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Profile
      </RouterLink>
      <RouterLink
        :to="getModulePagePath('settings', 'account', organizationSlug)"
        class="border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors -mb-px border-primary text-primary focus-visible:outline-none"
        aria-current="page"
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

    <!-- Main Account settings grid -->
    <div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <!-- Left side settings info & 2FA Status -->
      <div class="space-y-6 lg:col-span-1">
        <!-- 2FA Box -->
        <div class="rounded-lg border border-border bg-card p-6 shadow-2xs space-y-4">
          <h2 class="text-base font-semibold text-foreground flex items-center gap-2">
            <PhShieldWarning :size="18" class="text-primary" />
            Two-Factor Auth
          </h2>
          <p class="text-xs text-muted-foreground">
            Enhance account security by requiring an authenticator code alongside your password.
          </p>

          <div class="flex items-center justify-between py-2 border-t border-border">
            <span class="text-sm font-medium text-foreground">Enable 2FA</span>
            <Switch
              id="two-factor-toggle"
              :checked="is2FaEnabled"
              @update:checked="handleToggle2Fa"
            />
          </div>

          <!-- 2FA SETUP UI -->
          <div v-if="show2FaSetup && !is2FaEnabled" class="pt-4 border-t border-border space-y-4">
            <div class="flex justify-center bg-muted rounded-md p-3">
              <!-- Mock QR Code SVG -->
              <svg
                width="128"
                height="128"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                class="text-foreground"
                aria-label="QR Code scan representation"
              >
                <rect x="2" y="2" width="6" height="6" />
                <rect x="2" y="16" width="6" height="6" />
                <rect x="16" y="2" width="6" height="6" />
                <rect x="16" y="16" width="3" height="3" />
                <rect x="20" y="20" width="2" height="2" />
                <rect x="12" y="12" width="2" height="2" />
                <path d="M10 2h2M2 10h4M16 10h2M12 16h2M20 12h2" />
              </svg>
            </div>
            <div class="space-y-2">
              <Label for="mfa-input">Authenticator Code</Label>
              <Input
                id="mfa-input"
                v-model="mfaCodeInput"
                placeholder="000000"
                class="font-mono text-center tracking-widest bg-background"
                maxlength="6"
              />
            </div>
            <div class="flex gap-2">
              <Button size="sm" variant="ghost" class="flex-1" @click="show2FaSetup = false">
                Cancel
              </Button>
              <Button size="sm" class="flex-1" :disabled="mfaCodeInput.length < 6 || isVerifyingMfa" @click="verifyMfa">
                {{ isVerifyingMfa ? 'Verifying...' : 'Verify' }}
              </Button>
            </div>
          </div>

          <!-- Enabled State Info -->
          <div v-if="is2FaEnabled" class="p-3 bg-primary/10 rounded-md border border-primary/20 space-y-3">
            <p class="text-xs font-semibold text-primary flex items-center gap-1.5">
              <PhCheckCircle :size="16" weight="fill" />
              2FA Protection Enabled
            </p>
            <div class="space-y-1">
              <p class="text-[0.6875rem] font-bold text-muted-foreground uppercase tracking-wider">
                Backup Recovery Codes
              </p>
              <div class="grid grid-cols-2 gap-1 text-[0.75rem] font-mono text-foreground">
                <div v-for="code in backupCodes" :key="code">{{ code }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right side Settings: Password Reset and Sessions -->
      <div class="space-y-6 lg:col-span-2">
        <!-- Change Password Card -->
        <div class="rounded-lg border border-border bg-card p-6 shadow-2xs space-y-4">
          <h2 class="text-base font-semibold text-foreground">Update Password</h2>
          <p class="text-xs text-muted-foreground -mt-2">
            Change your password. Ensure it has at least 8 characters including symbols.
          </p>

          <form @submit.prevent="handlePasswordChange" class="space-y-4">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div class="space-y-2">
                <Label for="current-pwd">Current Password</Label>
                <Input
                  id="current-pwd"
                  type="password"
                  v-model="currentPassword"
                  required
                  class="bg-background focus:ring-2 focus:ring-primary"
                />
              </div>
              <div class="space-y-2">
                <Label for="new-pwd">New Password</Label>
                <Input
                  id="new-pwd"
                  type="password"
                  v-model="newPassword"
                  required
                  class="bg-background focus:ring-2 focus:ring-primary"
                />
              </div>
              <div class="space-y-2">
                <Label for="confirm-pwd">Confirm Password</Label>
                <Input
                  id="confirm-pwd"
                  type="password"
                  v-model="confirmPassword"
                  required
                  class="bg-background focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div class="flex items-center justify-between pt-2">
              <div class="min-h-5">
                <span v-if="passwordSuccess" class="flex items-center gap-1 text-sm text-success-emphasis">
                  <PhCheckCircle :size="16" weight="fill" />
                  Password updated successfully
                </span>
                <span v-if="passwordError" class="flex items-center gap-1 text-sm text-destructive-emphasis">
                  <PhWarning :size="16" weight="fill" />
                  {{ passwordError }}
                </span>
              </div>
              <Button type="submit" :disabled="passwordSaving">
                {{ passwordSaving ? 'Updating...' : 'Update Password' }}
              </Button>
            </div>
          </form>
        </div>

        <!-- Active Sessions Card -->
        <div class="rounded-lg border border-border bg-card p-6 shadow-2xs space-y-4">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="text-base font-semibold text-foreground">Active Sessions</h2>
              <p class="text-xs text-muted-foreground">
                These devices are currently logged into your Clarus account.
              </p>
            </div>
            <Button
              v-if="sessions.length > 1"
              size="sm"
              variant="outline"
              class="self-start text-xs border-border hover:bg-muted"
              @click="revokeAllOtherSessions"
            >
              Sign out all other devices
            </Button>
          </div>

          <div class="divide-y divide-border border-t border-border mt-2">
            <div
              v-for="session in sessions"
              :key="session.id"
              class="flex items-center justify-between py-4"
            >
              <div class="flex items-start gap-3">
                <span
                  class="mt-0.5 flex size-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground border border-border"
                >
                  <component
                    :is="session.device === 'desktop' ? PhMonitor : PhDeviceMobile"
                    :size="18"
                  />
                </span>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold text-foreground">
                      {{ session.browser }} on {{ session.os }}
                    </span>
                    <Badge v-if="session.isCurrent" variant="secondary" class="bg-primary/10 text-primary hover:bg-primary/14 border-transparent text-[10px] font-semibold tracking-wider">
                      Current
                    </Badge>
                  </div>
                  <div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span class="flex items-center gap-1">
                      <PhGlobe :size="12" />
                      {{ session.location }}
                    </span>
                    <span class="flex items-center gap-1 font-mono">
                      IP: {{ session.ip }}
                    </span>
                    <span class="flex items-center gap-1">
                      <PhClock :size="12" />
                      {{ session.lastActive }}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <Button
                  v-if="!session.isCurrent"
                  size="sm"
                  variant="ghost"
                  class="text-xs hover:text-destructive hover:bg-destructive/10"
                  aria-label="Revoke session"
                  @click="revokeSession(session.id)"
                >
                  <PhTrash :size="15" />
                </Button>
              </div>
            </div>
            <div v-if="sessions.length === 0" class="py-6 text-center text-sm text-muted-foreground">
              No active sessions.
            </div>
          </div>
        </div>

        <!-- Danger Zone Card -->
        <div class="rounded-lg border border-destructive/20 bg-card p-6 shadow-2xs space-y-4">
          <h2 class="text-base font-semibold text-destructive">Danger Zone</h2>
          <p class="text-xs text-muted-foreground -mt-2">
            Permanently delete your account. This action is immediate and cannot be undone. All compliance work mapping, history, and active evidence collections associated with this account will be permanently deleted.
          </p>
          <div class="pt-2">
            <Button variant="outline" class="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground">
              Delete Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  </article>
</template>
