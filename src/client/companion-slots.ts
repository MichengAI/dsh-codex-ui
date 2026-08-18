/** 读取侧栏配套插槽是否已被其他插件实际注册。 */
export type CompanionSlotName = 'sidebar.channels' | 'sidebar.schedule'

export type SlotOccupancySource = {
  entriesOfSlot?: (name: CompanionSlotName) => readonly unknown[]
  entries?: (name: CompanionSlotName) => readonly unknown[]
  subscribe?: (name: CompanionSlotName, listener: () => void) => () => void
}

export type CompanionTabAvailability = {
  readonly channels: boolean
  readonly schedule: boolean
}

export const EMPTY_COMPANION_TABS: CompanionTabAvailability = {
  channels: false,
  schedule: false,
}

/** 插槽声明本身不算占用；只有其他插件 register 后才视为已安装。 */
export function readSlotEntries(slots: SlotOccupancySource | undefined, name: CompanionSlotName): readonly unknown[] {
  if (slots === undefined) return []
  const read = slots.entriesOfSlot ?? slots.entries
  if (typeof read !== 'function') return []
  try {
    return read.call(slots, name) ?? []
  } catch {
    return []
  }
}

export function slotHasEntries(slots: SlotOccupancySource | undefined, name: CompanionSlotName): boolean {
  return readSlotEntries(slots, name).length > 0
}

export function companionTabAvailability(slots: SlotOccupancySource | undefined): CompanionTabAvailability {
  return {
    channels: slotHasEntries(slots, 'sidebar.channels'),
    schedule: slotHasEntries(slots, 'sidebar.schedule'),
  }
}

export function sameCompanionTabs(left: CompanionTabAvailability, right: CompanionTabAvailability): boolean {
  return left.channels === right.channels && left.schedule === right.schedule
}

/** 给 React useSyncExternalStore 用的配套页签快照源。 */
export function createCompanionTabSource(slots: SlotOccupancySource | undefined): {
  getSnapshot: () => CompanionTabAvailability
  subscribe: (onStoreChange: () => void) => () => void
} {
  let cached = companionTabAvailability(slots)
  return {
    getSnapshot() {
      const next = companionTabAvailability(slots)
      if (sameCompanionTabs(next, cached)) return cached
      cached = next
      return cached
    },
    subscribe(onStoreChange) {
      if (slots === undefined || typeof slots.subscribe !== 'function') return () => {}
      const offChannels = slots.subscribe('sidebar.channels', onStoreChange)
      const offSchedule = slots.subscribe('sidebar.schedule', onStoreChange)
      return () => {
        offChannels?.()
        offSchedule?.()
      }
    },
  }
}
