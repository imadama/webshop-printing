import { Text } from "@modules/common/components/ui"

const MedusaCTA = () => {
  return (
    <Text className="txt-compact-small text-ui-fg-muted">
      © {new Date().getFullYear()} Popify
    </Text>
  )
}

export default MedusaCTA
