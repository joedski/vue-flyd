describe('plugin.js', () => {
  it('should import without issue', () => {
    expect(() => {
      expect(require('../../es/plugin').default).toBeTruthy()
    }).not.toThrow()
  })

  it('should apply without issue', () => {
    const plugin = require('../../es/plugin').default
    expect(typeof plugin.install).toEqual('function')
    const Vue = require('vue')
    expect(() => {
      Vue.use(plugin)
    }).not.toThrow()
  })
})
