import flyd from 'flyd'

// TODO: Don't need to pass in manager, can just return controller + sources + sinks
// and do stuff with them to the manager.  Or just drop the manager name altogether.
export default function StreamsManager(vm) {
  const config = vm.$options.streams
  const hasConfig = !!config && typeof config === 'object'

  if (hasConfig && !(
    typeof config.sources === 'function'
    && typeof config.sinks === 'function'
  )) {
    throw new Error(`StreamsController cannot be created for ${vm.$options.name || '(Anonymous Component)'}: vm.$options.streams.sources and vm.$options.streams.sinks must both be functions`)
  }

  return {
    watches: [],
    sources: null,
    sinks: null,

    createStreams() {
      if (!hasConfig) return

      // TODO: Check return value
      this.sources = config.sources.call(vm, {
        fromWatch: (binding, options) => this.createStreamFromWatch(binding, options),
      })

      // TODO: Check return value
      this.sinks = config.sinks.call(vm, this.sources)

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
