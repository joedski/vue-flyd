import StreamsManager from './StreamsManager'

export default {
  beforeCreate() {
    this.$streams = StreamsManager(this)
  },

  data() {
    return this.$streams.$data()
  },

  created() {
    this.$streams.$watch()
  },

  beforeDestroy() {
    this.$streams.$end()
  },
}
