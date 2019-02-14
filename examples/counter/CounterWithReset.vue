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

    // Some things to do...
    const actionsTypes = {
      increment: acc => acc + 1,
      reset: () => 0,
    }

    // Let's map those objects to meaningful values.
    const clickActions = flyd.merge(
      incrementClicks.map(() => actionsTypes.increment),
      resetClicks.map(() => actionsTypes.reset)
    )

    // Now create a derived stream, scanning over those action names.
    const currentCount = clickActions.pipe(flyd.scan(
      (acc, action) => action(acc),
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
