describe('index.js', () => {
  it('should import without issue', () => {
    expect(() => {
      const moduleIndex = require('../../es')
      expect(moduleIndex.default).toBeTruthy()
    }).not.toThrow()
  })
})
