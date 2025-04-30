
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
import { PlusCircle, Trash2, Edit, Loader2, Building } from "lucide-react"
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
import type { Vendor, Expense } from "@/types"; // Import types
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

const VENDORS_QUERY_KEY = "vendors";
const EXPENSES_QUERY_KEY = "expenses"; // For checking usage

const vendorFormSchema = z.object({
  name: z.string().min(1, { message: "Vendor name cannot be empty." }),
  contactPerson: z.string().optional(),
  contactEmail: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  contactPhone: z.string().optional(),
})

type VendorFormValues = z.infer<typeof vendorFormSchema>

// Firestore collection references
const vendorsCollectionRef = collection(db, "vendors");
const expensesCollectionRef = collection(db, "expenses");


export default function VendorsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingVendorId, setEditingVendorId] = React.useState<string | null>(null); // Use string for ID

  // Fetch vendors using React Query
  const { data: vendors = [], isLoading, error } = useQuery<Vendor[]>({
    queryKey: [VENDORS_QUERY_KEY],
    queryFn: async () => {
        const q = query(vendorsCollectionRef, orderBy("name")); // Order by name
        const querySnapshot = await getDocs(q);
        const vendorsData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Vendor));
        return vendorsData;
    },
    staleTime: 1000 * 60 * 5, // Cache vendors for 5 minutes
  });

  // Mutation for adding a vendor
  const addVendorMutation = useMutation({
    mutationFn: async (newVendorData: VendorFormValues) => {
        // Check if vendor name already exists (case-insensitive check on client)
        const lowerCaseName = newVendorData.name.toLowerCase();
        const exists = vendors.some(v => v.name.toLowerCase() === lowerCaseName);
        if (exists) {
          throw new Error("Vendor name already exists.");
        }

        const docRef = await addDoc(vendorsCollectionRef, newVendorData);
        return { id: docRef.id, ...newVendorData };
    },
    onSuccess: (newVendor) => {
        queryClient.invalidateQueries({ queryKey: [VENDORS_QUERY_KEY] });
        toast({
            title: "Vendor Added",
            description: `Vendor "${newVendor.name}" has been added.`,
        });
        form.reset();
    },
    onError: (error: Error) => {
        if (error.message === "Vendor name already exists.") {
            form.setError("name", { type: "manual", message: error.message });
        } else {
            toast({
                title: "Error Adding Vendor",
                description: error.message || "Could not add the vendor.",
                variant: "destructive",
            });
        }
    },
  });

  // Mutation for updating a vendor
  const updateVendorMutation = useMutation({
     mutationFn: async ({ id, data }: { id: string; data: VendorFormValues }) => {
         // Check for existing name (case-insensitive) excluding the current vendor
         const lowerCaseName = data.name.toLowerCase();
         const exists = vendors.some(v => v.id !== id && v.name.toLowerCase() === lowerCaseName);
         if (exists) {
             throw new Error("Vendor name already exists.");
         }

         const vendorDocRef = doc(db, "vendors", id);
         await updateDoc(vendorDocRef, data);
         return { id, ...data };
     },
     onSuccess: (updatedVendor) => {
         queryClient.invalidateQueries({ queryKey: [VENDORS_QUERY_KEY] });
         toast({
             title: "Vendor Updated",
             description: `Vendor "${updatedVendor.name}" has been updated.`,
         });
         setEditingVendorId(null);
         form.reset();
     },
     onError: (error: Error) => {
         if (error.message === "Vendor name already exists.") {
             form.setError("name", { type: "manual", message: error.message });
         } else {
             toast({
                 title: "Error Updating Vendor",
                 description: error.message || "Could not update the vendor.",
                 variant: "destructive",
             });
         }
     },
  });

  // Mutation for deleting a vendor
  const deleteVendorMutation = useMutation({
    mutationFn: async (id: string) => {
        const vendorToDelete = vendors.find(v => v.id === id);
        if (!vendorToDelete) throw new Error("Vendor not found.");

        // Check if vendor is in use by any expenses
        const expensesQuery = query(
            expensesCollectionRef,
            where("vendor", "==", vendorToDelete.name),
            limit(1) // We only need to know if at least one exists
        );
        const expensesSnapshot = await getDocs(expensesQuery);
        if (!expensesSnapshot.empty) {
            throw new Error(`Vendor "${vendorToDelete.name}" is currently assigned to one or more expenses.`);
        }

        const vendorDocRef = doc(db, "vendors", id);
        await deleteDoc(vendorDocRef);
        return id; // Return the deleted ID
    },
    onSuccess: (deletedId) => {
        const deletedVendor = vendors.find(v => v.id === deletedId);
        // Optimistic update: remove from cache immediately
        queryClient.setQueryData<Vendor[]>([VENDORS_QUERY_KEY], (oldData) =>
            oldData ? oldData.filter((v) => v.id !== deletedId) : []
        );
        // Invalidate to ensure consistency
        queryClient.invalidateQueries({ queryKey: [VENDORS_QUERY_KEY] });

        toast({
            title: "Vendor Deleted",
            description: `Vendor "${deletedVendor?.name || ''}" has been removed.`,
            variant: "destructive"
        });
        if (editingVendorId === deletedId) {
            setEditingVendorId(null);
            form.reset();
        }
    },
    onError: (error: Error) => {
        toast({
            title: "Cannot Delete Vendor",
            description: error.message || "Could not delete the vendor.",
            variant: "destructive",
        });
    },
  });

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      contactEmail: "",
      contactPhone: "",
    },
  })

   React.useEffect(() => {
    if (editingVendorId !== null) {
      const vendorToEdit = vendors.find(v => v.id === editingVendorId);
      if (vendorToEdit) {
        form.reset({
            name: vendorToEdit.name,
            contactPerson: vendorToEdit.contactPerson || "",
            contactEmail: vendorToEdit.contactEmail || "",
            contactPhone: vendorToEdit.contactPhone || "",
        });
      }
    } else {
      form.reset({ name: "", contactPerson: "", contactEmail: "", contactPhone: "" });
    }
  }, [editingVendorId, vendors, form]);


  function onSubmit(data: VendorFormValues) {
    if (editingVendorId !== null) {
      updateVendorMutation.mutate({ id: editingVendorId, data });
    } else {
      addVendorMutation.mutate(data);
    }
  }

  function deleteVendor(id: string) {
     deleteVendorMutation.mutate(id);
  }

  function startEditing(id: string) {
    setEditingVendorId(id);
     // Scroll to the form for better UX on mobile
     const formCard = document.getElementById("vendor-form-card");
     formCard?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cancelEditing() {
    setEditingVendorId(null);
    form.reset();
  }

   if (error) {
      return <div className="text-destructive">Error loading vendors: {(error as Error).message}</div>;
   }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Add/Edit Vendor Form Card */}
      <div className="lg:col-span-1" id="vendor-form-card">
        <Card>
          <CardHeader>
            <CardTitle>{editingVendorId !== null ? "Edit Vendor" : "Add New Vendor"}</CardTitle>
            <CardDescription>{editingVendorId !== null ? "Update the vendor details." : "Add a new vendor or party."}</CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., SuperMart, Landlord" {...field} disabled={isLoading || addVendorMutation.isPending || updateVendorMutation.isPending}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., John Doe" {...field} disabled={isLoading || addVendorMutation.isPending || updateVendorMutation.isPending}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email (Optional)</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="e.g., contact@example.com" {...field} disabled={isLoading || addVendorMutation.isPending || updateVendorMutation.isPending}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 123-456-7890" {...field} disabled={isLoading || addVendorMutation.isPending || updateVendorMutation.isPending}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="flex justify-between flex-wrap gap-2"> {/* Added flex-wrap and gap */}
                 {editingVendorId !== null && (
                   <Button type="button" variant="outline" onClick={cancelEditing} disabled={isLoading || updateVendorMutation.isPending} className="flex-grow sm:flex-grow-0"> {/* Flex grow for smaller screens */}
                     Cancel
                   </Button>
                 )}
                 <Button
                    type="submit"
                    className={editingVendorId === null ? "w-full sm:w-auto flex-grow sm:flex-grow-0" : "flex-grow sm:flex-grow-0"} // Full width on smallest, auto/grow otherwise
                    disabled={isLoading || addVendorMutation.isPending || updateVendorMutation.isPending}
                 >
                   {(addVendorMutation.isPending || updateVendorMutation.isPending) ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : editingVendorId !== null ? (
                    <Edit className="mr-2 h-4 w-4" />
                  ) : (
                    <PlusCircle className="mr-2 h-4 w-4" />
                  )}
                  {editingVendorId !== null ? "Update Vendor" : "Add Vendor"}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>

      {/* Vendor List Card */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Vendor List</CardTitle>
            <CardDescription>Manage your vendors and parties.</CardDescription>
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
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {vendors.length === 0 && !isLoading && (
                       <TableRow>
                         <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                           No vendors added yet.
                         </TableCell>
                       </TableRow>
                    )}
                  {vendors.map((vendor) => (
                    <TableRow key={vendor.id} className={editingVendorId === vendor.id ? "bg-secondary" : ""}>
                      <TableCell className="font-medium whitespace-nowrap"><Building className="inline-block h-4 w-4 mr-1 text-muted-foreground" />{vendor.name}</TableCell>
                      <TableCell className="whitespace-nowrap">{vendor.contactPerson || "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">{vendor.contactEmail || "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">{vendor.contactPhone || "-"}</TableCell>
                      <TableCell className="space-x-1 whitespace-nowrap">
                         <Button
                           variant="ghost"
                           size="icon"
                           onClick={() => startEditing(vendor.id)}
                           aria-label="Edit vendor"
                           disabled={editingVendorId === vendor.id || deleteVendorMutation.isPending} // Disable when editing this or deleting
                         >
                           <Edit className="h-4 w-4" />
                         </Button>
                         <AlertDialog>
                           <AlertDialogTrigger asChild>
                             <Button
                               variant="ghost"
                               size="icon"
                               className="text-destructive hover:text-destructive"
                               aria-label="Delete vendor"
                               disabled={editingVendorId === vendor.id || deleteVendorMutation.isPending && deleteVendorMutation.variables === vendor.id} // Disable when editing this or deleting this
                              >
                                {deleteVendorMutation.isPending && deleteVendorMutation.variables === vendor.id ? (
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
                                 This action cannot be undone. This will permanently delete the vendor "{vendor.name}". Make sure no expenses are using this vendor.
                               </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                               <AlertDialogCancel>Cancel</AlertDialogCancel>
                               <AlertDialogAction
                                className={buttonVariants({ variant: "destructive" })} // Apply destructive style
                                onClick={() => deleteVendor(vendor.id)}
                                disabled={deleteVendorMutation.isPending}>
                                 {deleteVendorMutation.isPending && deleteVendorMutation.variables === vendor.id ? (
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
