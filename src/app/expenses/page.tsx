
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { db } from "@/lib/firebase" // Import Firestore instance
import {
    collection,
    addDoc,
    getDocs,
    doc,
    deleteDoc,
    query,
    orderBy,
    Timestamp // Import Timestamp
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
import type { Expense, Category, Vendor } from "@/types"; // Import types
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

// Query Keys
const EXPENSES_QUERY_KEY = "expenses";
const CATEGORIES_QUERY_KEY = "categories";
const VENDORS_QUERY_KEY = "vendors";

// Firestore collection references
const expensesCollectionRef = collection(db, "expenses");
const categoriesCollectionRef = collection(db, "categories");
const vendorsCollectionRef = collection(db, "vendors");

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
    return timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
};

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch Expenses
  const { data: expenses = [], isLoading: isLoadingExpenses, error: errorExpenses } = useQuery<Expense[]>({
    queryKey: [EXPENSES_QUERY_KEY],
    queryFn: async () => {
        const q = query(expensesCollectionRef, orderBy("date", "desc"));
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

  // Fetch Categories
   const { data: categories = [], isLoading: isLoadingCategories, error: errorCategories } = useQuery<Category[]>({
     queryKey: [CATEGORIES_QUERY_KEY],
     queryFn: async () => {
       const q = query(categoriesCollectionRef, orderBy("name"));
       const querySnapshot = await getDocs(q);
       return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
     },
   });

   // Fetch Vendors
   const { data: vendors = [], isLoading: isLoadingVendors, error: errorVendors } = useQuery<Vendor[]>({
     queryKey: [VENDORS_QUERY_KEY],
     queryFn: async () => {
       const q = query(vendorsCollectionRef, orderBy("name"));
       const querySnapshot = await getDocs(q);
       return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vendor));
     },
   });

  // Combined loading state
  const isLoading = isLoadingExpenses || isLoadingCategories || isLoadingVendors;
  const loadError = errorExpenses || errorCategories || errorVendors;

  // Mutation for adding an expense
  const addExpenseMutation = useMutation({
    mutationFn: async (newExpenseData: ExpenseFormValues) => {
        const dataToSave = {
          ...newExpenseData,
          date: Timestamp.fromDate(newExpenseData.date), // Convert Date to Firestore Timestamp
          vendor: newExpenseData.vendor === "__none__" ? null : newExpenseData.vendor, // Handle "None" vendor
        };
        const docRef = await addDoc(expensesCollectionRef, dataToSave);
        return { id: docRef.id, ...newExpenseData }; // Return original data with new ID for UI feedback
    },
    onSuccess: (newExpense) => {
        queryClient.invalidateQueries({ queryKey: [EXPENSES_QUERY_KEY] });
        queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] }); // Invalidate dashboard summary too
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
    },
  });

  // Mutation for deleting an expense
   const deleteExpenseMutation = useMutation({
     mutationFn: async (id: string) => {
       const expenseDocRef = doc(db, "expenses", id);
       await deleteDoc(expenseDocRef);
       return id; // Return deleted ID for UI feedback
     },
     onSuccess: (deletedId) => {
        queryClient.invalidateQueries({ queryKey: [EXPENSES_QUERY_KEY] });
        queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] }); // Invalidate dashboard summary too
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

  function deleteExpense(id: string) {
     deleteExpenseMutation.mutate(id);
  }

  if (loadError) {
    return <div className="text-destructive">Error loading data: {(loadError as Error).message}</div>;
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
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.name}>
                              {category.name}
                            </SelectItem>
                          ))}
                          {/* Placeholder if no categories */}
                          {categories.length === 0 && !isLoadingCategories && <SelectItem value="-" disabled>No categories available</SelectItem>}
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
                           <SelectItem value={NO_VENDOR_VALUE}>None</SelectItem>
                           {vendors.map((vendor) => (
                            <SelectItem key={vendor.id} value={vendor.name}>
                              {vendor.name}
                            </SelectItem>
                          ))}
                           {/* Placeholder if no vendors */}
                           {vendors.length === 0 && !isLoadingVendors && <SelectItem value="-" disabled>No vendors available</SelectItem>}
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
                        <Textarea placeholder="Add any relevant notes..." {...field} disabled={addExpenseMutation.isPending}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={isLoading || addExpenseMutation.isPending}>
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
             <div className="overflow-x-auto">
                {isLoadingExpenses ? (
                    <div className="flex justify-center items-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-muted-foreground">Loading expenses...</span>
                    </div>
                ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Vendor</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.length === 0 && !isLoadingExpenses && (
                           <TableRow>
                             <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                               No expenses recorded yet.
                             </TableCell>
                           </TableRow>
                        )}
                        {expenses.map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell>{format(timestampToDate(expense.date), "yyyy-MM-dd")}</TableCell>
                            <TableCell><Badge variant="secondary">{expense.category}</Badge></TableCell>
                            <TableCell>{expense.vendor || "-"}</TableCell>
                             <TableCell className="max-w-[150px] truncate" title={expense.notes ?? undefined}>
                                {expense.notes || "-"}
                             </TableCell>
                            <TableCell className="text-right">${expense.amount.toFixed(2)}</TableCell>
                             <TableCell>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive"
                                            aria-label="Delete expense"
                                            disabled={deleteExpenseMutation.isPending && deleteExpenseMutation.variables === expense.id}
                                        >
                                          {deleteExpenseMutation.isPending && deleteExpenseMutation.variables === expense.id ? (
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
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            className={buttonVariants({ variant: "destructive" })}
                                            onClick={() => deleteExpense(expense.id)}
                                            disabled={deleteExpenseMutation.isPending}>
                                             {deleteExpenseMutation.isPending && deleteExpenseMutation.variables === expense.id ? (
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
