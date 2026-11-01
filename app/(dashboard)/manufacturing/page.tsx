'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Factory, Calendar, Clipboard, Activity, Package, Layers, Warehouse, 
  TrendingUp, Truck, ShieldCheck, Wrench, Clock, Shield, AlertTriangle, 
  Archive, FileCheck, BarChart3, LayoutDashboard 
} from 'lucide-react';
import Link from 'next/link';

export default function ManufacturingPage() {
  const { company, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState({
    activeWorkOrders: 0,
    activeProductionRuns: 0,
    pendingWorkOrders: 0,
    rawMaterialStock: 0,
    wipQuantity: 0,
    finishedGoodsStock: 0,
    lowStockItems: 0,
    pendingDispatches: 0,
    pendingInspections: 0,
    equipmentDown: 0,
    maintenanceDue: 0,
    openIncidents: 0,
  });

  const modules = [
    { title: 'Production Schedules', description: 'Plan and manage production schedules', icon: Calendar, href: '/manufacturing/schedules', color: 'bg-blue-50 dark:bg-blue-950/30', iconColor: 'text-blue-600', permission: 'manufacturing.schedules.view' },
    { title: 'Work Orders', description: 'Create and track work orders', icon: Clipboard, href: '/manufacturing/work-orders', color: 'bg-emerald-50 dark:bg-emerald-950/30', iconColor: 'text-emerald-600', permission: 'manufacturing.work_orders.view' },
    { title: 'Production Runs', description: 'Track production output and runs', icon: Activity, href: '/manufacturing/production-runs', color: 'bg-violet-50 dark:bg-violet-950/30', iconColor: 'text-violet-600', permission: 'manufacturing.production_runs.view' },
    { title: 'Raw Materials', description: 'Manage raw material inventory', icon: Package, href: '/manufacturing/raw-materials', color: 'bg-amber-50 dark:bg-amber-950/30', iconColor: 'text-amber-600', permission: 'manufacturing.raw_materials.view' },
    { title: 'Work-in-Progress', description: 'Track WIP inventory', icon: Layers, href: '/manufacturing/wip', color: 'bg-pink-50 dark:bg-pink-950/30', iconColor: 'text-pink-600', permission: 'manufacturing.wip.view' },
    { title: 'Finished Goods', description: 'Manage finished goods inventory', icon: Package, href: '/manufacturing/finished-goods', color: 'bg-cyan-50 dark:bg-cyan-950/30', iconColor: 'text-cyan-600', permission: 'manufacturing.finished_goods.view' },
    { title: 'Warehouse Locations', description: 'Manage warehouse storage locations', icon: Warehouse, href: '/manufacturing/warehouse-locations', color: 'bg-indigo-50 dark:bg-indigo-950/30', iconColor: 'text-indigo-600', permission: 'manufacturing.warehouse_locations.view' },
    { title: 'Stock Movements', description: 'Track stock movements and adjustments', icon: TrendingUp, href: '/manufacturing/stock-movements', color: 'bg-rose-50 dark:bg-rose-950/30', iconColor: 'text-rose-600', permission: 'manufacturing.stock_movements.view' },
    { title: 'Goods Receiving', description: 'Process incoming goods', icon: Truck, href: '/manufacturing/goods-receiving', color: 'bg-orange-50 dark:bg-orange-950/30', iconColor: 'text-orange-600', permission: 'manufacturing.goods_receiving.view' },
    { title: 'Dispatch & Shipments', description: 'Manage outgoing shipments', icon: Truck, href: '/manufacturing/dispatch', color: 'bg-lime-50 dark:bg-lime-950/30', iconColor: 'text-lime-600', permission: 'manufacturing.dispatch.view' },
    { title: 'Quality Inspections', description: 'Quality control and inspections', icon: ShieldCheck, href: '/manufacturing/quality', color: 'bg-teal-50 dark:bg-teal-950/30', iconColor: 'text-teal-600', permission: 'manufacturing.quality.view' },
    { title: 'Equipment', description: 'Manage equipment and machinery', icon: Wrench, href: '/manufacturing/equipment', color: 'bg-slate-50 dark:bg-slate-950/30', iconColor: 'text-slate-600', permission: 'manufacturing.equipment.view' },
    { title: 'Equipment Maintenance', description: 'Schedule and track maintenance', icon: Wrench, href: '/manufacturing/maintenance', color: 'bg-zinc-50 dark:bg-zinc-950/30', iconColor: 'text-zinc-600', permission: 'manufacturing.maintenance.view' },
    { title: 'Workforce Shifts', description: 'Manage workforce shifts', icon: Clock, href: '/manufacturing/shifts', color: 'bg-fuchsia-50 dark:bg-fuchsia-950/30', iconColor: 'text-fuchsia-600', permission: 'manufacturing.shifts.view' },
    { title: 'Safety & Compliance', description: 'Safety and compliance records', icon: Shield, href: '/manufacturing/safety', color: 'bg-red-50 dark:bg-red-950/30', iconColor: 'text-red-600', permission: 'manufacturing.safety.view' },
    { title: 'Incidents', description: 'Track and manage incidents', icon: AlertTriangle, href: '/manufacturing/incidents', color: 'bg-yellow-50 dark:bg-yellow-950/30', iconColor: 'text-yellow-600', permission: 'manufacturing.incidents.view' },
    { title: 'Process Waste', description: 'Track waste and losses', icon: Archive, href: '/manufacturing/waste', color: 'bg-stone-50 dark:bg-stone-950/30', iconColor: 'text-stone-600', permission: 'manufacturing.waste.view' },
    { title: 'Policies & Documents', description: 'Manufacturing policies and documents', icon: FileCheck, href: '/manufacturing/documents', color: 'bg-neutral-50 dark:bg-neutral-950/30', iconColor: 'text-neutral-600', permission: 'manufacturing.documents.view' },
    { title: 'Reports', description: 'Manufacturing and warehouse reports', icon: BarChart3, href: '/manufacturing/reports', color: 'bg-sky-50 dark:bg-sky-950/30', iconColor: 'text-sky-600', permission: 'manufacturing.reports.view' },
  ].filter(m => isAdmin || hasPermission(m.permission));

  const loadKPIs = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [
      workOrdersRes,
      productionRunsRes,
      rawMaterialsRes,
      wipRes,
      finishedGoodsRes,
      dispatchRes,
      inspectionsRes,
      equipmentRes,
      maintenanceRes,
      incidentsRes,
    ] = await Promise.all([
      supabase.from('work_orders').select('status').eq('company_id', company.id),
      supabase.from('production_runs').select('status').eq('company_id', company.id),
      supabase.from('raw_materials_inventory').select('quantity_on_hand, reorder_level').eq('company_id', company.id),
      supabase.from('wip_inventory').select('quantity').eq('company_id', company.id),
      supabase.from('finished_goods_inventory').select('quantity_on_hand').eq('company_id', company.id),
      supabase.from('dispatch_shipments').select('status').eq('company_id', company.id),
      supabase.from('quality_inspections').select('status').eq('company_id', company.id),
      supabase.from('equipment').select('status').eq('company_id', company.id),
      supabase.from('equipment_maintenance').select('status, scheduled_date').eq('company_id', company.id),
      supabase.from('manufacturing_incidents').select('status').eq('company_id', company.id),
    ]);

    const workOrders = workOrdersRes.data ?? [];
    const productionRuns = productionRunsRes.data ?? [];
    const rawMaterials = rawMaterialsRes.data ?? [];
    const wip = wipRes.data ?? [];
    const finishedGoods = finishedGoodsRes.data ?? [];
    const dispatches = dispatchRes.data ?? [];
    const inspections = inspectionsRes.data ?? [];
    const equipment = equipmentRes.data ?? [];
    const maintenance = maintenanceRes.data ?? [];
    const incidents = incidentsRes.data ?? [];

    const rawMaterialStock = rawMaterials.reduce((sum, r) => sum + (r.quantity_on_hand || 0), 0);
    const lowStockItems = rawMaterials.filter(r => r.quantity_on_hand <= r.reorder_level).length;
    const wipQuantity = wip.reduce((sum, w) => sum + (w.quantity || 0), 0);
    const finishedGoodsStock = finishedGoods.reduce((sum, f) => sum + (f.quantity_on_hand || 0), 0);
    const equipmentDown = equipment.filter(e => e.status === 'breakdown').length;
    const today = new Date().toISOString().slice(0, 10);
    const maintenanceDue = maintenance.filter(m => m.status === 'scheduled' && m.scheduled_date <= today).length;

    setKpiData({
      activeWorkOrders: workOrders.filter(w => w.status === 'in_progress').length,
      activeProductionRuns: productionRuns.filter(p => p.status === 'in_progress').length,
      pendingWorkOrders: workOrders.filter(w => w.status === 'pending').length,
      rawMaterialStock,
      wipQuantity,
      finishedGoodsStock,
      lowStockItems,
      pendingDispatches: dispatches.filter(d => d.status === 'pending').length,
      pendingInspections: inspections.filter(i => i.status === 'pending').length,
      equipmentDown,
      maintenanceDue,
      openIncidents: incidents.filter(i => i.status === 'open').length,
    });

    setLoading(false);
  };

  useEffect(() => { loadKPIs(); }, [company?.id]);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Manufacturing & Warehouse" 
        description="Production management, inventory, warehouse operations, quality control, and equipment maintenance"
        breadcrumbs={[{ label: 'Manufacturing' }]}
      >
        <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-700">
          <Link href="/manufacturing/work-orders">Create Work Order</Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Active Work Orders" value={kpiData.activeWorkOrders} icon={<Clipboard className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Active Production Runs" value={kpiData.activeProductionRuns} icon={<Activity className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Pending Work Orders" value={kpiData.pendingWorkOrders} icon={<Calendar className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Raw Material Stock" value={kpiData.rawMaterialStock.toLocaleString()} icon={<Package className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        <KPICard title="WIP Quantity" value={kpiData.wipQuantity.toLocaleString()} icon={<Layers className="h-4 w-4 text-pink-600" />} iconBg="bg-pink-50 dark:bg-pink-950/50" loading={loading} />
        <KPICard title="Finished Goods Stock" value={kpiData.finishedGoodsStock.toLocaleString()} icon={<Package className="h-4 w-4 text-cyan-600" />} iconBg="bg-cyan-50 dark:bg-cyan-950/50" loading={loading} />
        <KPICard title="Low Stock Items" value={kpiData.lowStockItems} icon={<AlertTriangle className="h-4 w-4 text-red-600" />} iconBg="bg-red-50 dark:bg-red-950/50" loading={loading} />
        <KPICard title="Pending Dispatches" value={kpiData.pendingDispatches} icon={<Truck className="h-4 w-4 text-orange-600" />} iconBg="bg-orange-50 dark:bg-orange-950/50" loading={loading} />
        <KPICard title="Pending Inspections" value={kpiData.pendingInspections} icon={<ShieldCheck className="h-4 w-4 text-teal-600" />} iconBg="bg-teal-50 dark:bg-teal-950/50" loading={loading} />
        <KPICard title="Equipment Down" value={kpiData.equipmentDown} icon={<Wrench className="h-4 w-4 text-slate-600" />} iconBg="bg-slate-50 dark:bg-slate-950/50" loading={loading} />
        <KPICard title="Maintenance Due" value={kpiData.maintenanceDue} icon={<Clock className="h-4 w-4 text-zinc-600" />} iconBg="bg-zinc-50 dark:bg-zinc-950/50" loading={loading} />
        <KPICard title="Open Incidents" value={kpiData.openIncidents} icon={<AlertTriangle className="h-4 w-4 text-yellow-600" />} iconBg="bg-yellow-50 dark:bg-yellow-950/50" loading={loading} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {modules.map(m => (
          <Link key={m.href} href={m.href} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:shadow-md transition-all group">
            <div className={`w-10 h-10 rounded-xl ${m.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <m.icon className={`h-5 w-5 ${m.iconColor}`} />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{m.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{m.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
