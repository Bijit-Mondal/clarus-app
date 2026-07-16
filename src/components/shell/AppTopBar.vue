<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getModulePagePath } from '@/config/navigation'
import {
  PhMoon,
  PhSidebarSimple,
  PhSignOut,
  PhSun,
  PhUser,
  PhUserCircle,
} from '@phosphor-icons/vue'
import AskClarusButton from '@/components/shell/AskClarusButton.vue'
import GlobalSearchDialog from '@/components/shell/GlobalSearchDialog.vue'
import MobilePageNav from '@/components/shell/MobilePageNav.vue'
import NotificationCenter from '@/components/shell/NotificationCenter.vue'
import OrgSwitcher from '@/components/shell/OrgSwitcher.vue'
import SearchTrigger from '@/components/shell/SearchTrigger.vue'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import { useAuth } from '@/composables/useAuth'

const { collapsed, toggle } = useSidebar()
const { isDark, toggleTheme } = useTheme()
const { accountQuery, logoutMutation } = useAuth()
const route = useRoute()
const router = useRouter()

const organizationSlug = computed(() =>
  typeof route.params.organizationSlug === 'string' ? route.params.organizationSlug : undefined,
)

const accountName = computed(() => {
  if (accountQuery.data.value?.name) return accountQuery.data.value.name
  return accountQuery.isPending.value ? 'Loading profile…' : 'Account'
})

const accountEmail = computed(() => accountQuery.data.value?.email ?? '')

const accountInitials = computed(() => {
  const name = accountQuery.data.value?.name?.trim() ?? ''
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
})

const searchOpen = ref(false)

function openSearch() {
  searchOpen.value = true
}

// Keep the menu open when toggling the theme so the change is visible in place.
function onThemeSelect(event: Event) {
  event.preventDefault()
  toggleTheme()
}

async function onLogout() {
  if (logoutMutation.isPending.value) return

  try {
    await logoutMutation.mutateAsync()
    await router.replace({ name: 'login' })
  } catch {
    // Keep the user on the page so the session can be retried if logout fails.
  }
}
</script>

<template>
  <header
    class="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-3 sm:gap-3 lg:px-5"
  >
    <div class="flex min-w-0 flex-1 items-center gap-1 sm:gap-1.5">
      <MobilePageNav />

      <Tooltip>
        <TooltipTrigger as-child>
          <button
            type="button"
            class="hidden size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex"
            :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
            :aria-pressed="!collapsed"
            @click="toggle"
          >
            <PhSidebarSimple :size="18" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" :side-offset="8">
          {{ collapsed ? 'Expand sidebar' : 'Collapse sidebar' }}
        </TooltipContent>
      </Tooltip>

      <OrgSwitcher />
    </div>

    <div class="flex min-w-0 flex-1 justify-center sm:flex-[2] lg:flex-[1.5]">
      <SearchTrigger class="sm:w-full sm:max-w-xl" @open="openSearch" />
    </div>

    <div class="flex flex-1 shrink-0 items-center justify-end gap-1.5 sm:gap-2">
      <AskClarusButton />
      <NotificationCenter />

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button
            variant="ghost"
            class="relative size-9 shrink-0 rounded-full p-0"
            aria-label="Open profile menu"
          >
            <Avatar class="size-9">
              <AvatarFallback class="bg-primary/10 text-sm font-medium text-primary">
                {{ accountInitials }}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-56">
          <DropdownMenuLabel class="font-normal">
            <div class="flex flex-col gap-1">
              <p class="text-sm font-medium leading-none">{{ accountName }}</p>
              <p v-if="accountEmail" class="text-xs leading-none text-muted-foreground">
                {{ accountEmail }}
              </p>
              <p v-else class="text-xs leading-none text-muted-foreground">
                {{ accountQuery.isError.value ? 'Profile unavailable' : 'Loading profile…' }}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              @select="router.push(getModulePagePath('settings', 'profile', organizationSlug))"
            >
              <PhUserCircle :size="16" class="mr-2" aria-hidden="true" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              @select="router.push(getModulePagePath('settings', 'account', organizationSlug))"
            >
              <PhUser :size="16" class="mr-2" aria-hidden="true" />
              Account settings
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem :aria-pressed="isDark" @select="onThemeSelect">
            <PhMoon v-if="!isDark" :size="16" class="mr-2" aria-hidden="true" />
            <PhSun v-else :size="16" class="mr-2" aria-hidden="true" />
            {{ isDark ? 'Light mode' : 'Dark mode' }}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            :disabled="logoutMutation.isPending.value"
            @select="onLogout"
          >
            <PhSignOut :size="16" class="mr-2" aria-hidden="true" />
            {{ logoutMutation.isPending.value ? 'Signing out…' : 'Sign out' }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <GlobalSearchDialog v-model:open="searchOpen" />
  </header>
</template>
