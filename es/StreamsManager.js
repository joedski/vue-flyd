import flyd from 'flyd'

// TODO: Don't need to pass in manager, can just return controller + sources + sinks
// and do stuff with them to the manager.  Or just drop the manager name altogether.
export default function StreamsManager(vm) {
  const config = vm.$options.streams
  const hasConfig = !!config && typeof config === 'object'
  const componentName = vm.$options.name || '(Anonymous Component)'

  if (hasConfig && !(
    typeof config.sources === 'function'
    && typeof config.sinks === 'function'
  )) {
    throw new Error(`StreamsController cannot be created for ${componentName}: vm.$options.streams.sources and vm.$options.streams.sinks must both be functions`)
  }

  return {
    watches: [],
    sources: null,
    sinks: null,

    createStreams() {
      if (!hasConfig) {
        this.sources = {}
        this.sinks = {}
      }
      else {
        this.sources = config.sources.call(vm, {
          fromWatch: (binding, options) => this.createStreamFromWatch(binding, options),
        })

        if (! this.sources) {
          console.warn(`StreamsController(${componentName}): vm.$options.sources() did not return an object`)
          this.sources = {}
        }
        if (! Object.values(this.sources).every(flyd.isStream)) {
          console.warn(`StreamsController(${componentName}): object returned by vm.$options.sources() has properties which are not streams`)
        }

        this.sinks = config.sinks.call(vm, this.sources)

        if (! this.sinks) {
          console.warn(`StreamsController(${componentName}): vm.$options.sinks() did not return an object`)
          this.sinks = {}
        }
        if (! Object.values(this.sinks).every(flyd.isStream)) {
          console.warn(`StreamsController(${componentName}): object returned by vm.$options.sinks() has properties which are not streams`)
        }
      }

      return {
        sources: this.sources,
        sinks: this.sinks,
      }
    },

    createStreamFromWatch(binding, options) {
      const stream = flyd.stream()
      this.watches.push(() => {
        vm.$watch(binding, next => stream(next), { immediate: true, ...options })
      })
      return stream
    },

    data() {
      return Object.entries(this.sinks).reduce(
        (acc, [key, stream]) => {
          // TODO: This?  Or undefined?  Hm.
          acc[key] = stream()
          return acc
        },
        {}
      )
    },

    watch() {
      Object.entries(this.sinks).forEach(([key, stream]) => {
        stream.pipe(flyd.on(e => { vm[key] = e }))
      })
      this.watches.forEach(watchFn => watchFn())
    },

    end() {
      Object.values(this.sources).forEach((stream) => {
        stream.end(true)
      })
    },
  }
}
