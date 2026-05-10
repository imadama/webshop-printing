import { Module } from "@medusajs/framework/utils"
import PrintingService from "./service"

export const PRINTING_MODULE = "printing"

export default Module(PRINTING_MODULE, {
  service: PrintingService,
})
