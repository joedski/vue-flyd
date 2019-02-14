import flyd from 'flyd'
import vmHasProp from './vmHasProp'

export default function StreamsManager(vm) {
  const config = vm.$options.streams
  return {
    $sources: {},
    $sinks: null,

    $createSource(
      name,
      watchBinding = name,
      watchHandler,
      watchOptions = { immediate: true }
    ) {
      if (watchHandler != null && typeof watchHandler !== 'function') {
        watchOptions = watchHandler
      }
      if (typeof watchHandler !== 'function') {
        watchHandler = stream => next => stream(next)
      }

      const sourceStream = (() => {
        // If it's a stream, then subscribe to it directly, bypassing vue.
        // We can check this because $createSource is called in $data, which is itself
        // called in the data hook on the component, and props are available there.
        if (typeof watchBinding === 'string' && vmHasProp(vm, watchBinding) && flyd.isStream(vm[watchBinding])) {
          return Object.assign(flyd.map(
            next => next,
            vm[watchBinding]
          ), {
            // Noop to preserve interface.
            $watch() {},
          })
        }
        else {
          return Object.assign(flyd.stream(), {
            $watch() {
              // Nothing to watch if we're not watching.
              if (!watchBinding) return

              vm.$watch(
                // NOTE: When the watchBinding is a function, it's called
                // with the vm as the context.
                watchBinding,
                watchHandler(sourceStream),
                // NOTE: When passing `immediate: true`, a value will be
                // immediately pushed into the stream!
                watchOptions
              )
            },
          })
        }
      })()

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
