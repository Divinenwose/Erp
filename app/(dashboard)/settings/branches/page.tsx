'use client';

import { useState } from 'react';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Plus, Pencil, Trash2, Phone, Globe } from 'lucide-react';

const INITIAL_BRANCHES = [
  { id: 1, name: 'Headquarters', type: 'HQ', address: '1200 W Innovation Blvd, Chicago, IL 60601', phone: '+1 312-555-0100', country: 'United States', employees: 85, status: 'active' },
  { id: 2, name: 'New York Office', type: 'Office', address: '350 Fifth Ave, New York, NY 10118', phone: '+1 212-555-0102', country: 'United States', employees: 32, status: 'active' },
  { id: 3, name: 'London Branch', type: 'Office', address: '30 St Mary Axe, London EC3A 8BF', phone: '+44 20 7555 0103', country: 'United Kingdom', employees: 18, status: 'active' },
  { id: 4, name: 'Austin Distribution', type: 'Warehouse', address: '4500 Industry Park, Austin, TX 78744', phone: '+1 512-555-0104', country: 'United States', employees: 22, status: 'active' },
  { id: 5, name: 'Singapore Hub', type: 'Office', address: '1 Raffles Place, Singapore 048616', phone: '+65 6555 0105', country: 'Singapore', employees: 12, status: 'planned' },
];

const TYPE_COLORS: Record<string, string> = {
  HQ: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Office: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  Warehouse: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

export default function BranchesPage() {
  const [branches] = useState(INITIAL_BRANCHES);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newType, setNewType] = useState('Office');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branches & Locations"
        description="Manage company offices, branches, and warehouses"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Branches' }]}
      >
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => setShowForm(v => !v)}
        >
          <Plus className="h-4 w-4 mr-2" />{showForm ? 'Cancel' : 'Add Branch'}
        </Button>
      </PageHeader>

      {showForm && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">New Branch / Location</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Branch Name *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Tokyo Office"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Office">Office</option>
                  <option value="Warehouse">Warehouse</option>
                  <option value="HQ">Headquarters</option>
                  <option value="Store">Retail Store</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={e => setNewAddress(e.target.value)}
                  placeholder="Street, City, Country"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowForm(false)}>
                Save Branch
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map(branch => (
          <Card key={branch.id} className="dark:bg-gray-900 dark:border-gray-800 hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{branch.name}</h3>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${TYPE_COLORS[branch.type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {branch.type}
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span className="leading-relaxed">{branch.address}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5 mb-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <Phone className="h-3.5 w-3.5 shrink-0" /><span>{branch.phone}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <Globe className="h-3.5 w-3.5 shrink-0" /><span>{branch.country}</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <StatusBadge status={branch.status} />
                  <span className="text-xs text-gray-400">{branch.employees} employees</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-blue-600">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-rose-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {branches.length === 0 && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="py-12">
            <EmptyState
              icon={<MapPin className="h-12 w-12" />}
              title="No branches yet"
              description="Add your first branch or office location to get started."
              action={<Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />Add Branch</Button>}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
