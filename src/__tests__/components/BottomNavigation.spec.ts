import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BottomNavigation from '@/components/BottomNavigation.vue'

describe('BottomNavigation Component', () => {
  it('renders the component', () => {
    const wrapper = mount(BottomNavigation, {
      global: {
        stubs: {
          Menu: true,
          Search: true,
          Plus: true,
        },
      },
    })

    expect(wrapper.exists()).toBe(true)
  })

  it('renders navigation buttons', () => {
    const wrapper = mount(BottomNavigation, {
      global: {
        stubs: {
          Menu: true,
          Search: true,
          Plus: true,
        },
      },
    })

    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBe(3) // Menu, Search, Add buttons
  })

  it('has appropriate ARIA labels', () => {
    const wrapper = mount(BottomNavigation, {
      global: {
        stubs: {
          Menu: true,
          Search: true,
          Plus: true,
        },
      },
    })

    const buttons = wrapper.findAll('button')
    const ariaLabels = buttons.map((btn) => btn.attributes('aria-label'))

    expect(ariaLabels).toContain('Menu')
    expect(ariaLabels).toContain('Search')
    expect(ariaLabels).toContain('Add task')
  })

  it('buttons are clickable', async () => {
    const wrapper = mount(BottomNavigation, {
      global: {
        stubs: {
          Menu: true,
          Search: true,
          Plus: true,
        },
      },
    })

    const buttons = wrapper.findAll('button')
    for (const button of buttons) {
      await button.trigger('click')
      // Should not throw
      expect(true).toBe(true)
    }
  })

  it('has proper styling classes', () => {
    const wrapper = mount(BottomNavigation, {
      global: {
        stubs: {
          Menu: true,
          Search: true,
          Plus: true,
        },
      },
    })

    const nav = wrapper.find('nav')
    expect(nav.exists()).toBe(true)
    expect(nav.classes()).toContain('bottom-nav')
  })
})
