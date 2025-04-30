"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

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
import { PlusCircle, Trash2, Edit, Tag } from "lucide-react"
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

const categoryFormSchema = z.object({
  name: z.string().min(1, { message: "Category name cannot be empty." }),
  // Add description or icon fields if needed later
  // description: z.string().optional(),
})

type CategoryFormValues = z.infer<typeof categoryFormSchema>

// Mock data - replace with actual state management
const mockCategories = [
  { id: 1, name: "Groceries" },
  { id: 2, name: "Utilities" },
  { id: 3, name: "Dining Out" },
  { id: 4, name: "Transport" },
  { id: 5, name: "Entertainment" },
  { id: 6, name: "Rent" },
  { id: 7, name: "Healthcare" },
  { id: 8, name: "Clothing" },
  { id: 9, name: "Other" },
];

export default function CategoriesPage() {
  const [categories, setCategories] = React.useState(mockCategories);
  const [editingCategoryId, setEditingCategoryId] = React.useState<number | null>(null);
  const { toast } = useToast()

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
        form.reset(categoryToEdit);
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
      setCategories(prevCategories =>
        prevCategories.map(category =>
          category.id === editingCategoryId ? { ...category, ...data } : category
        )
      );
      toast({
        title: "Category Updated",
        description: `Category "${data.name}" has been updated.`,
      });
      setEditingCategoryId(null); // Exit editing mode
    } else {
      // Add new category
      const newCategory = {
        id: Math.max(0, ...categories.map(c => c.id)) + 1, // Simple ID generation
        ...data,
      };
      setCategories(prevCategories => [newCategory, ...prevCategories]);
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

     // Check if category is in use (replace with actual logic if expense data is available here)
     const isCategoryInUse = false; // Placeholder

     if (isCategoryInUse) {
        toast({
          title: "Cannot Delete Category",
          description: `Category "${categoryToDelete.name}" is currently assigned to one or more expenses.`,
          variant: "destructive",
        });
        return;
     }


     setCategories(prevCategories => prevCategories.filter(category => category.id !== id));
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
                        <Input placeholder="e.g., Groceries, Utilities" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 {/* Add other fields like description or icon selector here */}
              </CardContent>
              <CardFooter className="flex justify-between">
                {editingCategoryId !== null && (
                   <Button type="button" variant="outline" onClick={cancelEditing}>
                     Cancel
                   </Button>
                 )}
                <Button type="submit" className={editingCategoryId === null ? "w-full" : ""}>
                  {editingCategoryId !== null ? <Edit className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                  {editingCategoryId !== null ? "Update Category" : "Add Category"}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Category List</CardTitle>
            <CardDescription>Manage your expense categories.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    {/* <TableHead>Description</TableHead> */}
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {categories.length === 0 && (
                       <TableRow>
                         <TableCell colSpan={2} className="text-center text-muted-foreground">
                           No categories added yet.
                         </TableCell>
                       </TableRow>
                    )}
                  {categories.map((category) => (
                    <TableRow key={category.id} className={editingCategoryId === category.id ? "bg-secondary" : ""}>
                      <TableCell className="font-medium">
                         <Badge variant="secondary"><Tag className="inline-block h-3 w-3 mr-1" />{category.name}</Badge>
                      </TableCell>
                      {/* <TableCell>{category.description || "-"}</TableCell> */}
                      <TableCell className="space-x-1">
                         <Button
                           variant="ghost"
                           size="icon"
                           onClick={() => startEditing(category.id)}
                           aria-label="Edit category"
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
                               <AlertDialogAction onClick={() => deleteCategory(category.id)}>
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
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
