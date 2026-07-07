import { createSharedComposable, useColorMode } from '@vueuse/core'
import { computed } from 'vue'

/**
 * Single source of truth for the app's color scheme.
 * Persists the user's choice to localStorage and toggles the `.dark`
 * class on <html> to drive the Tailwind `dark` variant. Shared across
 * every caller so the toggle and any observers stay in sync.
 */
export const useTheme = createSharedComposable(() => {
  const mode = useColorMode({
    storageKey: 'clarus-theme',
    attribute: 'class',
    selector: 'html',
    initialValue: 'auto',
    modes: { light: '', dark: 'dark' },
  })

  // `mode.value` resolves `auto` to the system preference, so it is always
  // either `light` or `dark` when read here.
  const isDark = computed(() => mode.value === 'dark')

  function toggleTheme() {
    mode.value = isDark.value ? 'light' : 'dark'
  }

  return { mode, isDark, toggleTheme }
})
