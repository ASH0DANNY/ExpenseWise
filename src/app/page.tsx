
"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Landmark, TrendingDown } from "lucide-react"
import { format } from "date-fns"
import type { Expense } from "@/types"; // Import the Expense type

// Define localStorage keys
const LOCAL_STORAGE_KEY_EXPENSES = 'expenseWiseApp_expenses';
const LOCAL_STORAGE_KEY_SUMMARY = 'expenseWiseApp_summary'; // For summary data (optional)

// Mock data (fallback)
const mockExpensesData: Expense[] = [
  { id: 1, date: new Date(2024, 6, 28), category: "Groceries", vendor: "SuperMart", amount: 75.50 },
  { id: 2, date: new Date(2024, 6, 27), category: "Utilities", vendor: "City Power", amount: 120.00 },
  { id: 3, date: new Date(2024, 6, 26), category: "Dining Out", vendor: "Pizza Place", amount: 45.25 },
  { id: 4, date: new Date(2024, 6, 25), category: "Transport", vendor: "Gas Station", amount: 50.00 },
  { id: 5, date: new Date(2024, 6, 24), category: "Entertainment", vendor: "Cinema", amount: 30.00 },
];
const mockSummaryData = {
  income: 5000, // Example income, consider how to manage this
  expenses: 0, // Will be calculated
  balance: 0, // Will be calculated
};

export default function DashboardPage() {
    const [expenses, setExpenses] = React.useState<Expense[]>(() => {
    if (typeof window !== 'undefined') {
      const savedExpenses = localStorage.getItem(LOCAL_STORAGE_KEY_EXPENSES);
      if (savedExpenses) {
        try {
          const parsedExpenses = JSON.parse(savedExpenses).map((exp: any) => ({
            ...exp,
            date: new Date(exp.date) // Convert date string back to Date object
          }));
          return parsedExpenses;
        } catch (error) {
          console.error("Error parsing expenses from local storage:", error);
          return mockExpensesData;
        }
      }
    }
    return mockExpensesData;
  });

  // Calculate summary data based on loaded expenses
  const summaryData = React.useMemo(() => {
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    // Assuming a fixed income for now, or load from localStorage if implemented
    const income = mockSummaryData.income;
    return {
      income: income,
      expenses: totalExpenses,
      balance: income - totalExpenses,
    };
  }, [expenses]); // Recalculate when expenses change

  // Get the 5 most recent expenses
  const recentExpenses = React.useMemo(() => {
      // Sort expenses by date descending and take the top 5
      return [...expenses] // Create a copy before sorting
               .sort((a, b) => b.date.getTime() - a.date.getTime())
               .slice(0, 5);
  }, [expenses]);


    // Effect to listen for changes in localStorage (e.g., if an expense is added/deleted on another page)
    React.useEffect(() => {
      const handleStorageChange = (event: StorageEvent) => {
        if (event.key === LOCAL_STORAGE_KEY_EXPENSES && event.newValue) {
          try {
            const updatedExpenses = JSON.parse(event.newValue).map((exp: any) => ({
              ...exp,
              date: new Date(exp.date)
            }));
            setExpenses(updatedExpenses);
          } catch (error) {
            console.error("Error parsing expenses update from storage event:", error);
          }
        }
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('storage', handleStorageChange);
        // Initial load check (redundant with useState initializer but safe)
        const currentSavedExpenses = localStorage.getItem(LOCAL_STORAGE_KEY_EXPENSES);
        if (currentSavedExpenses) {
            try {
                 const parsedExpenses = JSON.parse(currentSavedExpenses).map((exp: any) => ({
                    ...exp,
                    date: new Date(exp.date)
                 }));
                 setExpenses(parsedExpenses);
            } catch {}
        }
      }

      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('storage', handleStorageChange);
        }
      };
    }, []); // Empty dependency array means this runs once on mount


  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">${summaryData.income.toFixed(2)}</div>
             {/* <p className="text-xs text-muted-foreground">+20.1% from last month</p> */}
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">${summaryData.expenses.toFixed(2)}</div>
             {/* <p className="text-xs text-muted-foreground">+180.1% from last month</p> */}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining Balance</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summaryData.balance.toFixed(2)}</div>
             {/* <p className="text-xs text-muted-foreground">+19% from last month</p> */}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
           {recentExpenses.length === 0 ? (
             <p className="text-center text-muted-foreground">No recent expenses recorded.</p>
           ) : (
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Date</TableHead>
                   <TableHead>Category</TableHead>
                   <TableHead>Vendor</TableHead>
                   <TableHead className="text-right">Amount</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {recentExpenses.map((expense) => (
                   <TableRow key={expense.id}>
                     <TableCell>{format(expense.date, "yyyy-MM-dd")}</TableCell>
                     <TableCell><Badge variant="secondary">{expense.category}</Badge></TableCell>
                     <TableCell>{expense.vendor || "-"}</TableCell>
                     <TableCell className="text-right">${expense.amount.toFixed(2)}</TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           )}
        </CardContent>
      </Card>
    </div>
  )
}

    