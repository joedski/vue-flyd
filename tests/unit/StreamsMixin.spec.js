describe('StreamsMixin', () => {
  it('should import without issue', () => {
    expect(() => {
      expect(require('../../es/StreamsMixin').default).toBeTruthy()
    }).not.toThrow()
  })

  describe('Usage', () => {
    const flyd = require('flyd')
    const Vue = require('vue/dist/vue')
    const StreamsMixin = require('../../es/StreamsMixin').default
    const errors = []

    Vue.config.errorHandler = function (error, vm, info) {
      errors.push({ error, vm, info })
    }

    beforeEach(() => {
      errors.length = 0
    })

    describe('Basic Setup and Configuration', () => {
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

    describe('Basic Usage', () => {
      it('should create Data values for each Sink', async () => {
        const TestComponent = {
          mixins: [StreamsMixin],

          streams: {
            sources() {
              return {}
            },
            sinks() {
              return {
                foo: flyd.stream(1),
                bar: flyd.stream('yay'),
              }
            },
          },

          template: `<div>foo: {{ foo }}, bar: {{ bar }}</div>`
        }

        const app = new Vue(TestComponent)

        app.$mount()

        await Vue.nextTick()

        expect(app.$data.foo).toEqual(1)
        expect(app.$data.bar).toEqual('yay')
        expect(app.$el).toBeTruthy()
        expect(app.$el.textContent).toEqual('foo: 1, bar: yay')
        expect(errors.length).toEqual(0)
      })

      it('should update Data values when Sinks are updated', async () => {
        const TestComponent = {
          mixins: [StreamsMixin],

          streams: {
            sources() {
              return {
                foo: flyd.stream(1),
              }
            },
            sinks(sources) {
              return {
                bar: sources.foo.pipe(flyd.scan((acc, v) => acc + v, 0)),
              }
            },
          },

          template: `<div>bar: {{ bar }}</div>`
        }

        const app = new Vue(TestComponent)

        app.$mount()

        await Vue.nextTick()

        expect(app.bar).toEqual(1)

        app.$streams.foo(5)

        // Streams and Data values update synchronously.
        expect(app.bar).toEqual(6)

        await Vue.nextTick()

        expect(app.$el.textContent).toEqual('bar: 6')
        expect(errors.length).toEqual(0)
      })

      it('should end() all streams during component teardown', async () => {
        const TestComponent = {
          mixins: [StreamsMixin],

          streams: {
            sources() {
              return {
                foo: flyd.stream(1),
              }
            },
            sinks(sources) {
              return {
                bar: sources.foo.pipe(flyd.scan((acc, v) => acc + v, 0)),
              }
            },
          },

          template: `<div>bar: {{ bar }}</div>`
        }

        const app = new Vue(TestComponent)

        app.$mount()

        await Vue.nextTick()

        app.$streams.foo(5)

        await Vue.nextTick()

        expect(app.$el.textContent).toEqual('bar: 6')
        expect(errors.length).toEqual(0)

        app.$destroy()

        expect(app.$streams.$sources.foo.end()).toEqual(true)
        expect(app.$streams.$sinks.bar.end()).toEqual(true)
      })
    })
  })
})
