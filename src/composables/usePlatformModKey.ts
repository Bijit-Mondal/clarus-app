import { computed } from 'vue'

/**
 * Returns the platform modifier key label for shortcut hints
 * (⌘ on Apple, Ctrl elsewhere).
 */
export function usePlatformModKey() {
  const isApple = computed(() => {
    if (typeof navigator === 'undefined') return false
    return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent)
  })

  const modKey = computed(() => (isApple.value ? '⌘' : 'Ctrl'))
  const modKeyLabel = computed(() => (isApple.value ? 'Command' : 'Control'))

  /** Compact hint: `⌘K` on Apple, `Ctrl+K` elsewhere. */
  function shortcut(key: string) {
    return computed(() =>
      isApple.value ? `⌘${key.toUpperCase()}` : `Ctrl+${key.toUpperCase()}`,
    )
  }

  return { isApple, modKey, modKeyLabel, shortcut }
}
