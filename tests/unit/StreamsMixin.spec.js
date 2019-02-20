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

      it('should work if only sources are returned', async () => {
        expect.assertions(1)

        // though it will log to the console... Hm.
        const TestComponent = {
          mixins: [StreamsMixin],

          streams() {
            return {
              sources: {
                clicks: flyd.stream(),
              },
            }
          },

          template: `<div>hi</div>`
        }

        const app = new Vue(TestComponent)

        app.$mount()

        await Vue.nextTick()

        expect(errors.length).toEqual(0)
      })

      it('should work if only sinks are returned', async () => {
        expect.assertions(1)

        // though it will log to the console... Hm.
        const TestComponent = {
          mixins: [StreamsMixin],

          streams() {
            return {
              sinks: {
                foo: flyd.stream('foo'),
              },
            }
          },

          template: `<div>foo: {{ foo }}</div>`,
        }

        const app = new Vue(TestComponent)

        app.$mount()

        await Vue.nextTick()

        expect(errors.length).toEqual(0)
      })
    })

    describe('Basic Usage', () => {
      it('should create Data values for each Sink', async () => {
        const TestComponent = {
          mixins: [StreamsMixin],

          streams() {
            return {
              sources: {},
              sinks: {
                foo: flyd.stream(1),
                bar: flyd.stream('yay'),
              }
            }
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

          streams() {
            const foo = flyd.stream(1)
            const bar = foo.pipe(flyd.scan((acc, v) => acc + v, 0))
            return {
              sources: { foo },
              sinks: { bar },
            }
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

          streams() {
            const foo = flyd.stream(1)
            const bar = foo.pipe(flyd.scan((acc, v) => acc + v, 0))
            return {
              sources: { foo },
              sinks: { bar },
            }
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

    describe('Utilities', () => {
      describe('fromWatch', () => {
        it('should create a stream from watch expressions on Props', async () => {
          const TestComponent = {
            name: 'TestComponent',

            mixins: [StreamsMixin],

            props: {
              name: {
                type: String,
              },
            },

            streams({ fromWatch }) {
              const name = fromWatch('name')
              const greetings = name.pipe(flyd.map(s => `Hello, ${s}!`))

              return {
                sources: { name },
                sinks: { greetings },
              }
            },

            template: `<div>{{ greetings }}</div>`
          }

          const app = new Vue({
            data: {
              name: 'Sky',
            },

            components: { TestComponent },

            template: `<test-component :name="name" />`,
          })

          app.$mount()
          await Vue.nextTick()

          expect(app.$el.textContent).toEqual('Hello, Sky!')

          app.name = 'World'
          await Vue.nextTick()

          expect(app.$el.textContent).toEqual('Hello, World!')
        })

        it('should create a stream from watch expressions on Data', async () => {
          const TestComponent = {
            name: 'TestComponent',

            mixins: [StreamsMixin],

            data() {
              return {
                name: 'Sky',
              }
            },

            streams({ fromWatch }) {
              const name = fromWatch('name')
              const greetings = name.pipe(flyd.map(s => `Hello, ${s}!`))

              return {
                sources: { name },
                sinks: { greetings },
              }
            },

            template: `<div>{{ greetings }}</div>`
          }

          const app = new Vue(TestComponent)

          app.$mount()
          await Vue.nextTick()

          expect(app.$el.textContent).toEqual('Hello, Sky!')

          app.name = 'World'
          await Vue.nextTick()

          expect(app.$el.textContent).toEqual('Hello, World!')
        })
      })
    })
  })
})
