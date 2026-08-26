export function createTriggerController({ threshold = 5, onTrigger }) {
  let count = 0

  return {
    click() {
      count += 1
      if (count >= threshold) {
        count = 0
        onTrigger?.()
      }
      return count
    },
    reset() {
      count = 0
    },
    getCount() {
      return count
    },
  }
}
