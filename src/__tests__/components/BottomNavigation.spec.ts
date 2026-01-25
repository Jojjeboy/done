import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import BottomNavigation from '@/components/BottomNavigation.vue'

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useRoute: () => ({
    path: '/',
  }),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

describe('BottomNavigation Component', () => {
  it('renders the component', () => {
    const wrapper = mount(BottomNavigation, {
      global: {
        stubs: {
          Home: true,
          Plus: true,
          Settings: true,
        },
      },
    })

    expect(wrapper.exists()).toBe(true)
  })

  it('renders all 3 navigation buttons', () => {
    const wrapper = mount(BottomNavigation, {
      global: {
        stubs: {
          Home: true,
          Plus: true,
          Settings: true,
        },
      },
    })

    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBe(3)
  })

  it('has appropriate ARIA labels', () => {
    const wrapper = mount(BottomNavigation, {
      global: {
        stubs: {
          Home: true,
          Plus: true,
          Settings: true,
        },
      },
    })

    const buttons = wrapper.findAll('button')
    const ariaLabels = buttons.map((btn) => btn.attributes('aria-label'))

    expect(ariaLabels).toContain('common.appName')
    expect(ariaLabels).toContain('tasks.addTask')
    expect(ariaLabels).toContain('settings.title')
    expect(ariaLabels).not.toContain('projects.title')
  })

  it('emits openAddTask event when add button is clicked', async () => {
    const wrapper = mount(BottomNavigation, {
      global: {
        stubs: {
          Home: true,
          Plus: true,
          Settings: true,
        },
      },
    })

    const addButton = wrapper.find('button[aria-label="tasks.addTask"]')
    await addButton.trigger('click')

    expect(wrapper.emitted('openAddTask')).toBeTruthy()
  })

  it('has proper styling classes', () => {
    const wrapper = mount(BottomNavigation, {
      global: {
        stubs: {
          Home: true,
          Plus: true,
          Settings: true,
        },
      },
    })

    const nav = wrapper.find('nav')
    expect(nav.exists()).toBe(true)
    expect(nav.classes()).toContain('bottom-nav')
  })
})
