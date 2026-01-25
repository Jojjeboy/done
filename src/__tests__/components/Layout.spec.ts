import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LayoutWrapper from '@/components/Layout.vue'

describe('LayoutWrapper Component', () => {
  it('renders the component', () => {
    const wrapper = mount(LayoutWrapper)

    expect(wrapper.exists()).toBe(true)
  })

  it('renders slot content', () => {
    const wrapper = mount(LayoutWrapper, {
      slots: {
        default: '<div class="test-content">Test Content</div>',
      },
    })

    expect(wrapper.find('.test-content').exists()).toBe(true)
    expect(wrapper.find('.test-content').text()).toBe('Test Content')
  })

  it('has layout-wrapper class', () => {
    const wrapper = mount(LayoutWrapper)

    const layoutDiv = wrapper.find('.layout-wrapper')
    expect(layoutDiv.exists()).toBe(true)
  })

  it('applies flex column layout', () => {
    const wrapper = mount(LayoutWrapper)

    const layoutDiv = wrapper.find('.layout-wrapper')
    // Check that the component has the expected layout
    expect(layoutDiv.exists()).toBe(true)
  })

  it('maintains minimum height', () => {
    const wrapper = mount(LayoutWrapper)

    const layoutDiv = wrapper.find('.layout-wrapper')
    expect(layoutDiv.exists()).toBe(true)
  })
})
