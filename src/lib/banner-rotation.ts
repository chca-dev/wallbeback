const rotationEpochUtc = Date.UTC(2026, 0, 5)
const weekMilliseconds = 7 * 24 * 60 * 60 * 1000

type RotationMember = {
  id: string
  createdAt: Date
}

export const getBannerKing = <T extends RotationMember>(members: T[], now = new Date()) => {
  if (!members.length) return null

  const orderedMembers = [...members].sort((left, right) => (
    left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id)
  ))
  const parisDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  const [year, month, day] = parisDate.split('-').map(Number)
  const currentDateUtc = Date.UTC(year, month - 1, day)
  const daySinceMonday = (new Date(currentDateUtc).getUTCDay() + 6) % 7
  const currentMondayUtc = currentDateUtc - daySinceMonday * 24 * 60 * 60 * 1000
  const weekIndex = Math.floor((currentMondayUtc - rotationEpochUtc) / weekMilliseconds)
  const memberIndex = ((weekIndex % orderedMembers.length) + orderedMembers.length) % orderedMembers.length

  return orderedMembers[memberIndex]
}
