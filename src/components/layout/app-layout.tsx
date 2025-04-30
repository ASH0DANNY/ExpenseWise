"use client"

import * as React from "react"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  SidebarProvider,
  Sidebar,
  SidebarTrigger,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  ReceiptText,
  Users,
  Tags,
  Wallet,
  Settings,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <Wallet className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-semibold">ExpenseWise</h1>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/" passHref legacyBehavior>
                <SidebarMenuButton isActive={isActive('/')} tooltip="Dashboard">
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/expenses" passHref legacyBehavior>
                <SidebarMenuButton isActive={isActive('/expenses')} tooltip="Expenses">
                  <ReceiptText />
                  <span>Expenses</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/vendors" passHref legacyBehavior>
                <SidebarMenuButton isActive={isActive('/vendors')} tooltip="Vendors">
                  <Users />
                  <span>Vendors</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/categories" passHref legacyBehavior>
                <SidebarMenuButton isActive={isActive('/categories')} tooltip="Categories">
                  <Tags />
                  <span>Categories</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center gap-2 p-2 border-t">
             <Avatar className="h-8 w-8">
               <AvatarImage src="https://picsum.photos/40/40" alt="User Avatar" />
               <AvatarFallback>EW</AvatarFallback>
             </Avatar>
             <span className="text-sm font-medium group-data-[collapsible=icon]:hidden">User Profile</span>
            <Button variant="ghost" size="icon" className="ml-auto group-data-[collapsible=icon]:hidden">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="p-4 md:p-6">
        <div className="flex justify-between items-center mb-4 md:mb-6">
           <SidebarTrigger className="md:hidden" />
           {/* Can add breadcrumbs or page title here */}
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
