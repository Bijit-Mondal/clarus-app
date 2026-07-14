import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
import FrameworkRequirementsPage from './FrameworkRequirementsPage.vue'

describe('FrameworkRequirementsPage', () => {
  it('mounts and handles route updates/unmount without error', async () => {
    const router = createRouter({
      history: createWebHistory(),
      routes: [
        {
          path: '/dashboard/compliance/frameworks/:frameworkId/requirements',
          name: 'compliance-framework-requirements',
          component: FrameworkRequirementsPage,
        },
        {
          path: '/dashboard/compliance/frameworks',
          name: 'compliance-frameworks',
          component: { template: '<div>Frameworks</div>' },
        },
      ],
    })

    router.push(
      '/dashboard/compliance/frameworks/0283e924e4f00ffbed32/requirements?name=ISO+27001&publisher=ISO',
    )
    await router.isReady()

    const wrapper = mount(FrameworkRequirementsPage, {
      global: {
        plugins: [router, createPinia()],
      },
    })

    expect(wrapper.exists()).toBe(true)

    // Simulate navigation away
    router.push('/dashboard/compliance/frameworks')
    await router.isReady()

    // Unmount
    wrapper.unmount()
  })
})
