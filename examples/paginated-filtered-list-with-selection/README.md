Example: Paginated Filtered List with Selection
===============================================

A real-world example that made me reach for streams in the first place.

> Maybe I should start with just the filtered paginated list, then add user selection after?

Here's the situation:
- Some _Data_ is loaded from a remote server in pages.
- This _Data_ can have _Filters_ applied to it.
    - These _Filters_ are supplied as a Prop, and are a map of Column Names to Lists of Values.
- _The User can Select Items_, which will result in emitting _Selection Events_.
    - _Selection Events_ contain a Column Name and a list of Values from the Column.
- _Selection Events_ can also come from outside, in which case they replace the _User Selection_.
- A change in the _Filters_ received results in clearing of the _User Selection_.

We can derive a few things from this:
- We will need to track the _Current Page_.  We'll do that here by Index, which is basically the same as the Page Number but suffering from a case of the Fence Posts.
- We will need two separate fetches to the API:
    1. _Fetch for the Current Page of Data_, Filtered by the _Current Filters_ and fetched by _Current Page_.
    2. _Fetch for the Current Selection_, filtered by the _Current Filters_ and fetched only when _Selection Events_ come in from outside.
        - We don't need to fetch when the User changes the Selection manually, because we know the extent of the change: The User changed this one value right here.

Reorganizing this, it looks like we have a few Sources:
- Events:
    - User Selects or Deselects an Item. `Select<Id> | Deselect<Id>`
    - User Changes the Page. `PrevPage | NextPage`
    - Selection Events from outside the Compoonent. `{ [columnName: string]: Array<string> }`
- Props/Data:
    - Filters, a Prop passed in to the Component. `{ [columnName: string]: Array<string> }`

For our Sinks, we have at minimum the following:
- Events:
    - Selection Events to outside the Component. `{ [columnName: string]: Array<string> }`
        - Depends on the Current Selection, Selection Events from Outside the Component, and User Selection Events.
        - Only actually sampled on User Selection Events, though.
    - Request for Current Page of Data. `Request`
        - Derived from Current Page Index, Filters.
        - Depends on User Page Change Events.
    - Request for Selection. `Request`
        - Derived from Filters, Currently Selected Column Values.
        - Depends on Selection Events from Outside Component.
        - Does NOT depend on User Item Selection Events:
            - For one thing, that would lead to a self-sustaining cycle, but for another, User Selections are Synchronous; only Selection Events cause an async fetch, which means only Selection Events cause a change in Current Request for Selection.
- Data:
    - Current Page Index. `number`
        - Requires Current Page Count.
        - Depends on User Page Change Events.
    - Current Page of Data. `AsyncData<Array<Item>>`
        - Requires Request for Current Page of Data
    - Current Selection. `AsyncData<Array<Item>>`
        - AKA User Selection.
        - Requires Request for Current Selection
        - Depends on the Filters, but only in as much as the Fliters changing results in this being set to `AsyncData.Result([])` (empty array).
        - Will be updated by Current Page of Data, just to keep Items synched.
            - NOTE: Obviously, this would show an area where normalization would provide a benefit, albeit a modest one.
    - Current Selection Values by Column `AsyncData<{ [column: string]: Array<string> }>`
        - Derived from Current Selection, 
    - Current Page Count. `number`
        - Derived from Current Page of Data.
    - Current Selection Count. `number`
        - Derived from the Current Selection.
    - Is User Allowed to Select Items. `boolean`
        - Derived from Current Page of Data and Current Selection.

Actual Fetching will be handled by a helper that maps a Request to a Promise, and the whole Emitting Events to Other Components bit will be handled by calling `this.$emit()` in some fashion.



## Derivation

Now that we have a better idea of what we need, we can start to derive things.

- Current Page Index:
    - NOTE: This has a few extra behaviors that make things a bit easier to deal with:
        - Page Index should never be bigger than the Current Page Count.
        - Should be reset to 0 when ever anything other than the Current Page Index changes the Current Page Request.



## Fun Additions

- Modify the the setup to keep the last loaded page of data available while loading the next page, but blanke out that data when the Filters change.
    - You could call that Last Loaded Page Data.



## Aside: Supporting Machinery

To make things a bit easier for me, I'm going to use `daggy` to make a tagged sum:
- `AsyncData<R, E>` represents a one-shot asynchronous process: It can be started, and can resolve once.
    - `NotAsked` when the data has not even been asked for, yet.
    - `Waiting` when the data has been asked for, but is pending.
    - `Error<E>` when the asynchronous process has ended due to an error.
    - `Result<R>` when the asynchronous process has ended and some result was obtained.

Further, I'll be wanting to actually fetch things in this fashion:

```js
import flyd from 'flyd'

// We only want the latest, so we use flyd/module/switchlatest.
// It's like chain, but stops events from the previous stream when a new stream comes up.
import switchLatest from 'flyd/module/switchLatest'

// Promise<R, E> -> Promise<AsyncData<R, E>, never>
const asyncDataPromise = promise => promise.then(AsyncData.Result).catch(AsyncData.Error)

// (TEvent -> Promise<R, E>) -> Stream<TEvent> -> Stream<AsyncData<R, E>>
// With the behavior that it first emits AsyncData.Waiting, then either AsyncData.Result<R> or AsyncData.Error<E>
const mapAsync = asyncFn => events => events
    .pipe(flyd.map(event => asyncDataPromise(asyncFn(event))))
    .pipe(promises => flyd.merge(
        promises.pipe(flyd.map(() => AsyncData.Waiting)),
        promises.pipe(flyd.map(flyd.fromPromise)).pipe(flyd.switchLatest)
    ))
```

It works like so:
- Each time a request is made, `AsyncData.Waiting` is emitted.
- Each time a request settles, `AsyncData.Error` or `AsyncData.Result` is emitted.

Then we can just use something like this:

```js
// :: (string | Request | [string, RequestInit]) -> Promise<Response>
// "streamable" because it works with only one input, though the one input may be a 2-tuple.
const streamableFetch = requestArgs => {
    if (! Array.isArray(requestArgs)) requestArgs = [requestArgs]
    return fetch.apply(null, requestArgs)
}
```

Fetch itself doesn't really error unless the fetch fails to go through entirely, so we'd need to add some extra handling for that.  But anyway!
