import { createSharedComposable, useEventListener } from '@vueuse/core'
import { ref } from 'vue'

/**
 * Shared open state for the Clarus AI side panel.
 * Stays open until the user closes it (X or shortcut toggle).
 */
export const useClarusAi = createSharedComposable(() => {
  const open = ref(false)

  function openPanel() {
    open.value = true
  }

  function closePanel() {
    open.value = false
  }

  function togglePanel() {
    open.value = !open.value
  }

  useEventListener(
    typeof window !== 'undefined' ? window : undefined,
    'keydown',
    (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'j') return
      event.preventDefault()
      togglePanel()
    },
  )

  return { open, openPanel, closePanel, togglePanel }
})
