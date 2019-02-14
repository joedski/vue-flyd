vue-flyd
========

Use [flyd](https://github.com/paldepind/flyd) in [Vue](https://vuejs.org/)!

This is kind of silly, but could offer you an easy way to try out streams if you're coming from a vue background.  Or, possibly, you have a few components with very hairy interactions and you want to leverage the power of streams to manage that complexity.  Or you just like bolting things together without regard for others' sanity! :D

I made this in a fit of pique when trying to embed some other webapp in a webapp that already embeds too many other webapps, where all those webapps could cause events the others had to respond to.  I already had to resort to notating things in streams just to make sense of all the moving parts, so I figured, why should I have to translate all that back into imperative-procedural malarkey?
