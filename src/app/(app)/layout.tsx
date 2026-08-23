import { AppShell } from '@/components/app-shell'

const PrivateLayout = ({ children }: { children: React.ReactNode }) => (
  <AppShell>{children}</AppShell>
)

export default PrivateLayout
