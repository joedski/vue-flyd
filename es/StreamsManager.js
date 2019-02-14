import flyd from 'flyd'

export default function StreamsManager(vm) {
  const config = vm.$options.streams
  return {
    $sources: {},
    $sinks: null,

    $createSource(
      name,
      watchBinding = name,
      watchOptions = { immediate: true }
    ) {
      const sourceStream = Object.assign(flyd.stream(), {
        $watch() {
          // Nothing to watch if we're not watching.
          if (!watchBinding) return

          vm.$watch(
            // NOTE: When the watchBinding is a function, it's called
            // with the vm as the context.
            watchBinding,
            next => sourceStream(next),
            // NOTE: When passing `immediate: true`, a value will be
            // immediately pushed into the stream!
            watchOptions
          )
        },
      })

      this[name] = this.$sources[name] = sourceStream

      return sourceStream
    },

    $data() {
      this.$sinks = config
        ? config.call(
          vm,
          (name, watchBinding, watchOptions) =>
            this.$createSource(name, watchBinding, watchOptions)
        )
        : {}

      return Object.keys(this.$sinks).reduce(
        (acc, key) => {
          acc[key] = this.$sinks[key]()
          return acc
        },
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
