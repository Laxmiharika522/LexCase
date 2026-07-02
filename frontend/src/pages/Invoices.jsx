import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, formatApiError } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CreditCard, Download, DollarSign, PlusCircle, Smartphone, Receipt, TrendingUp, History, CheckCircle2 } from "lucide-react";

export default function Invoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ client_id: "", lawyer_id: "", amount: "", description: "", due_date: "" });
  const [isCreating, setIsCreating] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [invoiceToPay, setInvoiceToPay] = useState(null);
  const [paymentMethods] = useState([
    { id: "1", type: "Credit Card", icon: "CreditCard" },
    { id: "2", type: "Debit Card", icon: "CreditCard" },
    { id: "3", type: "UPI", icon: "Smartphone" }
  ]);
  const [selectedMethod, setSelectedMethod] = useState("1");

  useEffect(() => {
    fetchInvoices();
    fetchUsers();
  }, [user]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/invoices");
      setInvoices(data);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await api.get("/users");
      setClients(data.filter(u => u.role === "client"));
      setLawyers(data.filter(u => u.role === "lawyer" || u.role === "admin"));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const payload = {
        ...createForm,
        amount: parseFloat(createForm.amount),
        status: "unpaid"
      };
      const { data } = await api.post("/invoices", payload);
      setInvoices([data, ...invoices]);
      toast.success("Invoice created successfully");
      setIsCreateModalOpen(false);
      setCreateForm({ client_id: "", lawyer_id: "", amount: "", description: "", due_date: "" });
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setIsCreating(false);
    }
  };

  const openPaymentModal = (inv) => {
    setInvoiceToPay(inv);
    setPaymentModalOpen(true);
  };

  const processPayment = async () => {
    if (!invoiceToPay) return;
    setPayingId(invoiceToPay.id);
    try {
      await new Promise(r => setTimeout(r, 800)); // Dummy processing delay
      await api.put(`/invoices/${invoiceToPay.id}/pay`);
      setInvoices(invoices.map(inv => inv.id === invoiceToPay.id ? { ...inv, status: "paid", paid_at: new Date().toISOString() } : inv));
      toast.success("Payment processed successfully!");
      setPaymentModalOpen(false);
      setInvoiceToPay(null);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setPayingId(null);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "paid": return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Paid</span>;
      case "unpaid": return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Unpaid</span>;
      case "overdue": return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 text-xs font-medium border border-rose-100"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>Overdue</span>;
      default: return <Badge variant="outline" className="rounded-sm px-2 py-0">{status}</Badge>;
    }
  };

  const totalOutstanding = invoices
    .filter(inv => inv.status !== "paid")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalPaid = invoices
    .filter(inv => inv.status === "paid")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const generateReceipt = (inv) => {
    const isPaid = inv.status === "paid";
    const lawyerAssigned = lawyers.find(l => l.id === inv.lawyer_id);
    const receiptContent = `
========================================
             LEXCASE RECEIPT
========================================

Invoice ID:    #${inv.id}
Date Issued:   ${new Date(inv.created_at || Date.now()).toLocaleDateString()}
Due Date:      ${new Date(inv.due_date).toLocaleDateString()}
Description:   ${inv.description}
${lawyerAssigned ? `Lawyer:        ${lawyerAssigned.name}\n` : ''}
----------------------------------------
AMOUNT:        ${formatCurrency(inv.amount)}
STATUS:        ${inv.status.toUpperCase()}
${isPaid && inv.paid_at ? `PAID ON:       ${new Date(inv.paid_at).toLocaleString()}` : ''}
----------------------------------------

Thank you for choosing LexCase.
========================================
    `.trim();

    const blob = new Blob([receiptContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Receipt_${inv.id.substring(0, 8)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isClient = user?.role === "client";
  const isLawyer = user?.role === "lawyer";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Premium Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 sm:p-12 shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-30"></div>
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-emerald-500 rounded-full blur-[100px] opacity-20"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="w-5 h-5 text-indigo-400" />
              <span className="text-xs font-semibold tracking-widest text-indigo-300 uppercase">Billing & Accounting</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-serif text-white tracking-tight leading-tight">
              Invoices <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-emerald-200">& Payments</span>
            </h1>
            <p className="text-slate-300 mt-3 text-lg font-light max-w-xl">
              Manage outstanding balances, view payment history, and download official receipts.
            </p>
          </div>
          {!isClient && (
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl h-12 px-6 bg-white text-slate-900 hover:bg-slate-100 shadow-xl transition-all border-0 font-medium">
                  <PlusCircle className="w-5 h-5 mr-2 text-indigo-600" />
                  Create Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[450px] rounded-2xl overflow-hidden p-0 border-0 shadow-2xl">
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white">
                  <DialogTitle className="text-xl font-serif">Create New Invoice</DialogTitle>
                  <DialogDescription className="text-slate-300 mt-1">
                    Generate a new bill for a client and optionally assign it to a lawyer.
                  </DialogDescription>
                </div>
                <form onSubmit={handleCreateInvoice} className="p-6 space-y-5 bg-white">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</Label>
                    <Select required value={createForm.client_id} onValueChange={(v) => setCreateForm({...createForm, client_id: v})}>
                      <SelectTrigger className="rounded-lg h-11 border-slate-200 focus:ring-indigo-500">
                        <SelectValue placeholder="Select client..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map(c => (
                          <SelectItem key={c.id} value={c.client_id || c.id}>{c.name} ({c.email})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {!isLawyer && (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Lawyer (Paid to)</Label>
                      <Select value={createForm.lawyer_id} onValueChange={(v) => setCreateForm({...createForm, lawyer_id: v})}>
                        <SelectTrigger className="rounded-lg h-11 border-slate-200 focus:ring-indigo-500">
                          <SelectValue placeholder="Select lawyer (optional)..." />
                        </SelectTrigger>
                        <SelectContent>
                          {lawyers.map(l => (
                            <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</Label>
                    <Input required placeholder="e.g. Retainer Fee, Consultation" value={createForm.description} onChange={(e) => setCreateForm({...createForm, description: e.target.value})} className="rounded-lg h-11 border-slate-200 focus:ring-indigo-500" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount (₹)</Label>
                      <Input required type="number" min="0" step="0.01" value={createForm.amount} onChange={(e) => setCreateForm({...createForm, amount: e.target.value})} className="rounded-lg h-11 border-slate-200 focus:ring-indigo-500" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Date</Label>
                      <Input required type="date" value={createForm.due_date} onChange={(e) => setCreateForm({...createForm, due_date: e.target.value})} className="rounded-lg h-11 border-slate-200 focus:ring-indigo-500" />
                    </div>
                  </div>
                  <DialogFooter className="pt-4 mt-2 border-t border-slate-100 flex items-center gap-2 justify-end">
                    <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="rounded-lg hover:bg-slate-100">Cancel</Button>
                    <Button type="submit" disabled={isCreating} className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-6 shadow-md transition-all">
                      {isCreating ? "Creating..." : "Create Invoice"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm hover:shadow-lg transition-shadow duration-300 rounded-2xl overflow-hidden bg-white">
          <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-orange-500"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" /> Total Unpaid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-serif text-slate-800">{formatCurrency(totalOutstanding)}</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-lg transition-shadow duration-300 rounded-2xl overflow-hidden bg-white">
          <div className="h-1 w-full bg-gradient-to-r from-emerald-400 to-teal-500"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-serif text-slate-800">{formatCurrency(totalPaid)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4 px-6 pt-6">
          <CardTitle className="text-xl font-serif text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-500" /> Billing History
          </CardTitle>
          <CardDescription className="text-slate-500 mt-1">All invoices associated with your account.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="min-h-[40vh] flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
              <div className="text-sm font-medium text-slate-500 uppercase tracking-widest">Loading Invoices...</div>
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <DollarSign className="w-8 h-8 text-slate-400" />
              </div>
              <div className="text-lg font-serif text-slate-900 mb-1">No invoices found</div>
              <div className="text-sm text-slate-500">You don't have any billing history yet.</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-6 py-4 w-[120px]">Invoice ID</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Description</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Due Date</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Amount</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500 px-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id} className="hover:bg-slate-50 transition-colors group">
                    <TableCell className="px-6 py-4">
                      <span className="font-mono text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                        #{inv.id.substring(0, 8)}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">
                      {inv.description}
                      {!isClient && (
                        <div className="text-xs text-slate-500 font-normal mt-0.5">
                          Billed to: {clients.find(c => c.client_id === inv.client_id || c.id === inv.client_id)?.name || "Client"}
                        </div>
                      )}
                      {inv.lawyer_id && !isLawyer && (
                        <div className="text-xs text-slate-500 font-normal mt-0.5">
                          Paid to: {lawyers.find(l => l.id === inv.lawyer_id)?.name || "Lawyer"}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {new Date(inv.due_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </TableCell>
                    <TableCell className="font-serif font-medium text-slate-900">
                      {formatCurrency(inv.amount)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(inv.status)}
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <div className="flex justify-end gap-2 items-center">
                        {inv.status !== "paid" && isClient && (
                          <Button 
                            size="sm" 
                            disabled={payingId === inv.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              openPaymentModal(inv);
                            }}
                            className="h-8 px-4 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
                          >
                            {payingId === inv.id ? "Processing..." : "Pay Now"}
                          </Button>
                        )}
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            generateReceipt(inv);
                          }}
                          title="Download Receipt"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl p-0 overflow-hidden border-0 shadow-2xl">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white">
            <DialogTitle className="text-xl font-serif">Process Payment</DialogTitle>
            <DialogDescription className="text-slate-300 mt-1">
              Review invoice details and confirm payment.
            </DialogDescription>
          </div>
          {invoiceToPay && (
            <div className="space-y-6 p-6 bg-white">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice ID</span>
                  <span className="text-sm font-mono font-medium text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">#{invoiceToPay.id.substring(0, 8)}</span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</span>
                  <span className="text-sm font-medium text-slate-900">{invoiceToPay.description}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                  <span className="font-semibold text-slate-700">Total Amount</span>
                  <span className="text-2xl font-serif text-indigo-700">{formatCurrency(invoiceToPay.amount)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Method</Label>
                <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                  <SelectTrigger className="h-12 w-full rounded-lg bg-white border-slate-200 shadow-sm focus:ring-indigo-500">
                    <SelectValue placeholder="Select a payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(method => (
                      <SelectItem key={method.id} value={method.id} className="h-12">
                        <div className="flex items-center gap-3">
                          {method.icon === 'Smartphone' ? <Smartphone className="w-5 h-5 text-indigo-500" /> : <CreditCard className="w-5 h-5 text-indigo-500" />}
                          <span className="font-medium text-sm text-slate-900">{method.type}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" onClick={() => setPaymentModalOpen(false)} className="rounded-lg hover:bg-slate-100">Cancel</Button>
                <Button 
                  onClick={processPayment} 
                  disabled={payingId === invoiceToPay.id} 
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all px-6"
                >
                  {payingId === invoiceToPay.id ? "Processing..." : "Proceed to Pay"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
