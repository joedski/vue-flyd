describe('StreamsMixin', () => {
  it('should import without issue', () => {
    expect(() => {
      expect(require('../../es/StreamsMixin').default).toBeTruthy()
    }).not.toThrow()
  })

  describe('Usage', () => {
    const Vue = require('vue/dist/vue')
    const StreamsMixin = require('../../es/StreamsMixin').default
    const errors = []

    Vue.config.errorHandler = function (error, vm, info) {
      errors.push({ error, vm, info })
    }

    beforeEach(() => {
      errors.length = 0
    })

    it('should not cause an error when a component using it does not specify any streams config', async () => {
      const TestComponent = {
        mixins: [StreamsMixin],

        template: `
          <h1>Hi!</h1>
        `,
      }

      const app = new Vue({
        render: h => h(TestComponent),
      })

      app.$mount()
      await Vue.nextTick()

      expect(errors.length).toEqual(0)
    })

    it('should cause an error when a component has sources() but not sinks()', async () => {
      const TestComponent = {
        mixins: [StreamsMixin],

        streams: {
          sources() { return {} },
        },

        template: `<h1>Hi!</h1>`,
      }

      const app = new Vue({
        render: h => h(TestComponent),
      })

      app.$mount()

      await Vue.nextTick()

      expect(errors.length).toBeGreaterThan(0)
    })

    it('should cause an error when a component has sinks() but not sources()', async () => {
      const TestComponent = {
        mixins: [StreamsMixin],

        streams: {
          sinks() { return {} },
        },

        template: `<h1>Hi!</h1>`,
      }

      const app = new Vue({
        render: h => h(TestComponent),
      })

      app.$mount()

      await Vue.nextTick()

      expect(errors.length).toBeGreaterThan(0)
    })
  })
})
