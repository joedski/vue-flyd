import StreamsManager from './StreamsManager'

export default {
  beforeCreate() {
    const $manager = StreamsManager(this)
    const { sources, sinks } = $manager.createStreams()

    this.$streams = {
      // Spread sources into this for convenience' sake.
      ...sources,
      $sources: sources,
      $sinks: sinks,
      $manager,
    }
  },

  // data() comes before created(), as per the vue lifecycle spec.
  data() {
    return this.$streams.$manager.data()
  },

  created() {
    this.$streams.$manager.watch()
  },

  beforeDestroy() {
    this.$streams.$manager.end()
  },
}
