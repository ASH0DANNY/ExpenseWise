
"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import {
    collection,
    getDocs,
    query,
    orderBy,
    limit,
    Timestamp, // Import Timestamp
    doc,
    getDoc,
    setDoc
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Landmark, TrendingDown, Loader2, Edit } from "lucide-react"
import { format } from "date-fns"
import type { Expense, IncomeSetting } from "@/types"; // Import types
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label";


// Query Keys
const EXPENSES_QUERY_KEY = "expenses";
const DASHBOARD_SUMMARY_QUERY_KEY = "dashboardSummary";
const INCOME_SETTING_QUERY_KEY = "incomeSetting";
const INCOME_DOC_ID = "userIncome"; // Use a fixed ID for the income setting document

// Firestore collection references
const expensesCollectionRef = collection(db, "expenses");
const settingsCollectionRef = collection(db, "settings"); // Collection for settings like income


// Helper to convert Firebase Timestamp to Date
const timestampToDate = (timestamp: Timestamp | Date): Date => {
    return timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
};

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isIncomeDialogOpen, setIsIncomeDialogOpen] = React.useState(false);
  const [newIncome, setNewIncome] = React.useState<number | string>("");

  // Fetch Income Setting
  const { data: incomeSetting, isLoading: isLoadingIncome, error: errorIncome } = useQuery<IncomeSetting>({
    queryKey: [INCOME_SETTING_QUERY_KEY],
    queryFn: async () => {
        const docRef = doc(settingsCollectionRef, INCOME_DOC_ID);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as IncomeSetting;
        } else {
            // Return a default if it doesn't exist, or handle accordingly
            return { id: INCOME_DOC_ID, amount: 0 }; // Default income to 0
        }
    },
    staleTime: Infinity, // Income setting likely doesn't change often externally
  });

  // Fetch Recent Expenses (limit 5)
  const { data: recentExpenses = [], isLoading: isLoadingExpenses, error: errorExpenses } = useQuery<Expense[]>({
    queryKey: [EXPENSES_QUERY_KEY, 'recent'], // Add 'recent' to differentiate
    queryFn: async () => {
        const q = query(expensesCollectionRef, orderBy("date", "desc"), limit(5));
        const querySnapshot = await getDocs(q);
        const expensesData = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                date: timestampToDate(data.date) // Convert Timestamp to Date
            } as Expense;
        });
        return expensesData;
    },
  });

   // Fetch ALL Expenses for calculation (consider performance for very large datasets)
   const { data: allExpenses = [], isLoading: isLoadingAllExpenses, error: errorAllExpenses } = useQuery<Expense[]>({
     queryKey: [EXPENSES_QUERY_KEY, 'all'], // Differentiate query key
     queryFn: async () => {
       // No limit, order not strictly necessary for sum but good practice
       const q = query(expensesCollectionRef, orderBy("date", "desc"));
       const querySnapshot = await getDocs(q);
       // Only return amount for calculation if needed, but full data might be useful elsewhere
       return querySnapshot.docs.map(doc => {
         const data = doc.data();
         return {
            id: doc.id,
            ...data,
            date: timestampToDate(data.date)
         } as Expense;
       });
     },
   });


  // Combined loading state for UI elements that depend on multiple queries
  const isLoading = isLoadingIncome || isLoadingExpenses || isLoadingAllExpenses;
  const loadError = errorIncome || errorExpenses || errorAllExpenses;


  // Calculate summary data based on fetched data
  const summaryData = React.useMemo(() => {
    const totalExpenses = allExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const currentIncome = incomeSetting?.amount ?? 0;
    return {
      income: currentIncome,
      expenses: totalExpenses,
      balance: currentIncome - totalExpenses,
    };
  }, [allExpenses, incomeSetting]); // Recalculate when expenses or income setting change


   // Mutation for updating income
   const updateIncomeMutation = useMutation({
     mutationFn: async (incomeAmount: number) => {
       const docRef = doc(settingsCollectionRef, INCOME_DOC_ID);
       await setDoc(docRef, { amount: incomeAmount }, { merge: true }); // Use setDoc with merge to create or update
       return incomeAmount;
     },
     onSuccess: (updatedIncome) => {
        queryClient.invalidateQueries({ queryKey: [INCOME_SETTING_QUERY_KEY] });
        queryClient.invalidateQueries({ queryKey: [DASHBOARD_SUMMARY_QUERY_KEY] }); // Invalidate summary if you have a separate query for it
        toast({
            title: "Income Updated",
            description: `Monthly income set to $${updatedIncome.toFixed(2)}.`,
        });
        setIsIncomeDialogOpen(false); // Close dialog on success
     },
     onError: (error: Error) => {
        toast({
            title: "Error Updating Income",
            description: error.message || "Could not update income setting.",
            variant: "destructive",
        });
     },
   });

   // Handle opening the dialog and setting the initial input value
   React.useEffect(() => {
       if (isIncomeDialogOpen && incomeSetting) {
           setNewIncome(incomeSetting.amount);
       } else if (!isIncomeDialogOpen) {
           setNewIncome(""); // Clear input when dialog closes
       }
   }, [isIncomeDialogOpen, incomeSetting]);

   const handleIncomeUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        const incomeValue = parseFloat(String(newIncome));
        if (!isNaN(incomeValue) && incomeValue >= 0) {
            updateIncomeMutation.mutate(incomeValue);
        } else {
            toast({
                title: "Invalid Income Amount",
                description: "Please enter a valid positive number for income.",
                variant: "destructive",
            });
        }
   };


  if (loadError) {
    return <div className="text-destructive">Error loading dashboard data: {(loadError as Error).message}</div>;
  }


  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {/* Income Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
             <Dialog open={isIncomeDialogOpen} onOpenChange={setIsIncomeDialogOpen}>
                 <DialogTrigger asChild>
                     <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary">
                         <Edit className="h-4 w-4" />
                         <span className="sr-only">Edit Income</span>
                     </Button>
                 </DialogTrigger>
                 <DialogContent className="sm:max-w-[425px]">
                     <form onSubmit={handleIncomeUpdate}>
                        <DialogHeader>
                        <DialogTitle>Set Monthly Income</DialogTitle>
                        <DialogDescription>
                            Enter your total monthly income. This will be used to calculate your remaining balance.
                        </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="income" className="text-right">
                             Amount ($)
                            </Label>
                            <Input
                             id="income"
                             type="number"
                             value={newIncome}
                             onChange={(e) => setNewIncome(e.target.value)}
                             className="col-span-3"
                             placeholder="e.g., 5000"
                             step="0.01"
                             min="0"
                             required
                             disabled={updateIncomeMutation.isPending}
                            />
                        </div>
                        </div>
                        <DialogFooter>
                           <DialogClose asChild>
                              <Button type="button" variant="outline" disabled={updateIncomeMutation.isPending}>Cancel</Button>
                           </DialogClose>
                           <Button type="submit" disabled={updateIncomeMutation.isPending}>
                              {updateIncomeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Save Income
                           </Button>
                        </DialogFooter>
                     </form>
                 </DialogContent>
             </Dialog>
            {/* <DollarSign className="h-4 w-4 text-muted-foreground" /> */}
          </CardHeader>
          <CardContent>
            {isLoadingIncome ? (
              <Skeleton className="h-8 w-3/4" />
            ) : (
              <div className="text-2xl font-bold text-primary">${summaryData.income.toFixed(2)}</div>
            )}
          </CardContent>
        </Card>

        {/* Expenses Card */}
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses (This Month)</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoadingAllExpenses ? (
               <Skeleton className="h-8 w-3/4" />
             ) : (
               <div className="text-2xl font-bold text-destructive">${summaryData.expenses.toFixed(2)}</div>
             )}
          </CardContent>
        </Card>

        {/* Balance Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining Balance</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoading ? ( // Use combined loading state here as balance depends on both income and expenses
               <Skeleton className="h-8 w-3/4" />
             ) : (
               <div className={`text-2xl font-bold ${summaryData.balance >= 0 ? '' : 'text-destructive'}`}>
                    ${summaryData.balance.toFixed(2)}
                </div>
             )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Expenses Table Card */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
           {isLoadingExpenses ? (
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
                   <TableHead>Notes</TableHead>
                   <TableHead className="text-right">Amount</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {recentExpenses.map((expense) => (
                   <TableRow key={expense.id}>
                     <TableCell>{format(timestampToDate(expense.date), "yyyy-MM-dd")}</TableCell>
                     <TableCell><Badge variant="secondary">{expense.category}</Badge></TableCell>
                     <TableCell>{expense.vendor || "-"}</TableCell>
                     <TableCell className="max-w-[150px] truncate" title={expense.notes ?? undefined}>
                        {expense.notes || "-"}
                     </TableCell>
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
