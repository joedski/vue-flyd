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

  streams(source) {
    // Two separate inputs...
    const incrementClicks = source('incrementClicks')
    const resetClicks = source('resetClicks')

    // Let's map those objects to meaningful values.
    const clickActions = flyd.merge(
      incrementClicks.map(() => 'increment'),
      resetClicks.map(() => 'reset')
    )

    // Now create a derived stream, scanning over those action names.
    // Yeah, yeah, you just recreated redux.  It only gets better from here, though.
    const currentCount = clickActions.pipe(flyd.scan(
      (acc, action) => {
        switch (action) {
          case 'reset': return 0
          default:
          case 'increment': return acc + 1
        }
      },
      0
    ))

    return {
      currentCount,
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
