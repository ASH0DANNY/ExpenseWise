
"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Landmark, TrendingDown, Loader2 } from "lucide-react"
import { format } from "date-fns"
import type { Expense } from "@/types"; // Import the Expense type
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

// Define localStorage keys
const LOCAL_STORAGE_KEY_EXPENSES = 'expenseWiseApp_expenses';
const LOCAL_STORAGE_KEY_SUMMARY = 'expenseWiseApp_summary'; // For summary data (optional)

// Mock data (used only if localStorage is empty or invalid)
const mockExpensesData: Expense[] = [
  { id: 1, date: new Date(2024, 6, 28), category: "Groceries", vendor: "SuperMart", amount: 75.50 },
  { id: 2, date: new Date(2024, 6, 27), category: "Utilities", vendor: "City Power", amount: 120.00 },
  { id: 3, date: new Date(2024, 6, 26), category: "Dining Out", vendor: "Pizza Place", amount: 45.25 },
  { id: 4, date: new Date(2024, 6, 25), category: "Transport", vendor: "Gas Station", amount: 50.00 },
  { id: 5, date: new Date(2024, 6, 24), category: "Entertainment", vendor: "Cinema", amount: 30.00 },
];
// Default summary, income might need a separate management/storage mechanism
const defaultSummaryData = {
  income: 5000,
  expenses: 0,
  balance: 5000,
};

export default function DashboardPage() {
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [isLoading, setIsLoading] = React.useState(true); // Add loading state
  const [income, setIncome] = React.useState(defaultSummaryData.income); // Manage income separately if needed

  // Load expenses from localStorage on client-side mount
  React.useEffect(() => {
    let loadedExpenses: Expense[] = [];
    const savedExpenses = localStorage.getItem(LOCAL_STORAGE_KEY_EXPENSES);
    if (savedExpenses) {
      try {
        const parsedExpenses = JSON.parse(savedExpenses).map((exp: any) => ({
          ...exp,
          date: new Date(exp.date) // Convert date string back to Date object
        }));
        loadedExpenses = parsedExpenses;
      } catch (error) {
        console.error("Error parsing expenses from local storage:", error);
        // Optionally use mock data as fallback, or just empty
        // loadedExpenses = mockExpensesData;
      }
    }
    // Use mock data if localStorage is empty (or handle as truly empty)
    // Remove this line if you don't want mock data as a default
    if (loadedExpenses.length === 0) {
        // loadedExpenses = mockExpensesData; // Uncomment to use mocks if empty
    }

    setExpenses(loadedExpenses);
    setIsLoading(false); // Set loading to false after data is loaded

    // --- Add localStorage listener ---
    const handleStorageChange = (event: StorageEvent) => {
        if (event.key === LOCAL_STORAGE_KEY_EXPENSES) {
            let updatedExpenses: Expense[] = [];
            if (event.newValue) {
                try {
                 updatedExpenses = JSON.parse(event.newValue).map((exp: any) => ({
                    ...exp,
                    date: new Date(exp.date)
                 }));
                } catch (error) {
                    console.error("Error parsing expenses update from storage event:", error);
                 }
            }
            // Update state only if the data is different to avoid infinite loops potentially
            // This comparison might need to be deeper depending on complexity
             if (JSON.stringify(expenses) !== JSON.stringify(updatedExpenses)) {
                setExpenses(updatedExpenses);
             }
        }
     };

      window.addEventListener('storage', handleStorageChange);

      // --- Cleanup listener ---
      return () => {
        window.removeEventListener('storage', handleStorageChange);
      };
    // Rerun effect if expenses state changes (to ensure listener always has latest state)
  }, []); // Empty dependency array ensures this runs only once on mount


  // Calculate summary data based on loaded expenses
  const summaryData = React.useMemo(() => {
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    return {
      income: income, // Use state variable for income
      expenses: totalExpenses,
      balance: income - totalExpenses,
    };
  }, [expenses, income]); // Recalculate when expenses or income change

  // Get the 5 most recent expenses
  const recentExpenses = React.useMemo(() => {
      // Sort expenses by date descending and take the top 5
      return [...expenses] // Create a copy before sorting
               .sort((a, b) => b.date.getTime() - a.date.getTime())
               .slice(0, 5);
  }, [expenses]);


  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {/* Income Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-3/4" />
            ) : (
              <div className="text-2xl font-bold text-primary">${summaryData.income.toFixed(2)}</div>
            )}
            {/* <p className="text-xs text-muted-foreground">+20.1% from last month</p> */}
          </CardContent>
        </Card>

        {/* Expenses Card */}
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoading ? (
               <Skeleton className="h-8 w-3/4" />
             ) : (
               <div className="text-2xl font-bold text-destructive">${summaryData.expenses.toFixed(2)}</div>
             )}
             {/* <p className="text-xs text-muted-foreground">+180.1% from last month</p> */}
          </CardContent>
        </Card>

        {/* Balance Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining Balance</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoading ? (
               <Skeleton className="h-8 w-3/4" />
             ) : (
               <div className="text-2xl font-bold">${summaryData.balance.toFixed(2)}</div>
             )}
             {/* <p className="text-xs text-muted-foreground">+19% from last month</p> */}
          </CardContent>
        </Card>
      </div>

      {/* Recent Expenses Table Card */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
           {isLoading ? (
             <div className="flex justify-center items-center p-4">
                 <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                 <span className="ml-2 text-muted-foreground">Loading expenses...</span>
            </div>
           ) : recentExpenses.length === 0 ? (
             <p className="text-center text-muted-foreground py-4">No recent expenses recorded.</p>
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
