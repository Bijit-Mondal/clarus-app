import { createSharedComposable, useStorage } from '@vueuse/core'

/**
 * Collapse state for the module (second-tier) sidebar. Persisted so the
 * user's preferred layout survives reloads. Shared across the layout, the
 * sidebar, and the top-bar toggle so they stay in sync.
 */
export const useSidebar = createSharedComposable(() => {
  const collapsed = useStorage('clarus-sidebar-collapsed', false)

  function toggle() {
    collapsed.value = !collapsed.value
  }

  return { collapsed, toggle }
})
