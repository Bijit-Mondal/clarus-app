<script setup lang="ts">
import {
  PhMoon,
  PhSidebarSimple,
  PhSignOut,
  PhSun,
  PhUser,
  PhUserCircle,
} from '@phosphor-icons/vue'
import ClarusAiInput from '@/components/shell/ClarusAiInput.vue'
import MobilePageNav from '@/components/shell/MobilePageNav.vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'

const { collapsed, toggle } = useSidebar()
const { isDark, toggleTheme } = useTheme()

// Keep the menu open when toggling the theme so the change is visible in place.
function onThemeSelect(event: Event) {
  event.preventDefault()
  toggleTheme()
}
</script>

<template>
  <header
    class="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4 lg:px-6"
  >
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

    <div class="flex min-w-0 flex-1 items-center justify-center md:justify-start">
      <ClarusAiInput />
    </div>

    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button
          variant="ghost"
          class="relative size-9 shrink-0 rounded-full p-0"
          aria-label="Open profile menu"
        >
          <Avatar class="size-9">
            <AvatarImage src="" alt="Alex Morgan" />
            <AvatarFallback class="bg-primary/10 text-sm font-medium text-primary">
              AM
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="w-56">
        <DropdownMenuLabel class="font-normal">
          <div class="flex flex-col gap-1">
            <p class="text-sm font-medium leading-none">Alex Morgan</p>
            <p class="text-xs leading-none text-muted-foreground">
              alex@clarus.app
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <PhUserCircle :size="16" class="mr-2" aria-hidden="true" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem>
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
        <DropdownMenuItem variant="destructive">
          <PhSignOut :size="16" class="mr-2" aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </header>
</template>
