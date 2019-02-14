export default function vmHasProp(vm, propName) {
  const vmPropsDef = vm.$options.props

  if (!vmPropsDef) return false
  if (Array.isArray(vmPropsDef)) return vmPropsDef.includes(pn => pn === propName)
  return pn in vmPropsDef
}
