
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query"
import { db } from "@/lib/firebase" // Import Firestore instance
import {
    collection,
    addDoc,
    getDocs,
    doc,
    deleteDoc,
    query,
    orderBy,
    Timestamp, // Import Timestamp
    limit,
    startAfter,
    getDoc,
    writeBatch,
    updateDoc,
    increment // Import increment
} from "firebase/firestore";

import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { CalendarIcon, PlusCircle, Trash2, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Expense, Category, Vendor, SummaryData } from "@/types"; // Import types
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
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import { useInView } from 'react-intersection-observer'; // For infinite scrolling


// Query Keys
const EXPENSES_QUERY_KEY = "expenses";
const CATEGORIES_QUERY_KEY = "categories";
const VENDORS_QUERY_KEY = "vendors";
const SUMMARY_DATA_QUERY_KEY = "summaryData"; // For updating summary
const SUMMARY_DOC_ID = "globalSummary"; // Fixed ID for the summary document

// Firestore collection references
const expensesCollectionRef = collection(db, "expenses");
const categoriesCollectionRef = collection(db, "categories");
const vendorsCollectionRef = collection(db, "vendors");
const settingsCollectionRef = collection(db, "settings");

// Pagination Limit
const EXPENSES_PER_PAGE = 15;

// Zod schema for form validation
const expenseFormSchema = z.object({
  date: z.date({ required_error: "Expense date is required." }),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
  category: z.string({ required_error: "Category is required." }).min(1, "Category is required."),
  vendor: z.string().optional(), // Store vendor name directly for simplicity
  notes: z.string().optional(),
})

type ExpenseFormValues = z.infer<typeof expenseFormSchema>

// Helper to convert Firebase Timestamp to Date
const timestampToDate = (timestamp: Timestamp | Date): Date => {
     if (!timestamp) return new Date(); // Handle null/undefined case
    return timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
};

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { ref: loadMoreRef, inView } = useInView(); // Hook for detecting when "Load More" is visible

  // Fetch Expenses with Infinite Scrolling / Pagination
   const {
      data: expensesPages,
      fetchNextPage,
      hasNextPage,
      isLoading: isLoadingExpenses,
      isFetchingNextPage,
      error: errorExpenses,
    } = useInfiniteQuery<{ expenses: Expense[], lastVisible: any | null }, Error>({
        queryKey: [EXPENSES_QUERY_KEY],
        queryFn: async ({ pageParam = null }) => {
             const expensesQuery = pageParam
               ? query(expensesCollectionRef, orderBy("date", "desc"), startAfter(pageParam), limit(EXPENSES_PER_PAGE))
               : query(expensesCollectionRef, orderBy("date", "desc"), limit(EXPENSES_PER_PAGE));

            const querySnapshot = await getDocs(expensesQuery);
            const expensesData = querySnapshot.docs.map(doc => {
               const data = doc.data();
               return {
                    id: doc.id,
                    ...data,
                    date: timestampToDate(data.date) // Convert Timestamp to Date
                } as Expense;
            });
            const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
            return { expenses: expensesData, lastVisible };
        },
        getNextPageParam: (lastPage) => lastPage.lastVisible, // Use the last document as the cursor for the next page
        initialPageParam: null, // Add this line
        staleTime: 1000 * 60 * 2, // Cache expense list for 2 minutes
   });

   // Flatten the pages into a single array of expenses
   const expenses = React.useMemo(() => expensesPages?.pages.flatMap(page => page.expenses) ?? [], [expensesPages]);

   // Trigger fetching the next page when the loadMoreRef element comes into view
   React.useEffect(() => {
     if (inView && hasNextPage && !isFetchingNextPage) {
       fetchNextPage();
     }
   }, [inView, hasNextPage, fetchNextPage, isFetchingNextPage]);


  // Fetch Categories
   const { data: categories = [], isLoading: isLoadingCategories, error: errorCategories } = useQuery<Category[]>({
     queryKey: [CATEGORIES_QUERY_KEY],
     queryFn: async () => {
       const q = query(categoriesCollectionRef, orderBy("name"));
       const querySnapshot = await getDocs(q);
       return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
     },
     staleTime: 1000 * 60 * 15, // Cache categories for 15 minutes
   });

   // Fetch Vendors
   const { data: vendors = [], isLoading: isLoadingVendors, error: errorVendors } = useQuery<Vendor[]>({
     queryKey: [VENDORS_QUERY_KEY],
     queryFn: async () => {
       const q = query(vendorsCollectionRef, orderBy("name"));
       const querySnapshot = await getDocs(q);
       return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vendor));
     },
     staleTime: 1000 * 60 * 15, // Cache vendors for 15 minutes
   });

  // Combined loading state for initial load (excluding pagination fetching)
  const isInitiallyLoading = isLoadingExpenses && !expensesPages?.pages.length;
  const loadError = errorExpenses || errorCategories || errorVendors;

  // Helper function to ensure the summary document exists
    async function ensureSummaryDocExists() {
        const summaryDocRef = doc(settingsCollectionRef, SUMMARY_DOC_ID);
        const summarySnap = await getDoc(summaryDocRef);
        if (!summarySnap.exists()) {
            console.log("Summary document not found, creating with defaults.");
            try {
                await setDoc(summaryDocRef, { totalExpenses: 0, expenseCount: 0 });
                console.log("Summary document created successfully.");
            } catch (error) {
                console.error("Error creating summary document:", error);
                // Handle error appropriately, maybe throw or return an error state
                throw new Error("Failed to initialize summary data.");
            }
        }
        return summaryDocRef; // Return the ref for use in mutations
    }


  // Mutation for adding an expense
  const addExpenseMutation = useMutation({
     mutationFn: async (newExpenseData: ExpenseFormValues) => {
        const dataToSave = {
          ...newExpenseData,
          date: Timestamp.fromDate(newExpenseData.date), // Convert Date to Firestore Timestamp
          vendor: newExpenseData.vendor === "__none__" ? null : newExpenseData.vendor, // Handle "None" vendor
        };

        // Ensure summary document exists before attempting to update it
        const summaryDocRef = await ensureSummaryDocExists();

        // Use a batch write to add expense and update summary atomically
        const batch = writeBatch(db);
        const expenseDocRef = doc(expensesCollectionRef); // Generate ref for the new expense
        batch.set(expenseDocRef, dataToSave);

        // Update summary document using the ensured ref
        batch.update(summaryDocRef, {
            totalExpenses: increment(newExpenseData.amount),
            expenseCount: increment(1)
        });

        await batch.commit(); // Commit the batch

        return { id: expenseDocRef.id, ...newExpenseData }; // Return original data with new ID for UI feedback
    },
    onSuccess: (newExpense) => {
        // Refetch the first page of expenses to show the new one at the top
        queryClient.refetchQueries({ queryKey: [EXPENSES_QUERY_KEY], exact: true });
        // Invalidate summary data to get the updated totals
        queryClient.invalidateQueries({ queryKey: [SUMMARY_DATA_QUERY_KEY] });
        // Invalidate recent expenses on dashboard if needed
        queryClient.invalidateQueries({ queryKey: [EXPENSES_QUERY_KEY, 'recent'] });

        toast({
          title: "Expense Added",
          description: `Added ${newExpense.category} expense of $${newExpense.amount.toFixed(2)}.`,
        })
        form.reset({
          amount: undefined,
          category: "",
          vendor: "",
          notes: "",
          date: new Date(),
        });
    },
    onError: (error: Error) => {
        toast({
            title: "Error Adding Expense",
            description: error.message || "Could not add the expense.",
            variant: "destructive",
        });
        console.error("Error adding expense:", error); // Log detailed error
    },
  });

  // Mutation for deleting an expense
   const deleteExpenseMutation = useMutation({
     mutationFn: async ({ id, amount }: { id: string, amount: number }) => {
        // Ensure summary document exists before trying to update
       const summaryDocRef = await ensureSummaryDocExists();

       // Use a batch write to delete expense and update summary atomically
        const batch = writeBatch(db);
        const expenseDocRef = doc(db, "expenses", id);
        batch.delete(expenseDocRef);

        // Update summary document
        batch.update(summaryDocRef, {
            totalExpenses: increment(-amount), // Decrement total expenses
            expenseCount: increment(-1)     // Decrement count
        });

        await batch.commit();
        return { id, amount }; // Return deleted ID and amount for UI feedback/cache update
     },
     onSuccess: ({ id: deletedId }) => {
        // Optimistically update the cache: remove the deleted expense from all pages
        queryClient.setQueryData<{ pages: { expenses: Expense[], lastVisible: any }[] } | undefined>(
          [EXPENSES_QUERY_KEY],
          (oldData) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              pages: oldData.pages.map(page => ({
                ...page,
                expenses: page.expenses.filter(exp => exp.id !== deletedId),
              })),
            };
          }
        );

        // Invalidate queries to ensure eventual consistency and refetch potentially changed data
        // Invalidate the entire expense list (all pages)
        queryClient.invalidateQueries({ queryKey: [EXPENSES_QUERY_KEY] });
        // Invalidate summary data to reflect the deletion
        queryClient.invalidateQueries({ queryKey: [SUMMARY_DATA_QUERY_KEY] });
        // Invalidate recent expenses on dashboard
        queryClient.invalidateQueries({ queryKey: [EXPENSES_QUERY_KEY, 'recent'] });


        toast({
         title: "Expense Deleted",
         description: `Successfully removed the expense record.`,
         variant: "destructive"
        })
     },
     onError: (error: Error) => {
        toast({
            title: "Error Deleting Expense",
            description: error.message || "Could not delete the expense.",
            variant: "destructive",
        });
         console.error("Error deleting expense:", error); // Log detailed error
     },
   });


  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: undefined, // Use undefined for placeholder visibility
      category: "",
      vendor: "", // Empty string will show the placeholder
      notes: "",
      date: new Date(),
    },
  })

  function onSubmit(data: ExpenseFormValues) {
    addExpenseMutation.mutate(data);
  }

  function deleteExpense(id: string, amount: number) {
     deleteExpenseMutation.mutate({ id, amount });
  }

  if (loadError) {
    return <div className="text-destructive p-4">Error loading data: {(loadError as Error).message}</div>;
  }

  const NO_VENDOR_VALUE = "__none__"; // Unique value for "None" option


  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Add Expense Form Card */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Add New Expense</CardTitle>
            <CardDescription>Record a new expense transaction.</CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                {/* Date Field */}
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              disabled={addExpenseMutation.isPending}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? (
                                format(timestampToDate(field.value), "PPP") // Ensure value is Date
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? timestampToDate(field.value) : undefined}
                            onSelect={(date) => field.onChange(date || new Date())} // Ensure a date is always set
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Amount Field */}
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                         <Input type="number" placeholder="0.00" {...field} value={field.value ?? ""} step="0.01" disabled={addExpenseMutation.isPending}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Category Field */}
                 <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""} disabled={isLoadingCategories || categories.length === 0 || addExpenseMutation.isPending}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingCategories ? "Loading categories..." : (categories.length === 0 ? "No categories available" : "Select a category")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingCategories && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                          {!isLoadingCategories && categories.length === 0 && <SelectItem value="-" disabled>No categories available</SelectItem>}
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.name}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 {/* Vendor Field */}
                <FormField
                  control={form.control}
                  name="vendor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""} disabled={isLoadingVendors || addExpenseMutation.isPending}>
                         <FormControl>
                          <SelectTrigger>
                             <SelectValue placeholder={isLoadingVendors ? "Loading vendors..." : "Select a vendor or leave blank"} />
                          </SelectTrigger>
                         </FormControl>
                        <SelectContent>
                           {isLoadingVendors && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                           <SelectItem value={NO_VENDOR_VALUE}>None</SelectItem>
                           {vendors.map((vendor) => (
                            <SelectItem key={vendor.id} value={vendor.name}>
                              {vendor.name}
                            </SelectItem>
                          ))}
                           {/* Placeholder if no vendors */}
                           {!isLoadingVendors && vendors.length === 0 && <SelectItem value="-" disabled>No vendors available</SelectItem>}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 {/* Notes Field */}
                 <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Add any relevant notes..." {...field} value={field.value ?? ""} disabled={addExpenseMutation.isPending}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={isLoadingCategories || isLoadingVendors || addExpenseMutation.isPending}>
                   {addExpenseMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                   ) : (
                      <PlusCircle className="mr-2 h-4 w-4" />
                   )}
                   Add Expense
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>

      {/* Expense History Table Card */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Expense History</CardTitle>
            <CardDescription>View all recorded expenses.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="overflow-x-auto"> {/* Add horizontal scroll for small screens */}
                {isInitiallyLoading ? (
                     <div className="space-y-2">
                        {[...Array(EXPENSES_PER_PAGE)].map((_, i) => (
                          <Skeleton key={i} className="h-10 w-full rounded" />
                        ))}
                     </div>
                ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Date</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Vendor</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Amount</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.length === 0 && !isInitiallyLoading && (
                           <TableRow>
                             <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                               No expenses recorded yet.
                             </TableCell>
                           </TableRow>
                        )}
                        {expenses.map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell className="whitespace-nowrap">{format(timestampToDate(expense.date), "yyyy-MM-dd")}</TableCell>
                            <TableCell><Badge variant="secondary">{expense.category}</Badge></TableCell>
                            <TableCell className="whitespace-nowrap">{expense.vendor || "-"}</TableCell>
                             <TableCell className="max-w-[150px] sm:max-w-[250px] whitespace-normal break-words" title={expense.notes ?? undefined}>
                                {expense.notes || "-"}
                             </TableCell>
                            <TableCell className="text-right whitespace-nowrap">${expense.amount.toFixed(2)}</TableCell>
                             <TableCell>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive"
                                            aria-label="Delete expense"
                                            disabled={deleteExpenseMutation.isPending && deleteExpenseMutation.variables?.id === expense.id}
                                        >
                                          {deleteExpenseMutation.isPending && deleteExpenseMutation.variables?.id === expense.id ? (
                                             <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                             <Trash2 className="h-4 w-4" />
                                          )}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete this expense record.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel disabled={deleteExpenseMutation.isPending}>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            className={buttonVariants({ variant: "destructive" })}
                                            onClick={() => deleteExpense(expense.id, expense.amount)}
                                            disabled={deleteExpenseMutation.isPending}>
                                             {deleteExpenseMutation.isPending && deleteExpenseMutation.variables?.id === expense.id ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                             ) : null}
                                             Delete
                                        </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                             </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                )}
              </div>
              {/* Load More Trigger / Button */}
                <div ref={loadMoreRef} className="mt-4 flex justify-center">
                  {hasNextPage && (
                     <Button
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                        variant="outline"
                        size="sm" // Make button slightly smaller
                     >
                       {isFetchingNextPage ? (
                         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                       ) : null}
                       Load More
                     </Button>
                  )}
                   {!hasNextPage && expenses.length > 0 && !isInitiallyLoading && (
                      <p className="text-sm text-muted-foreground">No more expenses</p>
                   )}
                </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

