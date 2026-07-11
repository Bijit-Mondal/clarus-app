<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  PhCheck,
  PhChecks,
  PhTrash,
  PhShieldWarning,
  PhHourglass,
  PhFileText,
  PhCheckCircle,
  PhInfo,
  PhArrowRight,
  PhEnvelopeSimpleOpen,
  PhEnvelopeSimple,
  PhBell,
  PhArrowLeft,
} from '@phosphor-icons/vue'
import { useNotificationStore, type Notification } from '@/stores/notifications'
import PageHeader from '@/components/shell/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const router = useRouter()
const store = useNotificationStore()

const currentFilter = ref<'all' | 'unread' | 'read'>('all')

const filteredNotifications = computed(() => {
  if (currentFilter.value === 'unread') {
    return store.notifications.filter((n) => !n.read)
  }
  if (currentFilter.value === 'read') {
    return store.notifications.filter((n) => n.read)
  }
  return store.notifications
})

const groupedNotifications = computed(() => {
  const groups = {
    Today: [] as Notification[],
    Yesterday: [] as Notification[],
    Older: [] as Notification[],
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)

  filteredNotifications.value.forEach((n) => {
    const date = new Date(n.createdAt)
    date.setHours(0, 0, 0, 0)

    if (date.getTime() === today.getTime()) {
      groups.Today.push(n)
    } else if (date.getTime() === yesterday.getTime()) {
      groups.Yesterday.push(n)
    } else {
      groups.Older.push(n)
    }
  })

  // Filter out groups with no items
  return Object.entries(groups)
    .filter(([_, items]) => items.length > 0)
    .map(([title, items]) => ({
      title,
      // Sort each group with newest first
      items: [...items].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    }))
})

function formatTime(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function handleNotificationClick(n: Notification) {
  store.markAsRead(n.id)
  if (n.targetUrl) {
    router.push(n.targetUrl)
  }
}

// Icon helper mapped to type
function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'failure':
      return PhShieldWarning
    case 'expiry':
      return PhHourglass
    case 'task':
      return PhFileText
    case 'update':
      return PhCheckCircle
    default:
      return PhInfo
  }
}

// Severity color classes
function getSeverityStyles(severity: Notification['severity'], read: boolean) {
  if (read) return 'bg-muted/40 text-muted-foreground border-border/40'
  switch (severity) {
    case 'destructive':
      return 'bg-destructive/10 text-destructive border-destructive/20'
    case 'warning':
      return 'bg-warning/10 text-warning border-warning/20'
    case 'success':
      return 'bg-success/10 text-success border-success/20'
    default:
      return 'bg-primary/10 text-primary border-primary/20'
  }
}

function goBack() {
  router.back()
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-2 text-sm text-muted-foreground">
      <button
        type="button"
        class="flex items-center gap-1 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1.5 py-0.5"
        @click="goBack"
      >
        <PhArrowLeft :size="14" aria-hidden="true" />
        Back
      </button>
    </div>

    <PageHeader>
      <template #actions>
        <Button
          v-if="store.unreadCount > 0"
          variant="outline"
          size="sm"
          @click="store.markAllAsRead"
        >
          <PhChecks :size="16" class="mr-1.5" aria-hidden="true" />
          Mark all read
        </Button>
      </template>
    </PageHeader>

    <!-- Tabs/Filters & Stats Dashboard row -->
    <div
      class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4"
    >
      <div class="flex gap-1.5">
        <button
          type="button"
          :class="[
            'px-3.5 py-1.5 text-sm font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            currentFilter === 'all'
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
          ]"
          @click="currentFilter = 'all'"
        >
          All
        </button>
        <button
          type="button"
          :class="[
            'px-3.5 py-1.5 text-sm font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            currentFilter === 'unread'
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
          ]"
          @click="currentFilter = 'unread'"
        >
          Unread
          <span
            v-if="store.unreadCount > 0"
            class="ml-1.5 px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-xs"
          >
            {{ store.unreadCount }}
          </span>
        </button>
        <button
          type="button"
          :class="[
            'px-3.5 py-1.5 text-sm font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            currentFilter === 'read'
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
          ]"
          @click="currentFilter = 'read'"
        >
          Read
        </button>
      </div>

      <div class="text-xs text-muted-foreground">
        Showing {{ filteredNotifications.length }} notification{{
          filteredNotifications.length !== 1 ? 's' : ''
        }}
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="groupedNotifications.length === 0"
      class="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border px-6 py-16 text-center bg-card/30"
    >
      <span
        class="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground"
        aria-hidden="true"
      >
        <PhBell :size="24" class="opacity-60" />
      </span>
      <div class="max-w-sm space-y-1">
        <h2 class="text-base font-semibold text-foreground">No notifications found</h2>
        <p class="text-sm leading-relaxed text-muted-foreground text-pretty">
          {{
            currentFilter === 'unread'
              ? "You don't have any unread notifications right now."
              : currentFilter === 'read'
                ? "You don't have any read notifications stored."
                : 'No compliance updates or alerts are available at the moment.'
          }}
        </p>
      </div>
      <Button
        v-if="currentFilter !== 'all'"
        variant="outline"
        size="sm"
        @click="currentFilter = 'all'"
      >
        Show all notifications
      </Button>
    </div>

    <!-- Grouped Notifications Feed -->
    <div v-else class="space-y-8 max-w-4xl">
      <div v-for="group in groupedNotifications" :key="group.title" class="space-y-3">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
          {{ group.title }}
        </h2>

        <div class="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
          <ul class="divide-y divide-border" role="list">
            <li
              v-for="n in group.items"
              :key="n.id"
              :class="[
                'relative flex flex-col sm:flex-row gap-4 p-4 hover:bg-muted/30 transition-colors cursor-pointer group',
                !n.read ? 'bg-muted/10' : '',
              ]"
              @click="handleNotificationClick(n)"
            >
              <!-- Left accent unread bar -->
              <div
                v-if="!n.read"
                class="absolute left-0 top-0 bottom-0 w-[3px] bg-primary"
                aria-hidden="true"
              />

              <!-- Notification icon -->
              <div class="flex flex-1 items-start gap-4 min-w-0">
                <div
                  :class="[
                    'flex size-9 shrink-0 items-center justify-center rounded-lg border text-sm',
                    getSeverityStyles(n.severity, n.read),
                  ]"
                  aria-hidden="true"
                >
                  <component :is="getNotificationIcon(n.type)" :size="18" />
                </div>

                <div class="flex-1 min-w-0 space-y-1">
                  <div class="flex items-baseline gap-2 flex-wrap">
                    <h3
                      :class="[
                        'text-sm leading-normal break-words',
                        !n.read
                          ? 'font-semibold text-foreground'
                          : 'font-normal text-muted-foreground',
                      ]"
                    >
                      {{ n.title }}
                    </h3>
                    <span class="text-xs text-muted-foreground whitespace-nowrap">
                      &bull; {{ formatTime(n.createdAt) }}
                    </span>
                  </div>
                  <p class="text-xs leading-relaxed text-muted-foreground max-w-3xl">
                    {{ n.description }}
                  </p>
                </div>
              </div>

              <!-- Action button column -->
              <div
                class="flex items-center gap-2 self-end sm:self-center ml-auto shrink-0 mt-2 sm:mt-0 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <!-- Action CTA link -->
                <Button
                  v-if="n.targetUrl"
                  variant="ghost"
                  size="sm"
                  class="h-8 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10 gap-1"
                >
                  <span>Resolve</span>
                  <PhArrowRight :size="12" aria-hidden="true" />
                </Button>

                <!-- Mark read/unread button -->
                <button
                  type="button"
                  class="size-8 flex items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  :aria-label="n.read ? 'Mark as unread' : 'Mark as read'"
                  @click.stop="store.toggleRead(n.id)"
                >
                  <component
                    :is="n.read ? PhEnvelopeSimple : PhEnvelopeSimpleOpen"
                    :size="15"
                    aria-hidden="true"
                  />
                </button>

                <!-- Delete button -->
                <button
                  type="button"
                  class="size-8 flex items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-destructive hover:border-destructive/20 hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Delete notification"
                  @click.stop="store.deleteNotification(n.id)"
                >
                  <PhTrash :size="15" aria-hidden="true" />
                </button>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
