
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
    increment, // Import increment for summary updates
    writeBatch, // Import writeBatch for atomic operations
    deleteDoc // Import deleteDoc
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card" // Added CardFooter, CardDescription
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Landmark, TrendingDown, Loader2, Edit, AlertTriangle } from "lucide-react" // Added AlertTriangle
import { format } from "date-fns"
import type { Expense, IncomeSetting, SummaryData } from "@/types"; // Import types including SummaryData
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import { Button, buttonVariants } from "@/components/ui/button"; // Added buttonVariants
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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

// Helper function to delete all documents in a collection in batches
async function deleteCollection(collectionRef: any, batchSize = 500) {
    const q = query(collectionRef, limit(batchSize));
    let snapshot = await getDocs(q);

    // When there are no documents left, we are done
    while (snapshot.size > 0) {
        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        await batch.commit();

        // Get the next batch
        snapshot = await getDocs(q);
    }
}


export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isIncomeDialogOpen, setIsIncomeDialogOpen] = React.useState(false);
  const [newIncome, setNewIncome] = React.useState<number | string>("");
  const isClient = useIsClient(); // Hook to check if running on the client

  // Fetch Income Setting
  const { data: incomeSetting, isLoading: isLoadingIncome, error: errorIncome } = useQuery<IncomeSetting | null>({
    queryKey: [INCOME_SETTING_QUERY_KEY],
    queryFn: async () => {
        const docRef = doc(settingsCollectionRef, INCOME_DOC_ID);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as IncomeSetting;
        } else {
            // Don't create here, handle potential null later or during reset
            return null;
        }
    },
    staleTime: Infinity, // Income setting likely doesn't change often externally
  });

  // Fetch Summary Data (Total Expenses)
   const { data: summaryData, isLoading: isLoadingSummary, error: errorSummary } = useQuery<SummaryData | null>({
     queryKey: [SUMMARY_DATA_QUERY_KEY],
     queryFn: async () => {
       const docRef = doc(settingsCollectionRef, SUMMARY_DOC_ID);
       const docSnap = await getDoc(docRef);
       if (docSnap.exists()) {
         return { id: docSnap.id, ...docSnap.data() } as SummaryData;
       } else {
         // Don't create here, handle potential null later or during reset
         return null;
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
  // Let specific components handle their own loading if only one query is needed
  const isLoading = isLoadingIncome || isLoadingSummary || isLoadingExpenses;
  const loadError = errorIncome || errorSummary || errorExpenses;


  // Calculate balance using fetched income and summary
  const balance = React.useMemo(() => {
    // Use default 0 if settings/summary are null (e.g., before first set/reset)
    const currentIncome = incomeSetting?.amount ?? 0;
    const totalExpenses = summaryData?.totalExpenses ?? 0;
    return currentIncome - totalExpenses;
  }, [incomeSetting, summaryData]);


   // Mutation for updating income
   const updateIncomeMutation = useMutation({
     mutationFn: async (incomeAmount: number) => {
       const docRef = doc(settingsCollectionRef, INCOME_DOC_ID);
       // Use setDoc with merge to create or update
       await setDoc(docRef, { amount: incomeAmount }, { merge: true });
       return incomeAmount;
     },
     onSuccess: (updatedIncome) => {
        // Update the cache directly for immediate feedback
        queryClient.setQueryData<IncomeSetting | null>([INCOME_SETTING_QUERY_KEY], (oldData) => ({
             ...(oldData ?? { id: INCOME_DOC_ID }), // Keep old data if exists, else provide default structure
             amount: updatedIncome,
         }));
        // Invalidate queries to ensure eventual consistency, though cache update is faster
        queryClient.invalidateQueries({ queryKey: [INCOME_SETTING_QUERY_KEY] });
        // Also invalidate summary/balance related queries if income changes affect them
        queryClient.invalidateQueries({ queryKey: [SUMMARY_DATA_QUERY_KEY] });


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

   // Mutation for resetting all application data
   const resetDataMutation = useMutation({
        mutationFn: async () => {
            // 1. Delete all expenses
            await deleteCollection(expensesCollectionRef);

            // 2. Reset income and summary settings using a batch
            const batch = writeBatch(db);
            const incomeDocRef = doc(settingsCollectionRef, INCOME_DOC_ID);
            const summaryDocRef = doc(settingsCollectionRef, SUMMARY_DOC_ID);

            batch.set(incomeDocRef, { amount: 0 }); // Reset income to 0
            batch.set(summaryDocRef, { totalExpenses: 0, expenseCount: 0 }); // Reset summary

            await batch.commit();
        },
        onSuccess: () => {
            // Invalidate all relevant queries to refetch fresh, reset data
            queryClient.invalidateQueries({ queryKey: [EXPENSES_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: [INCOME_SETTING_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: [SUMMARY_DATA_QUERY_KEY] });

            toast({
                title: "Application Data Reset",
                description: "All expenses have been deleted and income/summary reset to zero.",
                variant: "destructive", // Use destructive variant for reset confirmation
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error Resetting Data",
                description: error.message || "Could not reset application data. Please try again.",
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

   const handleResetData = () => {
       resetDataMutation.mutate();
   }


  // Render loading skeletons only on the client during initial load
   if (!isClient) {
       // Basic structure during SSR/prerender
       return (
          <div className="space-y-6">
             <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  <Skeleton className="h-24 rounded-lg" />
                  <Skeleton className="h-24 rounded-lg" />
                  <Skeleton className="h-24 rounded-lg" />
             </div>
              <Skeleton className="h-[250px] rounded-lg" />
          </div>
       );
   }


  if (loadError && isClient) {
    return <div className="text-destructive p-4">Error loading dashboard data: {(loadError as Error).message}</div>;
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
                     <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" aria-label="Edit Income">
                         <Edit className="h-4 w-4" />
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
             {!incomeSetting && !isLoadingIncome && (
                <p className="text-xs text-muted-foreground mt-1">Click the edit icon to set your income.</p>
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
             <p className="text-xs text-muted-foreground mt-1">{summaryData?.expenseCount ?? 0} expenses recorded</p>
          </CardContent>
        </Card>

        {/* Balance Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining Balance</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoadingIncome || isLoadingSummary ? ( // Check loading for both dependencies
               <Skeleton className="h-8 w-3/4" />
             ) : (
               <div className={`text-2xl font-bold ${balance >= 0 ? '' : 'text-destructive'}`}>
                    ${balance.toFixed(2)}
                </div>
             )}
             <p className="text-xs text-muted-foreground mt-1">Income minus Total Expenses</p>
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
                     <TableHead className="whitespace-nowrap">Date</TableHead>
                     <TableHead>Category</TableHead>
                     <TableHead>Vendor</TableHead>
                     <TableHead>Notes</TableHead>
                     <TableHead className="text-right whitespace-nowrap">Amount</TableHead>
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

       {/* Reset Data Card - Added */}
        <Card className="border-destructive">
            <CardHeader>
                <CardTitle className="flex items-center text-destructive">
                    <AlertTriangle className="mr-2 h-5 w-5" /> Danger Zone
                </CardTitle>
                <CardDescription>
                    Reset all application data to its initial state. This action is irreversible.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    Clicking the button below will permanently delete all recorded expenses
                    and reset your monthly income and summary totals to zero.
                </p>
            </CardContent>
            <CardFooter>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={resetDataMutation.isPending}>
                           {resetDataMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <AlertTriangle className="mr-2 h-4 w-4" />
                            )}
                            Reset Application Data
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete all your
                            expense records and reset your income setting and expense summary.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel disabled={resetDataMutation.isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className={buttonVariants({ variant: "destructive" })}
                            onClick={handleResetData}
                            disabled={resetDataMutation.isPending}
                        >
                           {resetDataMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                           Yes, Reset Data
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
        </Card>
    </div>
  )
}

