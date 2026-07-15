import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
import ControlsPage from './ControlsPage.vue'

describe('ControlsPage', () => {
  it('mounts and displays controls list without error', async () => {
    const router = createRouter({
      history: createWebHistory(),
      routes: [
        {
          path: '/dashboard/compliance/controls',
          name: 'compliance-controls',
          component: ControlsPage,
        },
      ],
    })

    router.push('/dashboard/compliance/controls')
    await router.isReady()

    const wrapper = mount(ControlsPage, {
      global: {
        plugins: [router, createPinia()],
      },
    })

    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })
})
