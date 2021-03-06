vue-flyd
========

Use [flyd](https://github.com/paldepind/flyd) in [Vue](https://vuejs.org/)!  Make a delicious Vuebeer [Float](https://github.com/paldepind/flyd#the-name)!

> NOTE: While in v0.x, API may not be stable!

This is kind of silly, but could offer you an easy way to try out streams if you're coming from a vue background.  Or, possibly, you have a few components with very hairy interactions and you want to leverage the power of streams to manage that complexity.  Or you just like bolting things together without regard for others' sanity! :D

I made this in a fit of pique when trying to embed some other webapp in a webapp that already embeds too many other webapps, where all those webapps could cause events the others had to respond to.  I already had to resort to notating things in streams just to make sense of all the moving parts, so I figured, why should I have to translate all that back into imperative-procedural malarkey?



## Usage

```sh
npm install --save vue-flyd
```

Then you can do this in your component

```html
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
import { StreamsMixin } from 'vue-flyd'

export default {
  name: 'Counter',
  
  mixins: [StreamsMixin],
  
  streams() {
    const incrementClicks = flyd.stream()
    const currentCount = incrementClicks.pipe(flyd.scan(
      acc => acc + 1,
      0
    ))
    return {
      sources: { incrementClicks },
      sinks: { currentCount },
    }
  },
}
</script>
```

You can also use it as a plugin:

```js
import Vue from 'vue'
import VueFlyd from 'vue-flyd'

Vue.use(VueFlyd)
```

Now every component can have `streams()`!




# API



## Use as a Plugin

As noted above, you can install vue-flyd as a plugin:

```js
import Vue from 'vue'
import VueFlyd from 'vue-flyd'

Vue.use(VueFlyd)
```



## Use as a Mixin: `StreamsMixin`

The plugin applies the `StreamsMixin` at the top level.  You can also import it directly and apply it only to components you want to have streams, as shown below.

```js
import { StreamsMixin } from 'vue-flyd'

export default {
  mixins: [StreamsMixin],

  // Now you can setup streams in this component option:
  streams({ fromWatch }) {
    // First, define your sources...
    // Then, define processing and sinks...
    return {
      sources: { /* ... sources exposed here */ },
      sinks: { /* ... sinks exposed here */ },
    }
  },
}
```


### Component Option `streams`

The `StreamsMixin` adds support for a Component Option named `streams`, which is a function.  You use this function to define the per-instance streams of your component.

- Type: `(utilities: Utilities) => { sources: { [name: string]: Stream<any> }, sinks: { name: string]: Stream<any> } }`

#### Parameters of Component Option `streams`

The Component Option `streams` has one parameter:

- `utilities: { [utilityName: string]: any }`
    - An object holding a collection of utility functions.  Currently there is only one utility function.
    - `utilities.fromWatch: (binding, options = { immediate: true }) => Stream`
        - Creates a new Stream which is updated by the watched property or value.  This utility function can be used to watch other Data Values in a Vue Component, or stream changes of the Vue Component's Props.  Anything you can pass to [`vm.$watch()`](https://vuejs.org/v2/api/#vm-watch), basically.
        - Parameters:
            - `binding: string | () => TWatchValue` A watch binding passed to [`vm.$watch()`](https://vuejs.org/v2/api/#vm-watch).  The value that results from that watch binding will be pushed into the resultant Stream.
            - `options: Partial<{ immediate: boolean, deep: boolean }> | void` Optional Options passed to [`vm.$watch()`](https://vuejs.org/v2/api/#vm-watch).
                - By default, `options.immediate` is `true` unless you explicitly pass `false` for that option.
        - Returns:
            - `Stream<TWatchValue>` A stream that will have values from the Watch Binding.

#### Return Value of Component Option `streams`

- Type: `{ sources: { [name: string]: Stream<any> }, sinks: { [name: string]: Stream<any> } }`
- An object with two keys: `sources` and `sinks`, each an object one mapping names to Streams.
    - Sources returned will be accessible at `this.$streams.$sources[sourceName]` and are aliased at `this.$streams[sourceName]` for convenience.
        - These Source Streams are the inputs into your stream processing stuff, and they're where you'll push inputs into, for instance, DOM events or component events of various sorts.
    - The Sink Streams will be accessible at `this.$streams.$sinks[sinkName]`.
        - Each Sink Stream returned will result in a Data prop of the same name which will hold the current value of that Sink Stream.



## Example: `fromWatch()`

```js
export default {
  mixins: [StreamsMixin],

  streams({ fromWatch }) {
    // For things like event streams, we just create a plain stream.
    const mouseEvents = flyd.stream()

    // For creating a stream from a prop, we can just watch the prop.
    const labelProp = fromWatch('prop')

    // For some cases, you can watch a derivation instead of just a prop.
    const combinedProp = fromWatch(() => this.a + this.b)

    // You can also pass options to fromWatch().
    const deepProp = fromWatch('someObjectProp', { deep: true })

    // Do something with the sources from above.
    const bigFatArrayOfEverything = flyd.combine(
      (...deps, self, changed) => {
        return deps.map(dep => dep())
      },
      [sources.mouseEvents, sources.labelProp, sources.combinedProp, sources.deepProp]
    )

    return {
      sources: { mouseEvents, labelProp, combinedProp, deepProp },
      sinks: { bigFatArrayOfEverything },
    }
  },
}
```



## Example: Counter with Reset

```html
<template lang="html">
  <div class="counter">
    <!-- Here we have a Data value that's automatically updated by a Sink Stream of the same name -->
    <div class="counter-value">{{ currentCount }}</div>
    <div class="counter-controls">
      <!--
        Here, we use some Source Streams as the event handlers.
        This results in those events being pushed straight into the streams.
      -->
      <button @click="$streams.incrementClicks">Increment</button>
      <button @click="$streams.resetClicks">Reset</button>
    </div>
  </div>
</template>

<script>
import flyd from 'flyd'

import { StreamsMixin } from 'vue-flyd'

export default {
  name: 'CounterWithReset',

  mixins: [StreamsMixin],

  streams() {
    // For clicks and other DOM events, we just create plain streams,
    // Then as noted above, we shove events straight into them.
    const incrementClicks = flyd.stream()
    const resetClicks = flyd.stream()

    // Just to make things short, I made the actions plain functions...
    const actionTypes = {
      increment: acc => acc + 1,
      reset: () => 0,
    }

    // Replace each event with a function to call instead,
    // and merge those function streams together...
    const clickActions = flyd.merge(
      incrementClicks.map(() => actionTypes.increment),
      resetClicks.map(() => actionTypes.reset)
    )

    // Then just scan over the stream of functions that come through.
    const currentCount = clickActions.pipe(flyd.scan((acc, fn) => fn(acc), 0))

    // Finally, return any Sinks we want to expose to Vue.
    // A new Data value will be created with the same name for each Sink Stream.
    return {
      sources: { incrementClicks, resetClicks },
      sinks: { currentCount },
    }
  },
}
</script>
```
