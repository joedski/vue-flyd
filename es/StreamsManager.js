import flyd from 'flyd'

export default function StreamsManager(vm) {
  const config = vm.$options.streams

  const manager = {
    $sources: {},
    $sinks: {},
    $controller: null,
  }

  manager.$controller = StreamsController(vm, config, manager)

  return manager
}

// TODO: Don't need to pass in manager, can just return controller + sources + sinks
// and do stuff with them to the manager.  Or just drop the manager name altogether.
function StreamsController(vm, config, manager) {
  const hasConfig = !!config && typeof config === 'object'

  if (hasConfig && !(
    typeof config.sources === 'function'
    && typeof config.sinks === 'function'
  )) {
    throw new Error(`StreamsController cannot be created for ${vm.$options.name || '(Anonymous Component)'}: vm.$options.streams.sources and vm.$options.streams.sinks must both be functions`)
  }

  return {
    watches: [],

    initializeStreams() {
      if (!hasConfig) return

      // TODO: Check return value
      const sources = config.sources.call(vm, {
        fromWatch: (binding, options) => this.createStreamFromWatch(binding, options),
      })

      // TODO: Check return value
      const sinks = config.sinks.call(vm, sources)

      Object.assign(manager.$sources, sources)
      // Alias sources to the manager for lazy access.
      Object.assign(manager, sources)
      Object.assign(manager.$sinks, sinks)
    },

    createStreamFromWatch(binding, options) {
      const stream = flyd.stream()
      this.watches.push(() => {
        vm.$watch(binding, next => stream(next), { immediate: true, ...options })
      })
      return stream
    },

    data() {
      return Object.entries(manager.$sinks).reduce(
        (acc, [key, stream]) => {
          // TODO: This?  Or undefined?  Hm.
          acc[key] = stream()
          return acc
        },
        {}
      )
    },

    watch() {
      Object.entries(manager.$sinks).forEach(([key, stream]) => {
        stream.pipe(flyd.on(e => { vm[key] = e }))
      })
      this.watches.forEach(watchFn => watchFn())
    },

    end() {
      Object.values(manager.$sources).forEach((stream) => {
        stream.end(true)
      })
    },
  }
}

// export default function StreamsManager(vm) {
//   const config = vm.$options.streams
//   return {
//     $sources: {},
//     $sinks: null,

//     $createSource(
//       name,
//       watchBinding = name,
//       watchOptions = { immediate: true }
//     ) {
//       const sourceStream = Object.assign(flyd.stream(), {
//         $watch() {
//           // Nothing to watch if we're not watching.
//           if (!watchBinding) return

//           vm.$watch(
//             // NOTE: When the watchBinding is a function, it's called
//             // with the vm as the context.
//             watchBinding,
//             next => sourceStream(next),
//             // NOTE: When passing `immediate: true`, a value will be
//             // immediately pushed into the stream!
//             watchOptions
//           )
//         },
//       })

//       this[name] = this.$sources[name] = sourceStream

//       return sourceStream
//     },

//     $data() {
//       this.$sinks = config
//         ? config.call(
//           vm,
//           (name, watchBinding, watchOptions) =>
//             this.$createSource(name, watchBinding, watchOptions)
//         )
//         : {}

//       return Object.keys(this.$sinks).reduce(
//         (acc, key) => {
//           acc[key] = this.$sinks[key]()
//           return acc
//         },
//         {}
//       )
//     },

//     $watch() {
//       Object.keys(this.$sources).forEach(key => this.$sources[key].$watch())
//       Object.keys(this.$sinks).forEach(key => flyd.on(
//         v => { vm[key] = v },
//         this.$sinks[key]
//       ))
//     },

//     $end() {
//       Object.keys(this.$sources).forEach(key => this.$sources[key].end(true))
//     }
//   }
// }
