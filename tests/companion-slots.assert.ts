import assert from 'node:assert/strict'
import { companionTabAvailability, createCompanionTabSource, readSlotEntries, slotHasEntries } from '../src/client/companion-slots.ts'

const empty = {
  entries: (_name: string) => [],
}
assert.equal(slotHasEntries(undefined, 'sidebar.channels'), false)
assert.deepEqual(readSlotEntries(empty, 'sidebar.channels'), [])
assert.deepEqual(companionTabAvailability(empty), { channels: false, schedule: false })

const occupied = {
  entries(name: string) {
    if (name === 'sidebar.channels') return [{ id: 'im' }]
    return []
  },
}
assert.equal(slotHasEntries(occupied, 'sidebar.channels'), true)
assert.equal(slotHasEntries(occupied, 'sidebar.schedule'), false)
assert.deepEqual(companionTabAvailability(occupied), { channels: true, schedule: false })

const both = {
  entries(name: string) {
    if (name === 'sidebar.channels') return [{ id: 'im' }]
    if (name === 'sidebar.schedule') return [{ id: 'automation' }]
    return []
  },
}
assert.deepEqual(companionTabAvailability(both), { channels: true, schedule: true })

const listeners: Array<() => void> = []
const source = createCompanionTabSource({
  entries: (name: string) => name === 'sidebar.schedule' ? [{ id: 'automation' }] : [],
  subscribe(_name, listener) {
    listeners.push(listener)
    return () => {
      const index = listeners.indexOf(listener)
      if (index >= 0) listeners.splice(index, 1)
    }
  },
})
const first = source.getSnapshot()
assert.deepEqual(first, { channels: false, schedule: true })
assert.equal(source.getSnapshot(), first)
const off = source.subscribe(() => {})
assert.equal(listeners.length, 2)
off()
assert.equal(listeners.length, 0)
