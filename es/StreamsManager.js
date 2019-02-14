export default function StreamsManager(vm) {
  const config = vm.$options.streams
  return {
    $sources: {},
    $sinks: null,

    $createSource(
      name,
      watchBinding = name,
      watchHandler = stream => next => stream(next),
      watchOptions = {}
    ) {
      let sourceStream

      // If it's a stream, then subscribe to it directly, bypassing vue.
      // We can check this because $createSource is called in $data, which is itself
      // called in the data hook on the component, and props are available there.
      if (typeof watchBinding === 'string' && vmHasProp(vm, watchBinding) && flyd.isStream(vm[watchBinding])) {
        sourceStream = Object.assign(flyd.map(
          next => next,
          vm[watchBinding]
        ), {
          // Noop to preserve interface.
          $watch() {},
        })
      }
      else {
        sourceStream = Object.assign(flyd.stream(), {
          $watch() {
            // If the name doesn't exist as a prop, don't watch it.
            // This means you can create pure sources without an associated prop,
            // which is useful for passing in events.
            // TODO: Support path names?
            if (typeof watchBinding === 'string' && ! (watchBinding in vm)) {
              return
            }
            // Allow simple opt-out of automatic behavior.
            // Useful if you want a source to have the same name as a prop,
            // but don't want it to use $watch.  For some reason.
            if (typeof watchBinding === 'boolean' && ! watchBinding) {
              return
            }
            vm.$watch(
              // NOTE: When the watchBinding is a function, it's called
              // with the vm as the context.
              watchBinding,
              watchHandler(sourceStream),
              watchOptions
            )
          },
        })
      }

      this[name] = this.$sources[name] = sourceStream

      return sourceStream
    },

    $data() {
      this.$sinks = config
        ? config.call(
          vm,
          (name, watchBinding, watchHandler, watchOptions) =>
            this.$createSource(name, watchBinding, watchHandler, watchOptions)
        )
        : {}

      return Object.keys(this.$sinks).reduce(
        (acc, key) => (acc[key] = undefined, acc),
        {}
      )
    },

    $watch() {
      Object.keys(this.$sources).forEach(key => this.$sources[key].$watch())
      Object.keys(this.$sinks).forEach(key => flyd.on(
        v => { vm[key] = v },
        this.$sinks[key]
      ))
    },

    $end() {
      Object.keys(this.$sources).forEach(key => this.$sources[key].end(true))
    }
  }
}
