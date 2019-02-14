vue-flyd
========

Use [flyd](https://github.com/paldepind/flyd) in [Vue](https://vuejs.org/)!

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

  streams(source) {
    const incrementClicks = source('incrementClicks')
    const currentCount = incrementClicks.pipe(flyd.scan(
      acc => acc + 1,
      0
    ))
    return {
      currentCount,
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

// now every component can have streams()!
```




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
  streams(source) {
    // ... sources and intermediate streams!

    return {
      // ... sinks!
    }
  },
}
```


### Component Option: The Streams Definition Function `streams(source)`

> NOTE: Do NOT reference `this.$streams` within the Streams Definition Function!  You should also not directly access props, data or otherwise, within the Streams Definition Function.  Use `source('streamName', 'propName')` instead to create a stream that streams values of that prop, or `source('streamName', () => (this.propName + this.otherPropName))` to use a derivation.

The `StreamsMixin` adds support for the Component Option `streams(source)`, which is the Streams Definition Function.

The Streams Definition Function receives the following arguments:

- `source: (name, watchBinding, watchHandler, watchOptions) => Stream<*>` is a function that declares a Source Stream, optionally with extra arguments to automatically create a Vue Watch Binding and link it to that stream.
    - Parameters:
        - `name: string` The name of this Source Stream.
            - Required.
        - `watchBinding: string | Function` Watches an expression or result of a function.  Anything you can pass to [`vm.$watch()`](https://vuejs.org/v2/api/#vm-watch) you can pass in here, too.
            - Default: `undefined`.  If no `watchBinding` is passed, [`$watch`](https://vuejs.org/v2/api/#vm-watch) is not called.
            - NOTE: Because the Streams Definition Function `streams()` is called with the Vue Component Instance as its context, using arrow functions for the Watch Binding is perfectly fine.
        - `watchHandler: stream => (next, prev) => any` Handler that defines how watched values are pushed into the stream.
            - Default: `stream => next => stream(next)` Just pushes the next value onto the stream.
        - `watchOptions: Partial<{ deep: boolean, immediate: boolean }>` [Options to pass to `$watch`](https://vuejs.org/v2/api/#vm-watch).
            - Default: `{ immediate: true }` By default, watch bindings are immediate to ensure the stream always has an initial value.
    - Return Value: `{ [sinkName: string]: Stream }`
        - An object mapping names of sinks to streams.
    - Alternate Interfaces:
        - `(name: string) => Stream<*>` Create a stream without any watching.
        - `(name: string, watchBinding: string | Function) => Stream<*>` Create a stream, watching the given binding.
        - `(name: string, watchBinding: string | Function, watchOptions: Object) => Stream<*>` Create a Stream, watching the given binding, with the given options.
        - `(name: string, watchBinding: string | Function, watchHandler: stream => (prev, next) => any) => Stream<*>` Create a Stream, watching the given binding, using the given handler.

#### How the Streams Definition Function `stream(source)` Integrates With the Component

When ever you call `source(name, ...)` to create a Source Stream in your Streams Definition Function, a new Stream will be created and attached to `this.$streams.$sources` at the given name.  Additionally, this stream will be aliased to the same name on `this.$streams` for laziness.

Thus, if you call `source('foo')`, a new Stream is created, and will appear in both of these places:
- `this.$streams.$sources.foo`
- `this.$streams.foo`

The value you return from the Streams Definition Function must be an object mapping names to streams.  All such streams returned will be attached to `this.$streams.$sinks`.

As an added convenience, a Data Prop will be created for each stream returned in the Sinks object.  Each Data Prop holds current value of the same-named Sink Stream so that you can use these values in the Vue template, among other places.  This is how updates to streams cause updates in Vue.

Thus, if you return `{ bar: someDerivedStream }`, you'll have the following available:
- The Stream itself at `this.$streams.$sinks.bar`
- The current value of the Stream at `this.bar`

#### Example Calls

```js
export default {
    mixins: [StreamsMixin],

    streams(source) {
        // (name) => Stream<*>
        const sourceWithNoWatch = source('bareSource')
        // (name, watchBinding) => Stream<*>
        const sourceWithPropWatch = source('propSource', 'someProp')
        // (name, watchBinding) => Stream<*>
        const sourceWithFunctionWatch = source('funSource', () => (this.someProp + this.otherProp))
        // (name, watchBinding, watchHandler) => Stream<*>
        const sourceWithPropWatchAndHandler = source(
            'doublePropSource',
            'otherProp',
            stream => (prev, next) => stream([prev, next])
        )
        // (name, watchBinding, watchOptions) => Stream<*>
        const sourceWithDeepWatcher = source(
            'deepPropSource',
            'someObjectProp',
            { deep: true, immediate: true }
        )
        // (name, watchBinding, watchHandler, watchOptions) => Stream<*>
        const sourceWithDeepWatcherAndHandler = source(
            'deepPropSource',
            'someObjectProp',
            stream => (prev, next) => stream([prev, next])
            { deep: true, immediate: true }
        )

        const bigFatArrayOfEverything = flyd.combine(
            (...deps, self, changed) => {
                return deps.map(dep => dep())
            },
            [sourceWithNoWatch, sourceWithPropWatch, sourceWithFunctionWatch, sourceWithPropWatchAndHandler, sourceWithDeepWatcher]
        )

        // return sinks.
        return {
            bigFatArrayOfEverything
        }
    },

    watch: {
        // this.bigFatArrayOfEverything holds the current value of the stream this.$streams.$sinks.bigFatArrayOfEverything
        bigFatArrayOfEverything(next) {
            console.log('bigFatArrayOfEverything:', next)
        }
    }
}
```
