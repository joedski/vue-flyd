<template lang="html">
  <div class="counter">
    <div class="counter-value">{{ currentCount }}</div>
    <div class="counter-controls">
      <button @click="$streams.incrementClicks">Increment</button>
      <button @click="$streams.resetClicks">Reset</button>
    </div>
  </div>
</template>

<script>
import flyd from 'flyd'

import StreamsMixin from '../../es/StreamsMixin'

export default {
  name: 'CounterWithReset',

  mixins: [
    StreamsMixin,
  ],

  streams() {
    const incrementClicks = flyd.stream()
    const resetClicks = flyd.stream()

    const actionTypes = {
      increment: acc => acc + 1,
      reset: () => 0,
    }

    const clickActions = flyd.merge(
      incrementClicks.map(() => actionTypes.increment),
      resetClicks.map(() => actionTypes.reset)
    )

    const currentCount = clickActions.pipe(flyd.scan((acc, fn) => fn(acc), 0))

    return {
      sources: { incrementClicks, resetClicks },
      sinks: { currentCount },
    }
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
