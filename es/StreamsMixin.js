import StreamsManager from './StreamsManager'

export default {
  beforeCreate() {
    this.$streams = StreamsManager(this)
    this.$streams.$controller.initializeStreams()
  },

  // data() comes before created(), as per the vue lifecycle spec.
  data() {
    return this.$streams.$controller.data()
  },

  created() {
    this.$streams.$controller.watch()
  },

  beforeDestroy() {
    this.$streams.$controller.end()
  },
}
