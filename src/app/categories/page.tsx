
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { db } from "@/lib/firebase" // Import Firestore instance
import {
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy, // Import orderBy
    limit // Import limit
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

const CATEGORIES_QUERY_KEY = "categories";
const EXPENSES_QUERY_KEY = "expenses"; // For checking usage

const categoryFormSchema = z.object({
  name: z.string().min(1, { message: "Category name cannot be empty." }),
})

type CategoryFormValues = z.infer<typeof categoryFormSchema>

// Firestore collection references
const categoriesCollectionRef = collection(db, "categories");
const expensesCollectionRef = collection(db, "expenses");

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingCategoryId, setEditingCategoryId] = React.useState<string | null>(null); // Use string for ID

  // Fetch categories using React Query
  const { data: categories = [], isLoading, error } = useQuery<Category[]>({
      queryKey: [CATEGORIES_QUERY_KEY],
      queryFn: async () => {
          const q = query(categoriesCollectionRef, orderBy("name")); // Order by name
          const querySnapshot = await getDocs(q);
          const categoriesData = querySnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
          } as Category));
          return categoriesData;
      },
      staleTime: 1000 * 60 * 5, // Cache categories for 5 minutes
  });

  // Mutation for adding a category
  const addCategoryMutation = useMutation({
    mutationFn: async (newCategoryData: Omit<Category, 'id'>) => {
      // Check if category name already exists (case-insensitive)
      const existingQuery = query(categoriesCollectionRef, where("name", "==", newCategoryData.name)); // Case-sensitive Firestore query; handle case-insensitivity client-side if needed
      const existingSnapshot = await getDocs(existingQuery);
      if (!existingSnapshot.empty) {
        // Firestore is case-sensitive, so we need a client-side check for case-insensitivity
        const lowerCaseName = newCategoryData.name.toLowerCase();
        const exists = categories.some(cat => cat.name.toLowerCase() === lowerCaseName);
        if (exists) {
            throw new Error("Category name already exists.");
        }
      }

      const docRef = await addDoc(categoriesCollectionRef, newCategoryData);
      return { id: docRef.id, ...newCategoryData };
    },
    onSuccess: (newCategory) => {
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_QUERY_KEY] }); // Refetch categories
      toast({
        title: "Category Added",
        description: `Category "${newCategory.name}" has been added.`,
      });
      form.reset();
    },
    onError: (error: Error) => {
        if (error.message === "Category name already exists.") {
             form.setError("name", { type: "manual", message: error.message });
        } else {
             toast({
               title: "Error Adding Category",
               description: error.message || "Could not add the category.",
               variant: "destructive",
             });
        }
    },
  });

  // Mutation for updating a category
  const updateCategoryMutation = useMutation({
     mutationFn: async ({ id, data }: { id: string; data: CategoryFormValues }) => {
         // Check for existing name (case-insensitive) excluding the current category being edited
         const lowerCaseName = data.name.toLowerCase();
         const exists = categories.some(cat => cat.id !== id && cat.name.toLowerCase() === lowerCaseName);
         if (exists) {
             throw new Error("Category name already exists.");
         }

         const categoryDocRef = doc(db, "categories", id);
         await updateDoc(categoryDocRef, data); // Only update fields present in data (name)
         return { id, ...data };
     },
     onSuccess: (updatedCategory) => {
        queryClient.invalidateQueries({ queryKey: [CATEGORIES_QUERY_KEY] });
        toast({
            title: "Category Updated",
            description: `Category "${updatedCategory.name}" has been updated.`,
        });
        setEditingCategoryId(null);
        form.reset();
     },
     onError: (error: Error) => {
         if (error.message === "Category name already exists.") {
             form.setError("name", { type: "manual", message: error.message });
         } else {
             toast({
                 title: "Error Updating Category",
                 description: error.message || "Could not update the category.",
                 variant: "destructive",
             });
         }
     },
  });

  // Mutation for deleting a category
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const categoryToDelete = categories.find(c => c.id === id);
      if (!categoryToDelete) throw new Error("Category not found.");

      // Check if category is in use by any expenses
      const expensesQuery = query(
          expensesCollectionRef,
          where("category", "==", categoryToDelete.name),
          limit(1) // We only need to know if at least one exists
      );
      const expensesSnapshot = await getDocs(expensesQuery);
      if (!expensesSnapshot.empty) {
        throw new Error(`Category "${categoryToDelete.name}" is currently assigned to one or more expenses.`);
      }

      const categoryDocRef = doc(db, "categories", id);
      await deleteDoc(categoryDocRef);
      return id; // Return the deleted ID for onSuccess
    },
    onSuccess: (deletedId) => {
        const deletedCategory = categories.find(c => c.id === deletedId);
        // Optimistic update
        queryClient.setQueryData<Category[]>([CATEGORIES_QUERY_KEY], (oldData) =>
          oldData ? oldData.filter((cat) => cat.id !== deletedId) : []
        );
        queryClient.invalidateQueries({ queryKey: [CATEGORIES_QUERY_KEY] });
        toast({
            title: "Category Deleted",
            description: `Category "${deletedCategory?.name || ''}" has been removed.`,
            variant: "destructive"
        });
        if (editingCategoryId === deletedId) {
           setEditingCategoryId(null);
           form.reset();
        }
    },
    onError: (error: Error) => {
        toast({
            title: "Cannot Delete Category",
            description: error.message || "Could not delete the category.",
            variant: "destructive",
        });
    },
  });

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
    },
  });

   React.useEffect(() => {
    if (editingCategoryId !== null) {
      const categoryToEdit = categories.find(c => c.id === editingCategoryId);
      if (categoryToEdit) {
        form.reset({ name: categoryToEdit.name });
      }
    } else {
      form.reset({ name: "" });
    }
   }, [editingCategoryId, categories, form]); // Dependencies: editingCategoryId, categories array, form instance


  function onSubmit(data: CategoryFormValues) {
    if (editingCategoryId !== null) {
      updateCategoryMutation.mutate({ id: editingCategoryId, data });
    } else {
      addCategoryMutation.mutate(data);
    }
  }

  function deleteCategory(id: string) {
    deleteCategoryMutation.mutate(id);
  }

  function startEditing(id: string) {
    setEditingCategoryId(id);
     // Scroll to the form for better UX on mobile
     const formCard = document.getElementById("category-form-card");
     formCard?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cancelEditing() {
    setEditingCategoryId(null);
    form.reset();
  }

  if (error) {
      return <div className="text-destructive">Error loading categories: {(error as Error).message}</div>;
  }


  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Add/Edit Category Form Card */}
      <div className="lg:col-span-1" id="category-form-card">
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
                        <Input placeholder="e.g., Groceries, Utilities" {...field} disabled={isLoading || addCategoryMutation.isPending || updateCategoryMutation.isPending}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="flex justify-between flex-wrap gap-2"> {/* Added flex-wrap and gap */}
                 {editingCategoryId !== null && (
                   <Button type="button" variant="outline" onClick={cancelEditing} disabled={isLoading || updateCategoryMutation.isPending} className="flex-grow sm:flex-grow-0"> {/* Flex grow for smaller screens */}
                     Cancel
                   </Button>
                 )}
                <Button
                    type="submit"
                    className={editingCategoryId === null ? "w-full sm:w-auto flex-grow sm:flex-grow-0" : "flex-grow sm:flex-grow-0"} // Full width on smallest, auto/grow otherwise
                    disabled={isLoading || addCategoryMutation.isPending || updateCategoryMutation.isPending}
                 >
                  {(addCategoryMutation.isPending || updateCategoryMutation.isPending) ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : editingCategoryId !== null ? (
                    <Edit className="mr-2 h-4 w-4" />
                  ) : (
                    <PlusCircle className="mr-2 h-4 w-4" />
                  )}
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
             <div className="overflow-x-auto"> {/* Add horizontal scroll */}
             {isLoading ? (
                  <div className="space-y-2">
                     <Skeleton className="h-10 w-full" />
                     <Skeleton className="h-10 w-full" />
                     <Skeleton className="h-10 w-full" />
                     <Skeleton className="h-10 w-full" />
                     <Skeleton className="h-10 w-full" />
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
                        {categories.length === 0 && !isLoading && (
                           <TableRow>
                             <TableCell colSpan={2} className="text-center text-muted-foreground py-4">
                               No categories added yet.
                             </TableCell>
                           </TableRow>
                        )}
                        {categories.map((category) => (
                        <TableRow key={category.id} className={editingCategoryId === category.id ? "bg-secondary" : ""}>
                          <TableCell className="font-medium whitespace-nowrap">
                             <Badge variant="secondary"><Tag className="inline-block h-3 w-3 mr-1" />{category.name}</Badge>
                          </TableCell>
                          <TableCell className="space-x-1 whitespace-nowrap">
                             <Button
                               variant="ghost"
                               size="icon"
                               onClick={() => startEditing(category.id)}
                               aria-label="Edit category"
                               disabled={editingCategoryId === category.id || deleteCategoryMutation.isPending} // Disable edit button when editing this item or deleting
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
                                    disabled={editingCategoryId === category.id || deleteCategoryMutation.isPending && deleteCategoryMutation.variables === category.id} // Disable when editing this or deleting this
                                  >
                                     {deleteCategoryMutation.isPending && deleteCategoryMutation.variables === category.id ? (
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
                                     This action cannot be undone. This will permanently delete the category "{category.name}". Make sure no expenses are using this category.
                                   </AlertDialogDescription>
                                 </AlertDialogHeader>
                                 <AlertDialogFooter>
                                   <AlertDialogCancel>Cancel</AlertDialogCancel>
                                   <AlertDialogAction
                                    className={buttonVariants({ variant: "destructive" })}
                                    onClick={() => deleteCategory(category.id)}
                                    disabled={deleteCategoryMutation.isPending}
                                    >
                                     {deleteCategoryMutation.isPending && deleteCategoryMutation.variables === category.id ? (
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
