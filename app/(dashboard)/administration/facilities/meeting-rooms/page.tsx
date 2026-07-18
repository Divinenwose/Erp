'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logAuditEvent } from '@/lib/audit';
import { Can } from '@/components/rbac/PermissionGuard';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import DataTable, { Column } from '@/components/common/DataTable';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Monitor, Plus, Edit, Trash2, MapPin, Users } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const meetingRoomSchema = z.object({
  name: z.string().min(1, 'Required'),
  location: z.string().optional(),
  capacity: z.string().optional(),
  facilities: z.string().optional(),
  branch_id: z.string().optional(),
});
type MeetingRoomForm = z.infer<typeof meetingRoomSchema>;

export default function MeetingRoomsPage() {
  const { company, user: currentUser } = useAuth();
  const [rooms, setRooms] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRoom, setEditRoom] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<MeetingRoomForm>({
    resolver: zodResolver(meetingRoomSchema),
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [roomRes, branchRes] = await Promise.all([
      supabase
        .from('meeting_rooms')
        .select('*, branches(name)')
        .eq('company_id', company.id)
        .order('name'),
      supabase.from('branches').select('*').eq('company_id', company.id),
    ]);

    setRooms(roomRes.data ?? []);
    setBranches(branchRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (room: any) => {
    setEditRoom(room);
    reset({
      name: room.name,
      location: room.location ?? '',
      capacity: room.capacity?.toString() ?? '',
      facilities: room.facilities?.join(', ') ?? '',
      branch_id: room.branch_id ?? undefined,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: MeetingRoomForm) => {
    if (!company?.id) return;

    const payload = {
      name: data.name,
      location: data.location,
      capacity: data.capacity ? parseInt(data.capacity) : null,
      facilities: data.facilities ? data.facilities.split(',').map(f => f.trim()) : [],
      branch_id: data.branch_id,
    };

    if (editRoom) {
      const { error } = await supabase
        .from('meeting_rooms')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editRoom.id);

      if (error) {
        toast.error('Failed to update room');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'meeting_room_updated',
        module: 'facilities',
        record_id: editRoom.id,
        new_values: { name: data.name },
      });

      toast.success('Room updated');
    } else {
      const { error } = await supabase.from('meeting_rooms').insert({
        company_id: company.id,
        ...payload,
        status: 'available',
      });

      if (error) {
        toast.error('Failed to create room');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'meeting_room_created',
        module: 'facilities',
        new_values: { name: data.name },
      });

      toast.success('Room created');
    }

    reset();
    setEditRoom(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('meeting_rooms').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete room');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'meeting_room_deleted',
        module: 'facilities',
        record_id: deleteId,
      });
      toast.success('Room deleted');
      load();
    }

    setDeleteId(null);
    setDeleting(false);
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    if (!company?.id) return;

    const { error } = await supabase
      .from('meeting_rooms')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'meeting_room_status_updated',
        module: 'facilities',
        record_id: id,
        new_values: { status },
      });
      toast.success('Status updated');
      load();
    }
  };

  const exportCSV = () => {
    const headers = ['Name', 'Location', 'Capacity', 'Facilities', 'Status', 'Branch'];
    const rows = rooms.map(r => [
      r.name,
      r.location || '',
      r.capacity || '',
      r.facilities?.join(', ') || '',
      r.status,
      r.branches?.name || '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meeting_rooms.csv';
    a.click();
  };

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
            <Monitor className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-sm font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      cell: (row) => (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <MapPin className="h-3 w-3" />
          <span>{row.location || '—'}</span>
        </div>
      ),
    },
    {
      key: 'capacity',
      header: 'Capacity',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Users className="h-3 w-3" />
          <span>{row.capacity || '—'}</span>
        </div>
      ),
    },
    {
      key: 'facilities',
      header: 'Facilities',
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.facilities?.slice(0, 2).map((f: string, i: number) => (
            <Badge key={i} variant="outline" className="text-xs">{f}</Badge>
          ))}
          {row.facilities?.length > 2 && (
            <Badge variant="outline" className="text-xs">+{row.facilities.length - 2}</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'branch',
      header: 'Branch',
      cell: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{row.branches?.name || '—'}</span>,
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-10',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Edit className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(row)}>
              <Edit className="h-4 w-4 mr-2" />Edit
            </DropdownMenuItem>
            {row.status === 'available' && (
              <DropdownMenuItem onClick={() => handleStatusUpdate(row.id, 'maintenance')}>
                <Monitor className="h-4 w-4 mr-2" />Set Maintenance
              </DropdownMenuItem>
            )}
            {row.status === 'maintenance' && (
              <DropdownMenuItem onClick={() => handleStatusUpdate(row.id, 'available')}>
                <Monitor className="h-4 w-4 mr-2" />Set Available
              </DropdownMenuItem>
            )}
            <Can resource="facilities.meeting_rooms" action="delete">
              <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(row.id)}>
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </DropdownMenuItem>
            </Can>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const available = rooms.filter(r => r.status === 'available').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meeting Rooms"
        description="Manage meeting rooms and facilities"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Facilities' }, { label: 'Meeting Rooms' }]}
      >
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV}>
            Export CSV
          </Button>
          <Can resource="facilities.meeting_rooms" action="create">
            <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditRoom(null); reset(); } setDialogOpen(open); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />Add Room
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editRoom ? 'Edit Room' : 'Add Meeting Room'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Name *</Label>
                      <Input className="mt-1" {...register('name')} />
                      {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                    </div>
                    <div>
                      <Label>Location</Label>
                      <Input className="mt-1" {...register('location')} placeholder="e.g., Floor 2, Room 201" />
                    </div>
                    <div>
                      <Label>Branch</Label>
                      <Controller name="branch_id" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select branch" /></SelectTrigger>
                          <SelectContent>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                        </Select>
                      )} />
                    </div>
                    <div>
                      <Label>Capacity</Label>
                      <Input className="mt-1" type="number" {...register('capacity')} placeholder="e.g., 10" />
                    </div>
                    <div className="col-span-2">
                      <Label>Facilities</Label>
                      <Input className="mt-1" {...register('facilities')} placeholder="e.g., Projector, Whiteboard, TV (comma separated)" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditRoom(null); reset(); }}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : editRoom ? 'Update' : 'Add'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Rooms" value={rooms.length} icon={<Monitor className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Available" value={available} icon={<Users className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
      </div>

      <DataTable
        data={rooms}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search rooms..."
        searchKeys={['name', 'location']}
        pageSize={15}
        emptyTitle="No meeting rooms"
        emptyDescription="Add meeting rooms to get started"
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Room?"
        description="This will permanently delete the meeting room."
        confirmLabel="Delete"
      />
    </div>
  );
}
