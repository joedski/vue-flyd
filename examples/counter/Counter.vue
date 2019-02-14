<template lang="html">
  <div class="counter">
    <div class="counter-value">{{ currentCount }}</div>
    <div class="counter-controls">
      <button @click="$streams.incrementClicks">Increment</button>
    </div>
  </div>
</template>

<script>
import flyd from 'flyd'

import StreamsMixin from '../../es/StreamsMixin'

export default {
  name: 'Counter',

  mixins: [
    StreamsMixin,
  ],

  streams: {
    sources() {
      // This creates a stream accessible via this.$streams.$sources.incrementClicks,
      // and aliased to this.$streams.incrementClicks.
      const incrementClicks = flyd.stream()
      return { incrementClicks }
    },
    sinks(sources) {
      // Now create a derived stream, scanning over input events by just summing them.
      const currentCount = sources.incrementClicks.pipe(flyd.scan(acc => acc + 1, 0))
      return { currentCount }
    },
  },
}
</script>

<style lang="css">
.counter-value {
  font-size: 5rem;
}

.counter-controls button {
  font-size: 2rem;
}
</style>
