'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, MapPin, ArrowRight, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function AssetMovementHistoryPage() {
  const { company } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [movements, setMovements] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formAsset, setFormAsset] = useState('');
  const [formFrom, setFormFrom] = useState('');
  const [formTo, setFormTo] = useState('');
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formMovedBy, setFormMovedBy] = useState('');
  const [formReason, setFormReason] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const columns = [
    { key: 'date', header: 'Date' },
    { key: 'asset', header: 'Asset' },
    { key: 'assetNumber', header: 'Asset #' },
    { key: 'fromLocation', header: 'From' },
    { key: 'toLocation', header: 'To' },
    { key: 'movedBy', header: 'Moved By' },
    { key: 'reason', header: 'Reason' },
  ];

  useEffect(() => {
    loadMovements();
    loadAssets();
  }, [company?.id, selectedMonth, selectedAsset]);

  const loadMovements = async () => {
    if (!company?.id) return;
    setLoading(true);

    let query = supabase
      .from('asset_movements')
      .select('*, assets(name, asset_number)')
      .eq('company_id', company.id)
      .gte('movement_date', `${selectedMonth}-01`)
      .lte('movement_date', `${selectedMonth}-31`);

    if (selectedAsset) query = query.eq('asset_id', selectedAsset);

    const { data } = await query.order('movement_date', { ascending: false });
    setMovements(data || []);
    setLoading(false);
  };

  const loadAssets = async () => {
    if (!company?.id) return;
    const { data } = await supabase.from('assets').select('id, name, asset_number').eq('company_id', company.id);
    setAssets(data || []);
  };

  const handleRecordMovement = async () => {
    if (!company?.id) return;
    if (!formAsset || !formTo.trim()) {
      toast.error('Asset and destination location are required');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('asset_movements').insert({
      company_id: company.id,
      asset_id: formAsset,
      movement_date: formDate,
      from_location: formFrom.trim() || null,
      to_location: formTo.trim(),
      moved_by: formMovedBy.trim() || null,
      reason: formReason || null,
      notes: formNotes.trim() || null,
    });
    setSubmitting(false);

    if (error) {
      toast.error('Failed to record movement');
      return;
    }

    // Keep the asset's own location field in sync with its latest movement.
    await supabase.from('assets').update({ location: formTo.trim() }).eq('id', formAsset);

    toast.success('Movement recorded');
    setFormAsset(''); setFormFrom(''); setFormTo(''); setFormMovedBy(''); setFormReason(''); setFormNotes('');
    setFormDate(format(new Date(), 'yyyy-MM-dd'));
    setDialogOpen(false);
    loadMovements();
  };

  const filtered = movements.filter(m => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return m.assets?.name?.toLowerCase().includes(term) || m.assets?.asset_number?.toLowerCase().includes(term) || m.to_location?.toLowerCase().includes(term);
  });

  const totalMovements = movements.length;
  const thisMonthCount = movements.filter(m => m.movement_date && m.movement_date.startsWith(format(new Date(), 'yyyy-MM'))).length;
  const distinctAssetsMoved = new Set(movements.map(m => m.asset_id)).size;

  const formattedData = filtered.map((item) => ({
    ...item,
    date: item.movement_date ? format(new Date(item.movement_date), 'MMM dd, yyyy') : '-',
    asset: item.assets?.name || '-',
    assetNumber: item.assets?.asset_number || '-',
    fromLocation: item.from_location || '-',
    toLocation: item.to_location || '-',
    movedBy: item.moved_by || '-',
    reason: item.reason ? item.reason.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : '-',
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Movement History"
        description="Track asset movements and transfers"
        breadcrumbs={[
          { label: 'Administration', href: '/administration' },
          { label: 'Assets', href: '/administration/assets' },
          { label: 'Movement History' },
        ]}
      >
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Record Movement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Asset Movement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="asset">Asset *</Label>
                <Select value={formAsset} onValueChange={setFormAsset}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.asset_number ? `${a.asset_number} - ` : ''}{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fromLocation">From Location</Label>
                  <Input id="fromLocation" placeholder="Current location" value={formFrom} onChange={(e) => setFormFrom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toLocation">To Location *</Label>
                  <Input id="toLocation" placeholder="New location" value={formTo} onChange={(e) => setFormTo(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="movedBy">Moved By</Label>
                  <Input id="movedBy" placeholder="Person name" value={formMovedBy} onChange={(e) => setFormMovedBy(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Select value={formReason} onValueChange={setFormReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transfer">Employee Transfer</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="new_hire">New Hire Setup</SelectItem>
                    <SelectItem value="relocation">Relocation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" placeholder="Additional details..." value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleRecordMovement} disabled={submitting}>
                {submitting ? 'Saving…' : 'Record Movement'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <MapPin className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Movements</p>
                <p className="text-2xl font-bold">{loading ? '—' : totalMovements}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                <ArrowRight className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">This Month</p>
                <p className="text-2xl font-bold">{loading ? '—' : thisMonthCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Assets Moved</p>
                <p className="text-2xl font-bold">{loading ? '—' : distinctAssetsMoved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search movements..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-auto"
              />
              <Select value={selectedAsset || 'all'} onValueChange={(v) => setSelectedAsset(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Asset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assets</SelectItem>
                  {assets.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.asset_number || a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={formattedData}
            loading={loading}
            emptyTitle="No movements recorded"
          />
        </CardContent>
      </Card>
    </div>
  );
}
