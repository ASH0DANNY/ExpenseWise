
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
import { PlusCircle, Trash2, Edit, Loader2 } from "lucide-react"
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

// Define localStorage key
const LOCAL_STORAGE_KEY_VENDORS = 'expenseWiseApp_vendors';
const LOCAL_STORAGE_KEY_EXPENSES = 'expenseWiseApp_expenses'; // For checking usage

const vendorFormSchema = z.object({
  name: z.string().min(1, { message: "Vendor name cannot be empty." }),
  contactPerson: z.string().optional(),
  contactEmail: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  contactPhone: z.string().optional(),
})

type VendorFormValues = z.infer<typeof vendorFormSchema>

// Mock data (fallback)
const mockVendorsData: Vendor[] = [
  { id: 1, name: "SuperMart", contactPerson: "John Doe", contactEmail: "john.doe@supermart.com", contactPhone: "123-456-7890" },
  { id: 2, name: "City Power" },
];

export default function VendorsPage() {
  const [vendors, setVendors] = React.useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [editingVendorId, setEditingVendorId] = React.useState<number | null>(null);
  const { toast } = useToast()

  // Load data from localStorage on client-side mount
  React.useEffect(() => {
    let loadedVendors: Vendor[] = [];
    const savedVendors = localStorage.getItem(LOCAL_STORAGE_KEY_VENDORS);
    if (savedVendors) {
      try {
        loadedVendors = JSON.parse(savedVendors);
      } catch (error) {
        console.error("Error parsing vendors from local storage:", error);
        // loadedVendors = mockVendorsData; // Optional: fallback to mock
      }
    }
     // Use mock if empty (optional)
    if(loadedVendors.length === 0) {
        // loadedVendors = mockVendorsData;
    }

    setVendors(loadedVendors);
    setIsLoading(false);

     // --- Add localStorage listener ---
     const handleStorageChange = (event: StorageEvent) => {
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
  }, []);

  // Persist vendors to localStorage whenever they change
  React.useEffect(() => {
     // Only save if not loading to prevent overwriting initial state potentially
    if (!isLoading) {
        localStorage.setItem(LOCAL_STORAGE_KEY_VENDORS, JSON.stringify(vendors));
    }
  }, [vendors, isLoading]);

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
        form.reset(vendorToEdit);
      }
    } else {
      form.reset({ name: "", contactPerson: "", contactEmail: "", contactPhone: "" }); // Reset to default when not editing
    }
  }, [editingVendorId, vendors, form]);


  function onSubmit(data: VendorFormValues) {
     const existingVendor = vendors.find(v => v.name.toLowerCase() === data.name.toLowerCase() && v.id !== editingVendorId);
     // Check for existing name only when adding a new vendor or when editing and the name has changed
     if (existingVendor && (editingVendorId === null || vendors.find(v => v.id === editingVendorId)?.name.toLowerCase() !== data.name.toLowerCase())) {
         form.setError("name", { type: "manual", message: "Vendor name already exists." });
         return;
     }

    if (editingVendorId !== null) {
      // Update existing vendor
      const updatedVendors = vendors.map(vendor =>
          vendor.id === editingVendorId ? { ...vendor, ...data } : vendor
        );
      setVendors(updatedVendors);
      toast({
        title: "Vendor Updated",
        description: `Vendor "${data.name}" has been updated.`,
      });
      setEditingVendorId(null); // Exit editing mode
    } else {
      // Add new vendor
      const newVendor: Vendor = {
        id: (vendors.length > 0 ? Math.max(...vendors.map(v => v.id)) : 0) + 1, // More robust ID generation
        ...data,
      };
      const updatedVendors = [newVendor, ...vendors];
      setVendors(updatedVendors);
      toast({
        title: "Vendor Added",
        description: `Vendor "${data.name}" has been added.`,
      });
    }
    form.reset(); // Reset form after submission or update
  }

  function deleteVendor(id: number) {
     const vendorToDelete = vendors.find(v => v.id === id);
     if (!vendorToDelete) return;

     // Check if vendor is in use by fetching expenses from localStorage
      let isVendorInUse = false;
      const savedExpenses = localStorage.getItem(LOCAL_STORAGE_KEY_EXPENSES);
      if (savedExpenses) {
          try {
              const expensesData: Expense[] = JSON.parse(savedExpenses);
              isVendorInUse = expensesData.some((exp) => exp.vendor === vendorToDelete.name);
          } catch (error) {
              console.error("Error checking expense usage:", error);
              toast({ title: "Error checking usage", description: "Could not verify if vendor is in use.", variant: "destructive" });
              return;
          }
      }

      if (isVendorInUse) {
          toast({
              title: "Cannot Delete Vendor",
              description: `Vendor "${vendorToDelete.name}" is currently assigned to one or more expenses.`,
              variant: "destructive",
          });
          return;
      }


     const updatedVendors = vendors.filter(vendor => vendor.id !== id);
     setVendors(updatedVendors);

     toast({
      title: "Vendor Deleted",
      description: `Vendor "${vendorToDelete.name}" has been removed.`,
      variant: "destructive"
     })
     if (editingVendorId === id) {
       setEditingVendorId(null); // Cancel edit if deleting the vendor being edited
       form.reset();
     }
  }

  function startEditing(id: number) {
    setEditingVendorId(id);
  }

  function cancelEditing() {
    setEditingVendorId(null);
    form.reset();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Add/Edit Vendor Form Card */}
      <div className="lg:col-span-1">
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
                        <Input placeholder="e.g., SuperMart, Landlord" {...field} disabled={isLoading}/>
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
                        <Input placeholder="e.g., John Doe" {...field} disabled={isLoading}/>
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
                        <Input type="email" placeholder="e.g., contact@example.com" {...field} disabled={isLoading}/>
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
                        <Input placeholder="e.g., 123-456-7890" {...field} disabled={isLoading}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="flex justify-between">
                 {editingVendorId !== null && (
                   <Button type="button" variant="outline" onClick={cancelEditing} disabled={isLoading}>
                     Cancel
                   </Button>
                 )}
                <Button type="submit" className={editingVendorId === null ? "w-full" : ""} disabled={isLoading}>
                  {editingVendorId !== null ? <Edit className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
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
             <div className="overflow-x-auto">
             {isLoading ? (
                 <div className="flex justify-center items-center p-4">
                     <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                     <span className="ml-2 text-muted-foreground">Loading vendors...</span>
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
                   {vendors.length === 0 && (
                       <TableRow>
                         <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                           No vendors added yet.
                         </TableCell>
                       </TableRow>
                    )}
                  {vendors.map((vendor) => (
                    <TableRow key={vendor.id} className={editingVendorId === vendor.id ? "bg-secondary" : ""}>
                      <TableCell className="font-medium">{vendor.name}</TableCell>
                      <TableCell>{vendor.contactPerson || "-"}</TableCell>
                      <TableCell>{vendor.contactEmail || "-"}</TableCell>
                      <TableCell>{vendor.contactPhone || "-"}</TableCell>
                      <TableCell className="space-x-1">
                         <Button
                           variant="ghost"
                           size="icon"
                           onClick={() => startEditing(vendor.id)}
                           aria-label="Edit vendor"
                           disabled={editingVendorId === vendor.id} // Disable edit button when editing this item
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
                               disabled={editingVendorId === vendor.id} // Disable delete button when editing this item
                              >
                               <Trash2 className="h-4 w-4" />
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
                                onClick={() => deleteVendor(vendor.id)}>
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
