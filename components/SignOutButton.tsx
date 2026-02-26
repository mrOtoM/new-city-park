import { LogOut } from 'lucide-react'
import { signOutAction } from '@/services/users'
import Button from '@/components/Button'

export default function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Button
        variant="ghost"
        fullWidth
        icon={<LogOut className="text-primary-600 h-5 w-5" />}
        className="justify-start px-5 font-semibold"
      >
        Odhlásiť sa
      </Button>
    </form>
  )
}
