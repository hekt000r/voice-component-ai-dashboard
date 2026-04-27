import { create } from "zustand"
const inventoryData = require("../data.json")

const useInventoryStore = create((set) => ({
  inventory: inventoryData,
  setData: (newInventory: any[]) => set({ inventory: newInventory }),
}))