
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
  // SidebarMenuSub, // Commented out as unused
  // SidebarMenuSubItem, // Commented out as unused
  // SidebarMenuSubButton, // Commented out as unused
} from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  ReceiptText,
  Users,
  Tags,
  Wallet,
  // Settings, // Removed unused import
} from "lucide-react"
// import { Button } from "@/components/ui/button" // Commented out as unused
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useIsMobile } from "@/hooks/use-mobile" // Import useIsMobile

// Function to get page title from pathname
const getPageTitle = (pathname: string): string => {
    switch (pathname) {
      case '/':
        return 'Dashboard';
      case '/expenses':
        return 'Expenses';
      case '/vendors':
        return 'Vendors';
      case '/categories':
        return 'Categories';
      default:
        return 'ExpenseWise'; // Fallback title
    }
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isMobile = useIsMobile(); // Check if the device is mobile
  const pageTitle = getPageTitle(pathname);

  const isActive = (path: string) => pathname === path

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <Wallet className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-semibold group-data-[collapsible=icon]:hidden">ExpenseWise</h1>
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
            {/* Hide settings button when collapsed for cleaner look */}
            {/* <Button variant="ghost" size="icon" className="ml-auto group-data-[collapsible=icon]:hidden">
              <Settings className="h-4 w-4" />
            </Button> */}
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="p-4 md:p-6 bg-background"> {/* Added bg-background for content area */}
        <div className="flex justify-between items-center mb-4 md:mb-6">
           {/* Show trigger only on mobile */}
           {isMobile && <SidebarTrigger />}
           {/* Display Page Title */}
           <h2 className="text-xl md:text-2xl font-semibold text-foreground">{pageTitle}</h2>
           {/* Placeholder for potential actions on the right */}
           <div className="w-7 h-7"> {/* Keep layout consistent */}
             {!isMobile && <SidebarTrigger />} {/* Show trigger on desktop */}
           </div>
        </div>
        <main className="flex-grow"> {/* Added flex-grow to main content */}
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
