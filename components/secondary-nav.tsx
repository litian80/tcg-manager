'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Role, hasPermission } from '@/lib/rbac'
import { Breadcrumbs } from './breadcrumbs'

interface SecondaryNavProps {
  role: Role
}

export function SecondaryNav({ role }: SecondaryNavProps) {
  const pathname = usePathname()

  const links: { href: string; label: string }[] = []

  const canUploadTom = hasPermission(role, 'tom.upload')
  const canManageUsers = hasPermission(role, 'user.manage')
  const canManageTournaments = hasPermission(role, 'tournament.manage')

  if (canUploadTom) {
    links.push({
      href: '/organizer/tournaments',
      label: 'My Tournaments'
    })
    links.push({
      href: '/admin/upload',
      label: 'Upload TOM'
    })
  }

  if (canManageUsers) {
    links.push({
      href: '/admin/users',
      label: 'Users'
    })
  }

  if (canManageTournaments) {
    links.push({
      href: '/admin/tournaments',
      label: 'All Tournaments'
    })
  }

  // Display the Secondary Nav with Breadcrumbs
  return (
    <div className="border-b bg-muted/40 sticky top-0 z-40 backdrop-blur">
      <div className="container mx-auto px-4 min-h-12 py-2 flex items-center justify-between gap-4 overflow-x-auto scrollbar-hide">
        <div className="flex-shrink-0 flex items-center whitespace-nowrap">
          <Breadcrumbs />
        </div>
        
        {links.length > 0 && (
          <nav className="flex items-center gap-6 text-sm font-medium">
            {links.map((link) => {
              // Mark active if current path starts with it (except for root if there was one, but these are all paths like /admin/*)
              // We need to be careful with /admin/tournaments vs /admin/users vs /admin/upload
              const isActive = pathname.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "transition-colors hover:text-foreground whitespace-nowrap",
                    isActive ? "text-foreground font-semibold" : "text-foreground/60"
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>
        )}
      </div>
    </div>
  )
}
