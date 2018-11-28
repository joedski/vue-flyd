Example: Paginated Filtered List with Selection
===============================================

A real-world example that made me reach for streams in the first place.

This example shows a data table with a list of items, but there's a few things to consider:
- The Items are loaded from the server in pages, because there could be many thousands of items.
- There's a set of Selected Items, which the User can manually modify by selecting or unselecting a given Item.
- Filters can be specified, and if they change, they should wipe out the current Selected Items.
- Selection Events can come in from outside, which should send a query to the remote server for what items would be selected based on both the current Filters _and_ the specific values in that Selection Event.

> TODO: Finish!
