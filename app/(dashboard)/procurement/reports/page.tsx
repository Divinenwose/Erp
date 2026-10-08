'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { exportExcel } from '@/lib/excel-export';
import { PermissionGuard } from '@/components/rbac/PermissionGuard';
import { formatCurrency, formatDate } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import DataTable, { Column } from '@/components/common/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, ShoppingCart, Package, DollarSign, TrendingUp, Building2, RefreshCw } from 'lucide-react';

export default function ProcurementReportsPage() {
  const { company } = useAuth();
  const [loading, setLoading] = useState(true);
  const [poStatusData, setPoStatusData] = useState<any[]>([]);
  const [deliveryData, setDeliveryData] = useState<any[]>([]);
  const [invoiceData, setInvoiceData] = useState<any[]>([]);
  const [supplierPerfData, setSupplierPerfData] = useState<any[]>([]);
  const [replenishmentData, setReplenishmentData] = useState<any[]>([]);
  const [buyingActivityData, setBuyingActivityData] = useState<any[]>([]);

  const loadReports = async () => {
    if (!company?.id) return;
    
    const [poRes, deliveryRes, invoiceRes, supplierRes, replenishmentRes, activityRes] = await Promise.all([
      supabase.from('purchase_orders').select('*, vendors(name)').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('goods_received_notes').select('*, purchase_orders(po_number, vendors(name))').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('invoice_verifications').select('*, purchase_orders(po_number, vendors(name))').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('supplier_performance').select('*, vendors(name)').eq('company_id', company.id).order('overall_score', { ascending: false }),
      supabase.from('replenishment_requests').select('*').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('buying_activities').select('*, vendors(name)').eq('company_id', company.id).order('activity_date', { ascending: false }),
    ]);

    setPoStatusData(poRes.data ?? []);
    setDeliveryData(deliveryRes.data ?? []);
    setInvoiceData(invoiceRes.data ?? []);
    setSupplierPerfData(supplierRes.data ?? []);
    setReplenishmentData(replenishmentRes.data ?? []);
    setBuyingActivityData(activityRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { loadReports(); }, [company?.id]);

  const poColumns: Column<any>[] = [
    { key: 'po_number', header: 'PO Number', cell: (row) => <span className="font-mono text-sm font-medium text-blue-600">{row.po_number}</span> },
    { key: 'vendors', header: 'Vendor', cell: (row) => <span className="text-sm">{row.vendors?.name || '—'}</span> },
    { key: 'issue_date', header: 'Issue Date', cell: (row) => <span className="text-sm text-gray-500">{formatDate(row.issue_date)}</span> },
    { key: 'expected_delivery', header: 'Expected Delivery', cell: (row) => <span className="text-sm text-gray-500">{row.expected_delivery ? formatDate(row.expected_delivery) : '—'}</span> },
    { key: 'total_amount', header: 'Total Amount', cell: (row) => <span className="text-sm font-semibold">{formatCurrency(row.total_amount ?? 0)}</span> },
    { key: 'status', header: 'Status', cell: (row) => <span className="text-xs capitalize">{row.status}</span> },
  ];

  const deliveryColumns: Column<any>[] = [
    { key: 'grn_number', header: 'GRN Number', cell: (row) => <span className="font-mono text-sm font-medium text-blue-600">{row.grn_number}</span> },
    { key: 'purchase_orders', header: 'PO Reference', cell: (row) => <span className="text-sm">{row.purchase_orders?.po_number || '—'}</span> },
    { key: 'vendors', header: 'Vendor', cell: (row) => <span className="text-sm">{row.purchase_orders?.vendors?.name || '—'}</span> },
    { key: 'delivery_date', header: 'Delivery Date', cell: (row) => <span className="text-sm text-gray-500">{formatDate(row.delivery_date)}</span> },
    { key: 'condition', header: 'Condition', cell: (row) => <span className="text-xs capitalize">{row.condition?.replace(/_/g, ' ')}</span> },
    { key: 'total_value', header: 'Total Value', cell: (row) => <span className="text-sm font-semibold">{formatCurrency(row.total_value ?? 0)}</span> },
    { key: 'status', header: 'Status', cell: (row) => <span className="text-xs capitalize">{row.status}</span> },
  ];

  const invoiceColumns: Column<any>[] = [
    { key: 'invoice_number', header: 'Invoice Number', cell: (row) => <span className="font-mono text-sm font-medium text-blue-600">{row.invoice_number}</span> },
    { key: 'purchase_orders', header: 'PO Reference', cell: (row) => <span className="text-sm">{row.purchase_orders?.po_number || '—'}</span> },
    { key: 'vendors', header: 'Vendor', cell: (row) => <span className="text-sm">{row.purchase_orders?.vendors?.name || '—'}</span> },
    { key: 'invoice_date', header: 'Invoice Date', cell: (row) => <span className="text-sm text-gray-500">{formatDate(row.invoice_date)}</span> },
    { key: 'due_date', header: 'Due Date', cell: (row) => <span className="text-sm text-gray-500">{formatDate(row.due_date)}</span> },
    { key: 'total_amount', header: 'Total Amount', cell: (row) => <span className="text-sm font-semibold">{formatCurrency(row.total_amount ?? 0)}</span> },
    { key: 'status', header: 'Status', cell: (row) => <span className="text-xs capitalize">{row.status}</span> },
  ];

  const supplierColumns: Column<any>[] = [
    { key: 'vendors', header: 'Vendor', cell: (row) => <span className="font-medium">{row.vendors?.name || '—'}</span> },
    { key: 'overall_score', header: 'Overall Score', cell: (row) => <span className="text-sm font-semibold">{row.overall_score != null ? row.overall_score.toFixed(1) : '0'}</span> },
    { key: 'quality_score', header: 'Quality', cell: (row) => <span className="text-sm">{row.quality_score != null ? row.quality_score.toFixed(1) : '0'}</span> },
    { key: 'delivery_score', header: 'Delivery', cell: (row) => <span className="text-sm">{row.delivery_score != null ? row.delivery_score.toFixed(1) : '0'}</span> },
    { key: 'price_score', header: 'Price', cell: (row) => <span className="text-sm">{row.price_score != null ? row.price_score.toFixed(1) : '0'}</span> },
    { key: 'on_time_delivery_rate', header: 'On-Time Rate', cell: (row) => <span className="text-sm">{((row.on_time_delivery_rate ?? 0) * 100).toFixed(0)}%</span> },
    { key: 'total_orders', header: 'Orders', cell: (row) => <span className="text-sm">{row.total_orders ?? 0}</span> },
    { key: 'total_spend', header: 'Total Spend', cell: (row) => <span className="text-sm font-semibold">{formatCurrency(row.total_spend || 0)}</span> },
  ];

  const replenishmentColumns: Column<any>[] = [
    { key: 'item_name', header: 'Item Name' },
    { key: 'item_code', header: 'Item Code', cell: (row) => <span className="font-mono text-xs">{row.item_code || '—'}</span> },
    { key: 'current_stock', header: 'Current Stock', cell: (row) => <span className="text-sm">{row.current_stock ?? 0}</span> },
    { key: 'minimum_stock', header: 'Min Stock', cell: (row) => <span className="text-sm text-gray-500">{row.minimum_stock ?? 0}</span> },
    { key: 'requested_quantity', header: 'Requested', cell: (row) => <span className="text-sm font-semibold text-blue-600">{row.requested_quantity ?? 0}</span> },
    { key: 'priority', header: 'Priority', cell: (row) => <span className="text-xs capitalize">{row.priority}</span> },
    { key: 'required_date', header: 'Required By', cell: (row) => <span className="text-sm text-gray-500">{formatDate(row.required_date)}</span> },
    { key: 'status', header: 'Status', cell: (row) => <span className="text-xs capitalize">{row.status}</span> },
  ];

  const activityColumns: Column<any>[] = [
    { key: 'activity_date', header: 'Date', cell: (row) => <span className="text-sm">{formatDate(row.activity_date)}</span> },
    { key: 'activity_type', header: 'Activity Type', cell: (row) => <span className="text-xs capitalize">{row.activity_type?.replace(/_/g, ' ')}</span> },
    { key: 'reference_number', header: 'Reference', cell: (row) => <span className="font-mono text-xs text-blue-600">{row.reference_number || '—'}</span> },
    { key: 'vendors', header: 'Vendor', cell: (row) => <span className="text-sm">{row.vendors?.name || '—'}</span> },
    { key: 'category', header: 'Category', cell: (row) => <span className="text-xs capitalize">{row.category?.replace(/_/g, ' ') || '—'}</span> },
    { key: 'amount', header: 'Amount', cell: (row) => <span className="text-sm font-semibold">{formatCurrency(row.amount || 0)}</span> },
  ];

  return (
    <PermissionGuard permission="procurement.reports.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view procurement reports</div>}>
      <div className="space-y-6">
        <PageHeader title="Procurement Reports" description="Comprehensive procurement analytics and reports" breadcrumbs={[{ label: 'Procurement' }, { label: 'Reports' }]}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportExcel('procurement-operations-report', [
              { name: 'Purchase Orders', rows: poStatusData },
              { name: 'Deliveries', rows: deliveryData },
              { name: 'Invoice Verification', rows: invoiceData },
              { name: 'Supplier Performance', rows: supplierPerfData },
              { name: 'Replenishment', rows: replenishmentData },
              { name: 'Buying Activities', rows: buyingActivityData },
            ])}
            disabled={loading}
          >
            <Download className="h-4 w-4 mr-2" />Export Excel
          </Button>
        </PageHeader>

        <Tabs defaultValue="po-status" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto">
            <TabsTrigger value="po-status"><ShoppingCart className="h-4 w-4 mr-2" />PO Status</TabsTrigger>
            <TabsTrigger value="delivery"><Package className="h-4 w-4 mr-2" />Delivery</TabsTrigger>
            <TabsTrigger value="invoice"><DollarSign className="h-4 w-4 mr-2" />Invoice</TabsTrigger>
            <TabsTrigger value="supplier"><Building2 className="h-4 w-4 mr-2" />Supplier</TabsTrigger>
            <TabsTrigger value="replenishment"><RefreshCw className="h-4 w-4 mr-2" />Replenishment</TabsTrigger>
            <TabsTrigger value="activity"><TrendingUp className="h-4 w-4 mr-2" />Activities</TabsTrigger>
          </TabsList>

          <TabsContent value="po-status">
            <Card className="dark:bg-gray-900 dark:border-gray-800">
              <CardHeader><CardTitle className="text-sm font-semibold">Purchase Order Status Report</CardTitle></CardHeader>
              <CardContent className="p-0">
                <DataTable columns={poColumns} data={poStatusData} loading={loading} searchable={false} rowKey="id" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="delivery">
            <Card className="dark:bg-gray-900 dark:border-gray-800">
              <CardHeader><CardTitle className="text-sm font-semibold">Delivery & GRN Tracking Report</CardTitle></CardHeader>
              <CardContent className="p-0">
                <DataTable columns={deliveryColumns} data={deliveryData} loading={loading} searchable={false} rowKey="id" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoice">
            <Card className="dark:bg-gray-900 dark:border-gray-800">
              <CardHeader><CardTitle className="text-sm font-semibold">Invoice Verification & Payments Report</CardTitle></CardHeader>
              <CardContent className="p-0">
                <DataTable columns={invoiceColumns} data={invoiceData} loading={loading} searchable={false} rowKey="id" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="supplier">
            <Card className="dark:bg-gray-900 dark:border-gray-800">
              <CardHeader><CardTitle className="text-sm font-semibold">Supplier Performance & Reliability Report</CardTitle></CardHeader>
              <CardContent className="p-0">
                <DataTable columns={supplierColumns} data={supplierPerfData} loading={loading} searchable={false} rowKey="id" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="replenishment">
            <Card className="dark:bg-gray-900 dark:border-gray-800">
              <CardHeader><CardTitle className="text-sm font-semibold">Inventory Replenishment Report</CardTitle></CardHeader>
              <CardContent className="p-0">
                <DataTable columns={replenishmentColumns} data={replenishmentData} loading={loading} searchable={false} rowKey="id" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card className="dark:bg-gray-900 dark:border-gray-800">
              <CardHeader><CardTitle className="text-sm font-semibold">Daily, Weekly & Monthly Buying Activities Report</CardTitle></CardHeader>
              <CardContent className="p-0">
                <DataTable columns={activityColumns} data={buyingActivityData} loading={loading} searchable={false} rowKey="id" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
}
