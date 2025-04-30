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


const expenseFormSchema = z.object({
  date: z.date({ required_error: "Expense date is required." }),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
  category: z.string({ required_error: "Category is required." }).min(1, "Category is required."),
  vendor: z.string().optional(),
  notes: z.string().optional(),
})

type ExpenseFormValues = z.infer<typeof expenseFormSchema>

// Mock data - replace with actual data fetching and state management
const mockCategories = ["Groceries", "Utilities", "Dining Out", "Transport", "Entertainment", "Rent", "Other"]
const mockVendors = ["SuperMart", "City Power", "Pizza Place", "Gas Station", "Cinema", "Landlord", "Online Store"]
const mockExpenses = [
  { id: 1, date: new Date(2024, 6, 28), category: "Groceries", vendor: "SuperMart", amount: 75.50, notes: "Weekly shopping" },
  { id: 2, date: new Date(2024, 6, 27), category: "Utilities", vendor: "City Power", amount: 120.00, notes: "Electricity bill" },
  { id: 3, date: new Date(2024, 6, 26), category: "Dining Out", vendor: "Pizza Place", amount: 45.25 },
  { id: 4, date: new Date(2024, 6, 25), category: "Transport", vendor: "Gas Station", amount: 50.00 },
  { id: 5, date: new Date(2024, 6, 24), category: "Entertainment", vendor: "Cinema", amount: 30.00, notes: "Movie tickets" },
  { id: 6, date: new Date(2024, 6, 1), category: "Rent", vendor: "Landlord", amount: 1200.00 },
];


export default function ExpensesPage() {
  const [expenses, setExpenses] = React.useState(mockExpenses);
  const [categories, setCategories] = React.useState(mockCategories); // Replace with fetched data
  const [vendors, setVendors] = React.useState(mockVendors); // Replace with fetched data
  const { toast } = useToast()

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: 0,
      category: "",
      vendor: "",
      notes: "",
      date: new Date(),
    },
  })

  function onSubmit(data: ExpenseFormValues) {
    const newExpense = {
        id: Math.max(0, ...expenses.map(e => e.id)) + 1, // Simple ID generation
        ...data,
    };
    setExpenses(prevExpenses => [newExpense, ...prevExpenses]); // Add to the top
    toast({
      title: "Expense Added",
      description: `Added ${data.category} expense of $${data.amount.toFixed(2)}.`,
    })
    form.reset(); // Reset form after submission
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
                        <Input type="number" placeholder="0.00" {...field} step="0.01" />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                         <FormControl>
                          <SelectTrigger>
                             <SelectValue placeholder="Select a vendor or leave blank" />
                          </SelectTrigger>
                         </FormControl>
                        <SelectContent>
                           <SelectItem value="">None</SelectItem>
                          {vendors.map((vendor) => (
                            <SelectItem key={vendor} value={vendor}>
                              {vendor}
                            </SelectItem>
                          ))}
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
                        <TableCell className="max-w-[150px] truncate" title={expense.notes}>{expense.notes || "-"}</TableCell>
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
