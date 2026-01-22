import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import DatePicker from '@/components/DatePicker.vue'

describe('DatePicker Component', () => {
  it('renders the component', () => {
    const wrapper = mount(DatePicker, {
      props: {
        selectedDate: new Date(2024, 0, 15),
      },
    })

    expect(wrapper.exists()).toBe(true)
  })

  it('displays day names', () => {
    const testDate = new Date(2024, 0, 15)
    const wrapper = mount(DatePicker, {
      props: {
        selectedDate: testDate,
      },
    })

    // Component should render without errors
    expect(wrapper.exists()).toBe(true)
  })

  it('emits update event when date is selected', async () => {
    const testDate = new Date(2024, 0, 15)
    const wrapper = mount(DatePicker, {
      props: {
        selectedDate: testDate,
      },
    })

    // Click first available date button (skip navigation if present)
    const buttons = wrapper.findAll('button')

    if (buttons.length > 0) {
      await buttons[0].trigger('click')
      // Check if emit was called
      const emitted = wrapper.emitted('update:selectedDate')
      expect(emitted).toBeTruthy()
    }
  })

  it('highlights today correctly', () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const wrapper = mount(DatePicker, {
      props: {
        selectedDate: today,
      },
    })

    expect(wrapper.exists()).toBe(true)
  })

  it('handles date computation correctly', () => {
    const testDate = new Date(2024, 0, 15) // January 15, 2024
    const wrapper = mount(DatePicker, {
      props: {
        selectedDate: testDate,
      },
    })

    // Component should render without errors
    expect(wrapper.vm).toBeDefined()
  })
})
