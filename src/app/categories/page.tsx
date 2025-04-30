
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

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
import { useToast } from "@/hooks/use-toast"
import { PlusCircle, Trash2, Edit, Tag, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
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
import type { Category, Expense } from "@/types"; // Import types
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

// Define localStorage keys
const LOCAL_STORAGE_KEY_CATEGORIES = 'expenseWiseApp_categories';
const LOCAL_STORAGE_KEY_EXPENSES = 'expenseWiseApp_expenses'; // For checking usage

const categoryFormSchema = z.object({
  name: z.string().min(1, { message: "Category name cannot be empty." }),
})

type CategoryFormValues = z.infer<typeof categoryFormSchema>

// Mock data (fallback)
const mockCategoriesData: Category[] = [
  { id: 1, name: "Groceries" },
  { id: 2, name: "Utilities" },
];

export default function CategoriesPage() {
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [editingCategoryId, setEditingCategoryId] = React.useState<number | null>(null);
  const { toast } = useToast()

   // Load data from localStorage on client-side mount
   React.useEffect(() => {
    let loadedCategories: Category[] = [];
    const savedCategories = localStorage.getItem(LOCAL_STORAGE_KEY_CATEGORIES);
    if (savedCategories) {
      try {
        loadedCategories = JSON.parse(savedCategories);
      } catch (error) {
        console.error("Error parsing categories from local storage:", error);
        // loadedCategories = mockCategoriesData; // Optional: fallback to mock
      }
    }
    // Use mock if empty (optional)
    if(loadedCategories.length === 0) {
        // loadedCategories = mockCategoriesData;
    }

    setCategories(loadedCategories);
    setIsLoading(false);

     // --- Add localStorage listener ---
     const handleStorageChange = (event: StorageEvent) => {
        if (event.key === LOCAL_STORAGE_KEY_CATEGORIES) {
             let updatedCategories: Category[] = [];
             if (event.newValue) {
                 try { updatedCategories = JSON.parse(event.newValue); }
                 catch (error) { console.error("Error parsing categories update:", error); }
             }
             setCategories(updatedCategories);
        }
    };

      window.addEventListener('storage', handleStorageChange);

      // --- Cleanup listener ---
      return () => {
        window.removeEventListener('storage', handleStorageChange);
      };
  }, []);

  // Persist categories to localStorage whenever they change
  React.useEffect(() => {
     // Only save if not loading to prevent overwriting initial state potentially
    if (!isLoading) {
        localStorage.setItem(LOCAL_STORAGE_KEY_CATEGORIES, JSON.stringify(categories));
    }
  }, [categories, isLoading]);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
    },
  })

   React.useEffect(() => {
    if (editingCategoryId !== null) {
      const categoryToEdit = categories.find(c => c.id === editingCategoryId);
      if (categoryToEdit) {
        form.reset({ name: categoryToEdit.name }); // Only reset name
      }
    } else {
      form.reset({ name: "" }); // Reset to default when not editing
    }
  }, [editingCategoryId, categories, form]);


  function onSubmit(data: CategoryFormValues) {
    const existingCategory = categories.find(c => c.name.toLowerCase() === data.name.toLowerCase() && c.id !== editingCategoryId);
    if (existingCategory) {
        form.setError("name", { type: "manual", message: "Category name already exists." });
        return;
    }

    if (editingCategoryId !== null) {
      // Update existing category
      const updatedCategories = categories.map(category =>
          category.id === editingCategoryId ? { ...category, name: data.name } : category // Only update name
      );
      setCategories(updatedCategories);
      toast({
        title: "Category Updated",
        description: `Category "${data.name}" has been updated.`,
      });
      setEditingCategoryId(null); // Exit editing mode
    } else {
      // Add new category
      const newCategory: Category = {
        id: (categories.length > 0 ? Math.max(...categories.map(c => c.id)) : 0) + 1, // More robust ID generation
        name: data.name,
      };
      const updatedCategories = [newCategory, ...categories];
      setCategories(updatedCategories);
      toast({
        title: "Category Added",
        description: `Category "${data.name}" has been added.`,
      });
    }
    form.reset(); // Reset form after submission or update
  }

  function deleteCategory(id: number) {
     const categoryToDelete = categories.find(c => c.id === id);
     if (!categoryToDelete) return;

     // Check if category is in use by fetching expenses from localStorage
     let isCategoryInUse = false;
     const savedExpenses = localStorage.getItem(LOCAL_STORAGE_KEY_EXPENSES);
     if (savedExpenses) {
       try {
         const expensesData: Expense[] = JSON.parse(savedExpenses);
         isCategoryInUse = expensesData.some((exp) => exp.category === categoryToDelete.name);
       } catch (error) {
         console.error("Error checking expense usage:", error);
         // Handle error, maybe prevent deletion as a precaution
         toast({ title: "Error checking usage", description: "Could not verify if category is in use.", variant: "destructive" });
         return;
       }
     }

     if (isCategoryInUse) {
        toast({
          title: "Cannot Delete Category",
          description: `Category "${categoryToDelete.name}" is currently assigned to one or more expenses.`,
          variant: "destructive",
        });
        return;
     }


     const updatedCategories = categories.filter(category => category.id !== id);
     setCategories(updatedCategories);

     toast({
      title: "Category Deleted",
      description: `Category "${categoryToDelete.name}" has been removed.`,
      variant: "destructive"
     })
     if (editingCategoryId === id) {
       setEditingCategoryId(null); // Cancel edit if deleting the category being edited
       form.reset();
     }
  }

  function startEditing(id: number) {
    setEditingCategoryId(id);
  }

  function cancelEditing() {
    setEditingCategoryId(null);
    form.reset();
  }


  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Add/Edit Category Form Card */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>{editingCategoryId !== null ? "Edit Category" : "Add New Category"}</CardTitle>
            <CardDescription>{editingCategoryId !== null ? "Update the category name." : "Create a new expense category."}</CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Groceries, Utilities" {...field} disabled={isLoading}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="flex justify-between">
                {editingCategoryId !== null && (
                   <Button type="button" variant="outline" onClick={cancelEditing} disabled={isLoading}>
                     Cancel
                   </Button>
                 )}
                <Button type="submit" className={editingCategoryId === null ? "w-full" : ""} disabled={isLoading}>
                  {editingCategoryId !== null ? <Edit className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                  {editingCategoryId !== null ? "Update Category" : "Add Category"}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>

      {/* Category List Card */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Category List</CardTitle>
            <CardDescription>Manage your expense categories.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="overflow-x-auto">
             {isLoading ? (
                 <div className="flex justify-center items-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading categories...</span>
                </div>
             ) : (
                <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {categories.length === 0 && (
                           <TableRow>
                             <TableCell colSpan={2} className="text-center text-muted-foreground py-4">
                               No categories added yet.
                             </TableCell>
                           </TableRow>
                        )}
                        {categories.map((category) => (
                        <TableRow key={category.id} className={editingCategoryId === category.id ? "bg-secondary" : ""}>
                          <TableCell className="font-medium">
                             <Badge variant="secondary"><Tag className="inline-block h-3 w-3 mr-1" />{category.name}</Badge>
                          </TableCell>
                          <TableCell className="space-x-1">
                             <Button
                               variant="ghost"
                               size="icon"
                               onClick={() => startEditing(category.id)}
                               aria-label="Edit category"
                               disabled={editingCategoryId === category.id} // Disable edit button when editing this item
                             >
                               <Edit className="h-4 w-4" />
                             </Button>
                             <AlertDialog>
                               <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    aria-label="Delete category"
                                    disabled={editingCategoryId === category.id} // Disable delete button when editing this item
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                               </AlertDialogTrigger>
                               <AlertDialogContent>
                                 <AlertDialogHeader>
                                   <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                   <AlertDialogDescription>
                                     This action cannot be undone. This will permanently delete the category "{category.name}". Make sure no expenses are using this category.
                                   </AlertDialogDescription>
                                 </AlertDialogHeader>
                                 <AlertDialogFooter>
                                   <AlertDialogCancel>Cancel</AlertDialogCancel>
                                   <AlertDialogAction
                                    className={buttonVariants({ variant: "destructive" })} // Apply destructive style to delete action
                                    onClick={() => deleteCategory(category.id)}>
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
