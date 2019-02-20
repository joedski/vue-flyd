import flyd from 'flyd'

export default function StreamsManager(vm) {
  const createStreams = vm.$options.streams || (() => ({ sources: {}, sinks: {} }))
  const hasConfig = typeof createStreams === 'function'
  const componentName = vm.$options.name || '(Anonymous Component)'

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
        const streams = createStreams.call(vm, {
          fromWatch: (binding, options) => this.createStreamFromWatch(binding, options),
        })

        /* eslint-disable no-console */
        if (streams) {
          this.sources = streams.sources || {}
          this.sinks = streams.sinks || {}
        }
        else {
          console.warn(`StreamsController(${componentName}): vm.$options.streams() did not return an object`)
          this.sources = {}
          this.sinks = {}
        }

        if (! this.sources) {
          console.warn(`StreamsController(${componentName}): object returned by vm.$options.streams() did not contain a sources property`)
          this.sources = {}
        }
        if (! Object.values(this.sources).every(flyd.isStream)) {
          console.warn(`StreamsController(${componentName}): object returned by vm.$options.sources() has properties which are not streams`)
        }

        if (! this.sinks) {
          console.warn(`StreamsController(${componentName}): object returned by vm.$options.sinks() did not contain a sinks property`)
          this.sinks = {}
        }
        if (! Object.values(this.sinks).every(flyd.isStream)) {
          console.warn(`StreamsController(${componentName}): object returned by vm.$options.sinks() has properties which are not streams`)
        }
        /* eslint-enable no-console */
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
