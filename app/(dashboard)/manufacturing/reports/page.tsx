'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Download, TrendingUp, Activity, Package, Wrench, AlertTriangle, Shield, Truck, FileCheck, Clipboard, ShieldCheck, Archive } from 'lucide-react';
import { toast } from 'sonner';

export default function ManufacturingReportsPage() {
  const { company, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canView = isAdmin || hasPermission('manufacturing.reports.view');
  const canExport = isAdmin || hasPermission('manufacturing.reports.export');

  const [selectedReport, setSelectedReport] = useState('production_output');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const reports = [
    { id: 'production_output', name: 'Production Output', icon: Activity, description: 'Production output and efficiency metrics' },
    { id: 'work_orders', name: 'Work Orders', icon: Clipboard, description: 'Work order status and completion' },
    { id: 'quality_control', name: 'Quality Control', icon: ShieldCheck, description: 'Quality inspection results' },
    { id: 'inventory_status', name: 'Inventory Status', icon: Package, description: 'Raw materials, WIP, and finished goods' },
    { id: 'stock_movements', name: 'Stock Movements', icon: TrendingUp, description: 'Stock movement history' },
    { id: 'equipment_maintenance', name: 'Equipment Maintenance', icon: Wrench, description: 'Maintenance schedules and downtime' },
    { id: 'incidents', name: 'Incidents', icon: AlertTriangle, description: 'Safety incidents and resolution' },
    { id: 'safety_compliance', name: 'Safety & Compliance', icon: Shield, description: 'Safety compliance status' },
    { id: 'waste_loss', name: 'Waste & Loss', icon: Archive, description: 'Process waste tracking' },
    { id: 'dispatch_shipment', name: 'Dispatch & Shipment', icon: Truck, description: 'Shipping and delivery metrics' },
  ];

  const loadReport = async () => {
    if (!company?.id || !canView) return;
    setLoading(true);

    try {
      let data: any = {};

      switch (selectedReport) {
        case 'production_output':
          const [woRes, prRes] = await Promise.all([
            supabase.from('work_orders').select('status, quantity_ordered, quantity_completed').eq('company_id', company.id),
            supabase.from('production_runs').select('status, quantity_produced, efficiency_rate, downtime_minutes').eq('company_id', company.id),
          ]);
          data = {
            totalWorkOrders: woRes.data?.length || 0,
            completedWorkOrders: woRes.data?.filter(w => w.status === 'completed').length || 0,
            totalProduced: woRes.data?.reduce((sum, w) => sum + (w.quantity_completed || 0), 0) || 0,
            avgEfficiency: prRes.data?.length ? prRes.data.reduce((sum, p) => sum + (p.efficiency_rate || 0), 0) / prRes.data.length : 0,
            totalDowntime: prRes.data?.reduce((sum, p) => sum + (p.downtime_minutes || 0), 0) || 0,
          };
          break;

        case 'work_orders':
          const woData = await supabase.from('work_orders').select('status, priority, created_at').eq('company_id', company.id);
          data = {
            total: woData.data?.length || 0,
            pending: woData.data?.filter(w => w.status === 'pending').length || 0,
            inProgress: woData.data?.filter(w => w.status === 'in_progress').length || 0,
            completed: woData.data?.filter(w => w.status === 'completed').length || 0,
            highPriority: woData.data?.filter(w => w.priority === 'high' || w.priority === 'urgent').length || 0,
          };
          break;

        case 'quality_control':
          const qcData = await supabase.from('quality_inspections').select('result, status, inspection_type').eq('company_id', company.id);
          data = {
            total: qcData.data?.length || 0,
            passed: qcData.data?.filter(q => q.result === 'pass').length || 0,
            failed: qcData.data?.filter(q => q.result === 'fail').length || 0,
            conditional: qcData.data?.filter(q => q.result === 'conditional').length || 0,
            passRate: qcData.data?.length ? ((qcData.data?.filter(q => q.result === 'pass').length / qcData.data.length) * 100).toFixed(1) : 0,
          };
          break;

        case 'inventory_status':
          const [rmRes, wipRes, fgRes] = await Promise.all([
            supabase.from('raw_materials_inventory').select('quantity_on_hand, reorder_level').eq('company_id', company.id),
            supabase.from('wip_inventory').select('quantity').eq('company_id', company.id),
            supabase.from('finished_goods_inventory').select('quantity_on_hand').eq('company_id', company.id),
          ]);
          data = {
            rawMaterialStock: rmRes.data?.reduce((sum, r) => sum + (r.quantity_on_hand || 0), 0) || 0,
            lowStockItems: rmRes.data?.filter(r => r.quantity_on_hand <= r.reorder_level).length || 0,
            wipQuantity: wipRes.data?.reduce((sum, w) => sum + (w.quantity || 0), 0) || 0,
            finishedGoodsStock: fgRes.data?.reduce((sum, f) => sum + (f.quantity_on_hand || 0), 0) || 0,
          };
          break;

        case 'stock_movements':
          const smData = await supabase.from('manufacturing_stock_movements').select('movement_type, quantity').eq('company_id', company.id);
          data = {
            total: smData.data?.length || 0,
            receipts: smData.data?.filter(m => m.movement_type === 'receipt').length || 0,
            issues: smData.data?.filter(m => m.movement_type === 'issue').length || 0,
            transfers: smData.data?.filter(m => m.movement_type === 'transfer').length || 0,
            totalMoved: smData.data?.reduce((sum, m) => sum + (m.quantity || 0), 0) || 0,
          };
          break;

        case 'equipment_maintenance':
          const [eqRes, maintRes] = await Promise.all([
            supabase.from('equipment').select('status').eq('company_id', company.id),
            supabase.from('equipment_maintenance').select('status, scheduled_date').eq('company_id', company.id),
          ]);
          const today = new Date().toISOString().slice(0, 10);
          data = {
            totalEquipment: eqRes.data?.length || 0,
            operational: eqRes.data?.filter(e => e.status === 'operational').length || 0,
            breakdown: eqRes.data?.filter(e => e.status === 'breakdown').length || 0,
            scheduledMaintenance: maintRes.data?.filter(m => m.status === 'scheduled').length || 0,
            overdueMaintenance: maintRes.data?.filter(m => m.status === 'scheduled' && m.scheduled_date < today).length || 0,
          };
          break;

        case 'incidents':
          const incData = await supabase.from('manufacturing_incidents').select('status, severity').eq('company_id', company.id);
          data = {
            total: incData.data?.length || 0,
            open: incData.data?.filter(i => i.status === 'open').length || 0,
            investigating: incData.data?.filter(i => i.status === 'investigating').length || 0,
            resolved: incData.data?.filter(i => i.status === 'resolved').length || 0,
            critical: incData.data?.filter(i => i.severity === 'critical' && i.status !== 'resolved').length || 0,
          };
          break;

        case 'safety_compliance':
          const safeData = await supabase.from('safety_compliance').select('status, compliance_type').eq('company_id', company.id);
          data = {
            total: safeData.data?.length || 0,
            pending: safeData.data?.filter(s => s.status === 'pending').length || 0,
            completed: safeData.data?.filter(s => s.status === 'completed').length || 0,
            overdue: safeData.data?.filter(s => s.status === 'overdue').length || 0,
            complianceRate: safeData.data?.length ? ((safeData.data?.filter(s => s.status === 'completed').length / safeData.data.length) * 100).toFixed(1) : 0,
          };
          break;

        case 'waste_loss':
          const wasteData = await supabase.from('process_waste').select('quantity, cost, waste_type').eq('company_id', company.id);
          data = {
            totalRecords: wasteData.data?.length || 0,
            totalQuantity: wasteData.data?.reduce((sum, w) => sum + (w.quantity || 0), 0) || 0,
            totalCost: wasteData.data?.reduce((sum, w) => sum + (w.cost || 0), 0) || 0,
            hazardous: wasteData.data?.filter(w => w.waste_type === 'hazardous').length || 0,
          };
          break;

        case 'dispatch_shipment':
          const dispData = await supabase.from('dispatch_shipments').select('status, estimated_delivery').eq('company_id', company.id);
          data = {
            total: dispData.data?.length || 0,
            pending: dispData.data?.filter(d => d.status === 'pending').length || 0,
            shipped: dispData.data?.filter(d => d.status === 'shipped').length || 0,
            inTransit: dispData.data?.filter(d => d.status === 'in_transit').length || 0,
            delivered: dispData.data?.filter(d => d.status === 'delivered').length || 0,
          };
          break;
      }

      setReportData(data);
    } catch (error) {
      console.error('Error loading report:', error);
      toast.error('Failed to load report');
    }

    setLoading(false);
  };

  useEffect(() => { loadReport(); }, [company?.id, selectedReport]);

  const exportReport = () => {
    if (!canExport || !reportData) return;

    const headers = Object.keys(reportData);
    const csvContent = [
      headers.join(','),
      headers.map(h => reportData[h]).join(','),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `manufacturing_${selectedReport}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success('Report exported');
  };

  const renderReportContent = () => {
    if (!reportData) return null;

    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(reportData).map(([key, value]) => (
          <KPICard
            key={key}
            title={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
            value={typeof value === 'number' ? value.toLocaleString() : String(value)}
            icon={<BarChart3 className="h-4 w-4 text-blue-600" />}
            iconBg="bg-blue-50 dark:bg-blue-950/50"
            loading={loading}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manufacturing & Warehouse Reports"
        description="Production, inventory, quality, and operational reports"
        breadcrumbs={[{ label: 'Manufacturing', href: '/manufacturing' }, { label: 'Reports' }]}
      >
        {canExport && (
          <Button onClick={exportReport} disabled={!reportData}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        )}
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Select Report</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedReport} onValueChange={setSelectedReport}>
            <SelectTrigger className="max-w-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {reports.map(r => (
                <SelectItem key={r.id} value={r.id}>{r.name} - {r.description}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {renderReportContent()}
    </div>
  );
}
