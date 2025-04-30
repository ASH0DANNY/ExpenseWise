
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"

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
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
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

// Define localStorage keys
const LOCAL_STORAGE_KEY_EXPENSES = 'expenseWiseApp_expenses';
const LOCAL_STORAGE_KEY_CATEGORIES = 'expenseWiseApp_categories';
const LOCAL_STORAGE_KEY_VENDORS = 'expenseWiseApp_vendors';

const expenseFormSchema = z.object({
  date: z.date({ required_error: "Expense date is required." }),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
  category: z.string({ required_error: "Category is required." }).min(1, "Category is required."),
  vendor: z.string().optional(),
  notes: z.string().optional(),
})

type ExpenseFormValues = z.infer<typeof expenseFormSchema>

// Mock data (used only if localStorage is empty or invalid)
const mockCategoriesData: Category[] = [ { id: 1, name: "Groceries"}, { id: 2, name: "Utilities"}, { id: 3, name: "Dining Out"} ];
const mockVendorsData: Vendor[] = [ { id: 1, name: "SuperMart"}, { id: 2, name: "City Power"}, { id: 3, name: "Pizza Place"} ];
const mockExpensesData: Expense[] = [
  { id: 1, date: new Date(2024, 6, 28), category: "Groceries", vendor: "SuperMart", amount: 75.50, notes: "Weekly shopping" },
  { id: 2, date: new Date(2024, 6, 27), category: "Utilities", vendor: "City Power", amount: 120.00, notes: "Electricity bill" },
];

const NO_VENDOR_VALUE = "__none__"; // Unique value for "None" option

export default function ExpensesPage() {
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [vendors, setVendors] = React.useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = React.useState(true); // Add loading state
  const { toast } = useToast()

  // Load data from localStorage on client-side mount
  React.useEffect(() => {
    let loadedExpenses: Expense[] = [];
    let loadedCategories: Category[] = [];
    let loadedVendors: Vendor[] = [];

    // Load Expenses
    const savedExpenses = localStorage.getItem(LOCAL_STORAGE_KEY_EXPENSES);
    if (savedExpenses) {
      try {
        loadedExpenses = JSON.parse(savedExpenses).map((exp: any) => ({
          ...exp,
          date: new Date(exp.date)
        }));
      } catch (error) { console.error("Error parsing expenses:", error); }
    }
     // Use mock if empty (optional)
     if (loadedExpenses.length === 0) {
        // loadedExpenses = mockExpensesData;
     }


    // Load Categories
    const savedCategories = localStorage.getItem(LOCAL_STORAGE_KEY_CATEGORIES);
    if (savedCategories) {
       try {
          loadedCategories = JSON.parse(savedCategories);
       } catch (error) { console.error("Error parsing categories:", error); }
    }
     // Use mock if empty (optional)
    if (loadedCategories.length === 0) {
        // loadedCategories = mockCategoriesData;
    }

    // Load Vendors
    const savedVendors = localStorage.getItem(LOCAL_STORAGE_KEY_VENDORS);
    if (savedVendors) {
       try {
          loadedVendors = JSON.parse(savedVendors);
       } catch (error) { console.error("Error parsing vendors:", error); }
    }
      // Use mock if empty (optional)
     if (loadedVendors.length === 0) {
         // loadedVendors = mockVendorsData;
     }

    setExpenses(loadedExpenses);
    setCategories(loadedCategories);
    setVendors(loadedVendors);
    setIsLoading(false);

    // --- Add localStorage listener ---
    const handleStorageChange = (event: StorageEvent) => {
        if (event.key === LOCAL_STORAGE_KEY_EXPENSES) {
            let updatedExpenses: Expense[] = [];
            if (event.newValue) {
                try {
                 updatedExpenses = JSON.parse(event.newValue).map((exp: any) => ({ ...exp, date: new Date(exp.date) }));
                } catch (error) { console.error("Error parsing expenses update:", error); }
            }
            setExpenses(updatedExpenses); // Directly update state
        }
        if (event.key === LOCAL_STORAGE_KEY_CATEGORIES) {
            let updatedCategories: Category[] = [];
            if (event.newValue) {
                try { updatedCategories = JSON.parse(event.newValue); }
                catch (error) { console.error("Error parsing categories update:", error); }
            }
            setCategories(updatedCategories);
        }
        if (event.key === LOCAL_STORAGE_KEY_VENDORS) {
            let updatedVendors: Vendor[] = [];
             if (event.newValue) {
                 try { updatedVendors = JSON.parse(event.newValue); }
                 catch (error) { console.error("Error parsing vendors update:", error); }
             }
             setVendors(updatedVendors);
        }
    };

      window.addEventListener('storage', handleStorageChange);

      // --- Cleanup listener ---
      return () => {
        window.removeEventListener('storage', handleStorageChange);
      };
  }, []); // Empty dependency array ensures this runs only once on mount


  // Persist expenses to localStorage whenever they change
  React.useEffect(() => {
    // Only save if not loading to prevent overwriting initial state potentially
    if (!isLoading) {
        localStorage.setItem(LOCAL_STORAGE_KEY_EXPENSES, JSON.stringify(expenses));
    }
  }, [expenses, isLoading]);


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
    // Treat the unique "none" value as no vendor selected
    const expenseData = {
        ...data,
        vendor: data.vendor === NO_VENDOR_VALUE ? undefined : data.vendor,
    };

    const newExpense: Expense = {
        id: (expenses.length > 0 ? Math.max(...expenses.map(e => e.id)) : 0) + 1, // More robust ID generation
        ...expenseData,
    };

    const updatedExpenses = [newExpense, ...expenses]; // Add to the top
    setExpenses(updatedExpenses); // Update state first

    toast({
      title: "Expense Added",
      description: `Added ${newExpense.category} expense of $${newExpense.amount.toFixed(2)}.`,
    })
    form.reset({
        amount: undefined,
        category: "",
        vendor: "",
        notes: "",
        date: new Date(), // Reset date to today
    }); // Reset form after submission
  }

  function deleteExpense(id: number) {
     const updatedExpenses = expenses.filter(expense => expense.id !== id);
     setExpenses(updatedExpenses); // Update state first
     toast({
      title: "Expense Deleted",
      description: `Successfully removed the expense record.`,
      variant: "destructive"
     })
  }


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
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
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
                         <Input type="number" placeholder="0.00" {...field} value={field.value ?? ""} step="0.01" />
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
                      <Select onValueChange={field.onChange} value={field.value || ""} disabled={isLoading || categories.length === 0}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={isLoading ? "Loading categories..." : "Select a category"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.name}>
                              {category.name}
                            </SelectItem>
                          ))}
                           {/* Show disabled state */}
                           {categories.length === 0 && !isLoading && <SelectItem value="-" disabled>No categories available</SelectItem>}
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
                      <Select onValueChange={field.onChange} value={field.value || ""} disabled={isLoading}>
                         <FormControl>
                          <SelectTrigger>
                             <SelectValue placeholder={isLoading ? "Loading vendors..." : "Select a vendor or leave blank"} />
                          </SelectTrigger>
                         </FormControl>
                        <SelectContent>
                           {/* Use a unique, non-empty value for the "None" option */}
                           <SelectItem value={NO_VENDOR_VALUE}>None</SelectItem>
                           {vendors.map((vendor) => (
                            <SelectItem key={vendor.id} value={vendor.name}>
                              {vendor.name}
                            </SelectItem>
                          ))}
                           {/* Show disabled state */}
                           {vendors.length === 0 && !isLoading && <SelectItem value="-" disabled>No vendors available</SelectItem>}
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
                        <Textarea placeholder="Add any relevant notes..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
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
                {isLoading ? (
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
                        {expenses.length === 0 && (
                           <TableRow>
                             <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                               No expenses recorded yet.
                             </TableCell>
                           </TableRow>
                        )}
                        {expenses.map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell>{format(expense.date, "yyyy-MM-dd")}</TableCell>
                            <TableCell><Badge variant="secondary">{expense.category}</Badge></TableCell>
                            <TableCell>{expense.vendor || "-"}</TableCell>
                            <TableCell className="max-w-[150px] truncate" title={expense.notes ?? undefined}>{expense.notes || "-"}</TableCell>
                            <TableCell className="text-right">${expense.amount.toFixed(2)}</TableCell>
                             <TableCell>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive"
                                            aria-label="Delete expense"
                                        >
                                            <Trash2 className="h-4 w-4" />
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
                                            onClick={() => deleteExpense(expense.id)}>
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
