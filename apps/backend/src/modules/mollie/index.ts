import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import MollieProviderService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [MollieProviderService],
})
