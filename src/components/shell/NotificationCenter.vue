<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  PhBell,
  PhCheck,
  PhChecks,
  PhHourglass,
  PhShieldWarning,
  PhFileText,
  PhCheckCircle,
  PhArrowRight,
  PhInfo,
} from '@phosphor-icons/vue'
import { useNotificationStore, type Notification } from '@/stores/notifications'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { scopeDashboardPath } from '@/config/navigation'

const router = useRouter()
const route = useRoute()
const store = useNotificationStore()

const isOpen = ref(false)
const filterType = ref<'all' | 'unread'>('all')

const filteredNotifications = computed(() => {
  if (filterType.value === 'unread') {
    return store.notifications.filter((n) => !n.read)
  }
  return store.notifications
})

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

function handleNotificationClick(n: Notification) {
  store.markAsRead(n.id)
  isOpen.value = false
  if (n.targetUrl) {
    const organizationSlug =
      typeof route.params.organizationSlug === 'string' ? route.params.organizationSlug : undefined
    router.push(scopeDashboardPath(organizationSlug, n.targetUrl))
  }
}

function handleViewAll() {
  isOpen.value = false
  const organizationSlug =
    typeof route.params.organizationSlug === 'string' ? route.params.organizationSlug : undefined
  router.push(scopeDashboardPath(organizationSlug, '/dashboard/notifications'))
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
</script>

<template>
  <Popover v-model:open="isOpen">
    <PopoverTrigger as-child>
      <button
        type="button"
        class="relative flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Open notifications menu"
        :aria-expanded="isOpen"
      >
        <PhBell :size="18" aria-hidden="true" />
        <span
          v-if="store.unreadCount > 0"
          class="absolute top-1.5 right-1.5 flex size-2.5 rounded-full bg-primary"
          aria-hidden="true"
        >
          <span
            class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"
          />
        </span>
      </button>
    </PopoverTrigger>

    <PopoverContent
      align="end"
      class="w-80 sm:w-96 p-0 shadow-lg border-border bg-popover text-popover-foreground"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3">
        <div class="flex items-center gap-1.5">
          <h2 class="text-sm font-semibold text-foreground">Notifications</h2>
          <span
            v-if="store.unreadCount > 0"
            class="rounded-full bg-primary/10 px-1.5 py-0.5 text-xxs font-medium text-primary"
          >
            {{ store.unreadCount }} new
          </span>
        </div>
        <button
          v-if="store.unreadCount > 0"
          type="button"
          class="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1.5 py-0.5"
          @click="store.markAllAsRead"
        >
          <PhChecks :size="14" aria-hidden="true" />
          Mark all read
        </button>
      </div>

      <Separator />

      <!-- Tabs -->
      <div class="flex gap-1 px-4 py-2 bg-muted/20">
        <button
          type="button"
          :class="[
            'px-2.5 py-1 text-xs font-medium rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            filterType === 'all'
              ? 'bg-background text-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          ]"
          @click="filterType = 'all'"
        >
          All
        </button>
        <button
          type="button"
          :class="[
            'px-2.5 py-1 text-xs font-medium rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            filterType === 'unread'
              ? 'bg-background text-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          ]"
          @click="filterType = 'unread'"
        >
          Unread
          <span
            v-if="store.unreadCount > 0"
            class="ml-1 px-1 rounded-full bg-primary/20 text-primary text-xxs"
          >
            {{ store.unreadCount }}
          </span>
        </button>
      </div>

      <Separator />

      <!-- Content -->
      <ScrollArea class="h-[360px] w-full">
        <div
          v-if="filteredNotifications.length === 0"
          class="flex flex-col items-center justify-center h-[300px] text-center p-6"
        >
          <div
            class="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground mb-3"
            aria-hidden="true"
          >
            <PhBell :size="20" class="opacity-60" />
          </div>
          <p class="text-sm font-medium text-foreground">No notifications</p>
          <p class="text-xs text-muted-foreground mt-1 max-w-[200px]">
            You're all caught up! When compliance events occur, they will appear here.
          </p>
        </div>

        <ul v-else class="divide-y divide-border/60" role="list">
          <li
            v-for="n in filteredNotifications"
            :key="n.id"
            :class="[
              'relative flex gap-3 p-3.5 hover:bg-muted/40 transition-colors cursor-pointer group',
              !n.read ? 'bg-muted/10' : '',
            ]"
            @click="handleNotificationClick(n)"
          >
            <!-- Unread Status Dot Indicator -->
            <span
              v-if="!n.read"
              class="absolute left-1.5 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-primary"
              aria-hidden="true"
            />

            <!-- Icon Column -->
            <div
              :class="[
                'flex size-8 shrink-0 items-center justify-center rounded-lg border text-sm',
                getSeverityStyles(n.severity, n.read),
              ]"
              aria-hidden="true"
            >
              <component :is="getNotificationIcon(n.type)" :size="16" />
            </div>

            <!-- Content Column -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <h3
                  :class="[
                    'text-xs leading-normal min-w-0 break-words text-balance',
                    !n.read ? 'font-semibold text-foreground' : 'font-normal text-muted-foreground',
                  ]"
                >
                  {{ n.title }}
                </h3>
                <span class="text-xxs text-muted-foreground whitespace-nowrap pt-0.5">
                  {{ formatTimeAgo(n.createdAt) }}
                </span>
              </div>
              <p class="text-xxs leading-relaxed text-muted-foreground mt-0.5 line-clamp-2">
                {{ n.description }}
              </p>

              <!-- Inline Action Trigger Indicator -->
              <div
                v-if="n.targetUrl"
                class="flex items-center gap-1 text-xxs font-medium text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span>Resolve alert</span>
                <PhArrowRight :size="10" aria-hidden="true" />
              </div>
            </div>

            <!-- Quick Mark-Read Button overlay to stop click propagation -->
            <button
              type="button"
              class="absolute right-3.5 bottom-3.5 size-5 flex items-center justify-center rounded border border-border bg-background text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              :aria-label="n.read ? 'Mark as unread' : 'Mark as read'"
              @click.stop="store.toggleRead(n.id)"
            >
              <PhCheck v-if="!n.read" :size="12" aria-hidden="true" />
              <span v-else class="size-1 bg-muted-foreground rounded-full" />
            </button>
          </li>
        </ul>
      </ScrollArea>

      <Separator />

      <!-- Footer -->
      <div class="p-2.5 bg-muted/10 flex justify-center">
        <button
          type="button"
          class="w-full text-center py-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          @click="handleViewAll"
        >
          View all notifications
        </button>
      </div>
    </PopoverContent>
  </Popover>
</template>
