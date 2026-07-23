import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createPinia } from 'pinia'
import ContextPage from './ContextPage.vue'
import { Button } from '@/components/ui/button'

const mockContexts = ref({
  contexts: [
    { $id: '1', section: 'product', content: '{"type":"doc","content":[]}', empty: true },
    { $id: '2', section: 'architecture', content: '{"type":"doc","content":[]}', empty: true },
    { $id: '3', section: 'team', content: '{"type":"doc","content":[]}', empty: true },
    { $id: '4', section: 'processes', content: '{"type":"doc","content":[]}', empty: true },
    { $id: '5', section: 'customers', content: '{"type":"doc","content":[]}', empty: true },
  ],
  total: 5,
})

const mutateAsyncSpy = vi.fn<any>().mockImplementation(({ section, content }) => {
  const ctx = mockContexts.value.contexts.find((c) => c.section === section)
  if (ctx) {
    ctx.content = content
    ctx.empty = !content || content === '{"type":"doc","content":[]}'
  }
  return Promise.resolve()
})

vi.mock('@/composables/useTenantContexts', () => ({
  useTenantContextsQuery: () => ({
    data: mockContexts,
    isLoading: ref(false),
    isError: ref(false),
    error: ref(null),
    refetch: vi.fn<any>(),
  }),
  useUpdateTenantContextMutation: () => ({
    mutateAsync: mutateAsyncSpy,
    isPending: ref(false),
  }),
}))

describe('ContextPage', () => {
  beforeEach(() => {
    mockContexts.value = {
      contexts: [
        { $id: '1', section: 'product', content: '{"type":"doc","content":[]}', empty: true },
        { $id: '2', section: 'architecture', content: '{"type":"doc","content":[]}', empty: true },
        { $id: '3', section: 'team', content: '{"type":"doc","content":[]}', empty: true },
        { $id: '4', section: 'processes', content: '{"type":"doc","content":[]}', empty: true },
        { $id: '5', section: 'customers', content: '{"type":"doc","content":[]}', empty: true },
      ],
      total: 5,
    }
    mutateAsyncSpy.mockClear()
  })

  function mountPage() {
    return mount(ContextPage, {
      global: {
        plugins: [createPinia()],
        stubs: {
          PageHeader: {
            template: '<header><h1>Context</h1></header>',
          },
          Button,
          ContextEditor: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          },
          ContextViewer: {
            props: ['value'],
            template: '<div class="viewer-stub">{{ value }}</div>',
          },
          PhPencilSimple: true,
          PhCheck: true,
          PhX: true,
          PhCircleNotch: true,
          PhWarning: true,
        },
      },
    })
  }

  it('renders all five context sections in empty view state', () => {
    const wrapper = mountPage()
    const titles = ['Product', 'Architecture', 'Team', 'Processes', 'Customers']

    for (const title of titles) {
      expect(wrapper.text()).toContain(title)
    }
    expect(wrapper.text()).toContain('No content yet. Click Edit to add one.')
    expect(wrapper.findAll('textarea')).toHaveLength(0)
  })

  it('opens edit mode and saves plain text content', async () => {
    const wrapper = mountPage()
    const editButtons = wrapper.findAll('button').filter((b) => b.text().includes('Edit'))
    expect(editButtons.length).toBe(5)

    await editButtons[0]!.trigger('click')
    expect(wrapper.find('textarea').exists()).toBe(true)

    await wrapper.find('textarea').setValue('  Clarus helps teams stay audit-ready.  ')
    const saveButton = wrapper.findAll('button').find((b) => b.text().includes('Save'))
    await saveButton!.trigger('click')

    expect(wrapper.find('textarea').exists()).toBe(false)
    expect(wrapper.text()).toContain('Clarus helps teams stay audit-ready.')

    const productSection = wrapper.find('#context-product-title').element.closest('section')
    expect(productSection?.textContent).toContain('Clarus helps teams stay audit-ready.')
    expect(productSection?.textContent).not.toContain('No content yet. Click Edit to add one.')
  })

  it('cancels edit without saving', async () => {
    const wrapper = mountPage()
    const editButtons = wrapper.findAll('button').filter((b) => b.text().includes('Edit'))

    await editButtons[0]!.trigger('click')
    await wrapper.find('textarea').setValue('Should not persist')
    const cancelButton = wrapper.findAll('button').find((b) => b.text().includes('Cancel'))
    await cancelButton!.trigger('click')

    expect(wrapper.find('textarea').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Should not persist')
    expect(wrapper.text()).toContain('No content yet. Click Edit to add one.')
  })
})
