import flyd from 'flyd'

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
        // By default, immediate: true is used so that the initial value
        // of the watch expression/function will be used as the initial
        // value of the stream.
        // Explicitly pass immediate: false if you want to not have
        // an initial value in the stream.
        vm.$watch(binding, next => stream(next), { immediate: true, ...options })
      })
      return stream
    },

    data() {
      return Object.keys(this.sinks).reduce(
        (acc, key) => {
          // The value will be set (or not set) during `watch()`.
          acc[key] = undefined
          return acc
        },
        {}
      )
    },

    watch() {
      // Set all of the watch expressions first, to push initial values
      // into any sources.
      this.watches.forEach(watchFn => watchFn())

      // NOTE: This will immediately set the given property
      // if the stream has a value already in it.
      Object.entries(this.sinks).forEach(([key, stream]) => {
        stream.pipe(flyd.on(e => { vm[key] = e }))
      })
    },

    end() {
      Object.values(this.sources).forEach((stream) => {
        stream.end(true)
      })
    },
  }
}
