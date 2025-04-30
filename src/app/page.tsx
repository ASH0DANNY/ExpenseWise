
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
    setDoc,
    updateDoc,
    increment // Import increment for summary updates
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Landmark, TrendingDown, Loader2, Edit } from "lucide-react"
import { format } from "date-fns"
import type { Expense, IncomeSetting, SummaryData } from "@/types"; // Import types including SummaryData
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
import { useIsClient } from "@/hooks/use-is-client"; // Import useIsClient


// Query Keys
const EXPENSES_QUERY_KEY = "expenses";
const INCOME_SETTING_QUERY_KEY = "incomeSetting";
const SUMMARY_DATA_QUERY_KEY = "summaryData"; // New key for summary
const INCOME_DOC_ID = "userIncome"; // Fixed ID for the income setting document
const SUMMARY_DOC_ID = "globalSummary"; // Fixed ID for the summary document

// Firestore collection references
const expensesCollectionRef = collection(db, "expenses");
const settingsCollectionRef = collection(db, "settings"); // Collection for settings like income and summary


// Helper to convert Firebase Timestamp to Date
const timestampToDate = (timestamp: Timestamp | Date): Date => {
    if (!timestamp) return new Date(); // Handle null/undefined case
    return timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
};

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isIncomeDialogOpen, setIsIncomeDialogOpen] = React.useState(false);
  const [newIncome, setNewIncome] = React.useState<number | string>("");
  const isClient = useIsClient(); // Hook to check if running on the client

  // Fetch Income Setting
  const { data: incomeSetting, isLoading: isLoadingIncome, error: errorIncome } = useQuery<IncomeSetting>({
    queryKey: [INCOME_SETTING_QUERY_KEY],
    queryFn: async () => {
        const docRef = doc(settingsCollectionRef, INCOME_DOC_ID);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as IncomeSetting;
        } else {
            // Create if it doesn't exist with default 0
            await setDoc(docRef, { amount: 0 });
            return { id: INCOME_DOC_ID, amount: 0 };
        }
    },
    staleTime: Infinity, // Income setting likely doesn't change often externally
  });

  // Fetch Summary Data (Total Expenses)
   const { data: summaryData, isLoading: isLoadingSummary, error: errorSummary } = useQuery<SummaryData>({
     queryKey: [SUMMARY_DATA_QUERY_KEY],
     queryFn: async () => {
       const docRef = doc(settingsCollectionRef, SUMMARY_DOC_ID);
       const docSnap = await getDoc(docRef);
       if (docSnap.exists()) {
         return { id: docSnap.id, ...docSnap.data() } as SummaryData;
       } else {
         // If summary doesn't exist, create it (maybe calculate initial from existing expenses - complex, or just start at 0)
         await setDoc(docRef, { totalExpenses: 0, expenseCount: 0 }); // Initialize
         return { id: SUMMARY_DOC_ID, totalExpenses: 0, expenseCount: 0 };
       }
     },
     staleTime: 1000 * 60, // Stale after 1 minute, refetch periodically or rely on invalidation
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
     staleTime: 1000 * 60 * 2, // Stale after 2 minutes for recent expenses
  });

  // Combined loading state for UI elements that depend on multiple queries
  const isLoading = isLoadingIncome || isLoadingSummary || isLoadingExpenses;
  const loadError = errorIncome || errorSummary || errorExpenses;


  // Calculate balance using fetched income and summary
  const balance = React.useMemo(() => {
    const currentIncome = incomeSetting?.amount ?? 0;
    const totalExpenses = summaryData?.totalExpenses ?? 0;
    return currentIncome - totalExpenses;
  }, [incomeSetting, summaryData]);


   // Mutation for updating income
   const updateIncomeMutation = useMutation({
     mutationFn: async (incomeAmount: number) => {
       const docRef = doc(settingsCollectionRef, INCOME_DOC_ID);
       await setDoc(docRef, { amount: incomeAmount }, { merge: true }); // Use setDoc with merge to create or update
       return incomeAmount;
     },
     onSuccess: (updatedIncome) => {
        // Update the cache directly for immediate feedback
        queryClient.setQueryData<IncomeSetting>([INCOME_SETTING_QUERY_KEY], (oldData) => ({
             ...(oldData ?? { id: INCOME_DOC_ID }), // Keep old data if exists, else provide default structure
             amount: updatedIncome,
         }));
        // Invalidate queries to ensure eventual consistency, though cache update is faster
        // queryClient.invalidateQueries({ queryKey: [INCOME_SETTING_QUERY_KEY] }); // Optional if setQueryData is used

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


  if (!isClient && isLoading) {
      // Render skeletons or a loading indicator during SSR or initial client load
      return (
         <div className="space-y-6 animate-pulse">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                 <Skeleton className="h-24 rounded-lg" />
                 <Skeleton className="h-24 rounded-lg" />
                 <Skeleton className="h-24 rounded-lg" />
            </div>
             <Skeleton className="h-[250px] rounded-lg" />
         </div>
      );
  }

  if (loadError) {
    return <div className="text-destructive">Error loading dashboard data: {(loadError as Error).message}</div>;
  }


  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
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
          </CardHeader>
          <CardContent>
            {isLoadingIncome ? (
              <Skeleton className="h-8 w-3/4" />
            ) : (
              <div className="text-2xl font-bold text-primary">${(incomeSetting?.amount ?? 0).toFixed(2)}</div>
            )}
          </CardContent>
        </Card>

        {/* Expenses Card */}
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoadingSummary ? ( // Use summary loading state
               <Skeleton className="h-8 w-3/4" />
             ) : (
               <div className="text-2xl font-bold text-destructive">${(summaryData?.totalExpenses ?? 0).toFixed(2)}</div>
             )}
             {/* Optionally show expense count */}
             {/* <p className="text-xs text-muted-foreground">{summaryData?.expenseCount ?? 0} transactions</p> */}
          </CardContent>
        </Card>

        {/* Balance Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining Balance</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoading ? ( // Use combined loading state here
               <Skeleton className="h-8 w-3/4" />
             ) : (
               <div className={`text-2xl font-bold ${balance >= 0 ? '' : 'text-destructive'}`}>
                    ${balance.toFixed(2)}
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
           <div className="overflow-x-auto"> {/* Add horizontal scroll for small screens */}
             {isLoadingExpenses ? (
              // Use multiple skeleton rows for better loading appearance
              <div className="space-y-2">
                  <Skeleton className="h-10 w-full rounded" />
                  <Skeleton className="h-10 w-full rounded" />
                  <Skeleton className="h-10 w-full rounded" />
                  <Skeleton className="h-10 w-full rounded" />
                  <Skeleton className="h-10 w-full rounded" />
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
                       <TableCell className="whitespace-nowrap">{format(timestampToDate(expense.date), "yyyy-MM-dd")}</TableCell>
                       <TableCell><Badge variant="secondary">{expense.category}</Badge></TableCell>
                       <TableCell className="whitespace-nowrap">{expense.vendor || "-"}</TableCell>
                       <TableCell className="max-w-[150px] sm:max-w-[250px] truncate whitespace-normal break-words" title={expense.notes ?? undefined}>
                          {expense.notes || "-"}
                       </TableCell>
                       <TableCell className="text-right whitespace-nowrap">${expense.amount.toFixed(2)}</TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             )}
           </div>
        </CardContent>
      </Card>
    </div>
  )
}

