import type { Metadata } from 'next'
import { CalendarDemo } from '@/components/calendar-demo'

export const metadata: Metadata = { title: 'Calendrier' }

const CalendarPage = () => (
  <div className="mx-auto max-w-[1100px] px-4 pb-[90px] pt-4 min-[521px]:px-6 min-[521px]:pt-5 min-[821px]:px-[52px] min-[821px]:pb-[70px] min-[821px]:pt-6">
    <CalendarDemo />
  </div>
)

export default CalendarPage
