
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
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
import { CalendarIcon, PlusCircle, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Expense } from "@/types"; // Import the Expense type

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

// Mock data (fallback)
const mockCategoriesData = ["Groceries", "Utilities", "Dining Out", "Transport", "Entertainment", "Rent", "Other"];
const mockVendorsData = ["SuperMart", "City Power", "Pizza Place", "Gas Station", "Cinema", "Landlord", "Online Store"];
const mockExpensesData: Expense[] = [
  { id: 1, date: new Date(2024, 6, 28), category: "Groceries", vendor: "SuperMart", amount: 75.50, notes: "Weekly shopping" },
  { id: 2, date: new Date(2024, 6, 27), category: "Utilities", vendor: "City Power", amount: 120.00, notes: "Electricity bill" },
  { id: 3, date: new Date(2024, 6, 26), category: "Dining Out", vendor: "Pizza Place", amount: 45.25 },
  { id: 4, date: new Date(2024, 6, 25), category: "Transport", vendor: "Gas Station", amount: 50.00 },
  { id: 5, date: new Date(2024, 6, 24), category: "Entertainment", vendor: "Cinema", amount: 30.00, notes: "Movie tickets" },
  { id: 6, date: new Date(2024, 6, 1), category: "Rent", vendor: "Landlord", amount: 1200.00 },
];

const NO_VENDOR_VALUE = "__none__"; // Unique value for "None" option

export default function ExpensesPage() {
    const [expenses, setExpenses] = React.useState<Expense[]>(() => {
    if (typeof window !== 'undefined') {
      const savedExpenses = localStorage.getItem(LOCAL_STORAGE_KEY_EXPENSES);
      if (savedExpenses) {
        try {
          // Parse dates correctly from stored JSON strings
          const parsedExpenses = JSON.parse(savedExpenses).map((exp: any) => ({
            ...exp,
            date: new Date(exp.date) // Convert date string back to Date object
          }));
          return parsedExpenses;
        } catch (error) {
          console.error("Error parsing expenses from local storage:", error);
          return mockExpensesData; // Fallback to mock data on error
        }
      }
    }
    return mockExpensesData; // Default mock data if no saved data or SSR
  });

  const [categories, setCategories] = React.useState<string[]>(() => {
     if (typeof window !== 'undefined') {
       const saved = localStorage.getItem(LOCAL_STORAGE_KEY_CATEGORIES);
       // Parse categories which are stored as full objects, extract names
       if (saved) {
           try {
              const parsedCategories = JSON.parse(saved);
              return parsedCategories.map((cat: { id: number, name: string }) => cat.name);
           } catch (error) {
              console.error("Error parsing categories from local storage:", error);
              return mockCategoriesData;
           }
       }
     }
     return mockCategoriesData;
  });

  const [vendors, setVendors] = React.useState<string[]>(() => {
     if (typeof window !== 'undefined') {
       const saved = localStorage.getItem(LOCAL_STORAGE_KEY_VENDORS);
       // Parse vendors which are stored as full objects, extract names
       if (saved) {
         try {
            const parsedVendors = JSON.parse(saved);
            return parsedVendors.map((ven: { id: number, name: string }) => ven.name);
         } catch (error) {
            console.error("Error parsing vendors from local storage:", error);
            return mockVendorsData;
         }
       }
     }
     return mockVendorsData;
  });

  const { toast } = useToast()

  // Persist expenses to localStorage whenever they change
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY_EXPENSES, JSON.stringify(expenses));
    }
  }, [expenses]);

  // Effect to update categories/vendors if they change in other pages (via localStorage)
  React.useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === LOCAL_STORAGE_KEY_CATEGORIES && event.newValue) {
        try {
            const updatedCategories = JSON.parse(event.newValue);
            setCategories(updatedCategories.map((cat: { id: number, name: string }) => cat.name));
        } catch (error) {
            console.error("Error parsing categories update from storage event:", error);
        }
      }
      if (event.key === LOCAL_STORAGE_KEY_VENDORS && event.newValue) {
         try {
            const updatedVendors = JSON.parse(event.newValue);
            setVendors(updatedVendors.map((ven: { id: number, name: string }) => ven.name));
         } catch (error) {
            console.error("Error parsing vendors update from storage event:", error);
         }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      // Initial load check in case localStorage was updated while the page was inactive
       const currentSavedCategories = localStorage.getItem(LOCAL_STORAGE_KEY_CATEGORIES);
        if (currentSavedCategories) {
            try {
                 const parsedCategories = JSON.parse(currentSavedCategories);
                 setCategories(parsedCategories.map((cat: { id: number, name: string }) => cat.name));
            } catch {}
        }
        const currentSavedVendors = localStorage.getItem(LOCAL_STORAGE_KEY_VENDORS);
        if (currentSavedVendors) {
            try {
                const parsedVendors = JSON.parse(currentSavedVendors);
                setVendors(parsedVendors.map((ven: { id: number, name: string }) => ven.name));
            } catch {}
        }
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  }, []); // Empty dependency array means this runs once on mount and cleans up on unmount


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
    setExpenses(prevExpenses => [newExpense, ...prevExpenses]); // Add to the top
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
     setExpenses(prevExpenses => prevExpenses.filter(expense => expense.id !== id));
     toast({
      title: "Expense Deleted",
      description: `Successfully removed the expense record.`,
      variant: "destructive"
     })
  }


  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Add New Expense</CardTitle>
            <CardDescription>Record a new expense transaction.</CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
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
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                         {/* Set value to empty string if undefined to avoid React warning */}
                         <Input type="number" placeholder="0.00" {...field} value={field.value ?? ""} step="0.01" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                           {/* Ensure a valid value if the list is empty */}
                           {categories.length === 0 && <SelectItem value="-" disabled>No categories available</SelectItem>}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vendor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor (Optional)</FormLabel>
                      {/* Use `value={field.value || ""}` to handle controlled component behavior with empty string default */}
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                         <FormControl>
                          <SelectTrigger>
                             <SelectValue placeholder="Select a vendor or leave blank" />
                          </SelectTrigger>
                         </FormControl>
                        <SelectContent>
                           {/* Use a unique, non-empty value for the "None" option */}
                           <SelectItem value={NO_VENDOR_VALUE}>None</SelectItem>
                          {vendors.map((vendor) => (
                            <SelectItem key={vendor} value={vendor}>
                              {vendor}
                            </SelectItem>
                          ))}
                           {/* Ensure a valid value if the list is empty */}
                          {vendors.length === 0 && <SelectItem value="-" disabled>No vendors available</SelectItem>}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                <Button type="submit" className="w-full">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Expense History</CardTitle>
            <CardDescription>View all recorded expenses.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="overflow-x-auto">
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
                         <TableCell colSpan={6} className="text-center text-muted-foreground">
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
                           <Button
                             variant="ghost"
                             size="icon"
                             className="text-destructive hover:text-destructive"
                             onClick={() => deleteExpense(expense.id)}
                             aria-label="Delete expense"
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

    