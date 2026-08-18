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
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Download, Star, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function VendorPerformancePage() {
  const { company } = useAuth();
  const [vendorPerformance, setVendorPerformance] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendorType, setSelectedVendorType] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('6m');
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false);
  const [selectedVendorForRating, setSelectedVendorForRating] = useState('');
  const [rating, setRating] = useState('');
  const [onTimeDelivery, setOnTimeDelivery] = useState('');
  const [qualityScore, setQualityScore] = useState('');
  const [feedback, setFeedback] = useState('');

  const columns = [
    { key: 'vendor', header: 'Vendor' },
    { key: 'type', header: 'Service Type' },
    { key: 'rating', header: 'Rating' },
    { key: 'onTimeDelivery', header: 'On-Time Delivery' },
    { key: 'qualityScore', header: 'Quality Score' },
    { key: 'totalOrders', header: 'Total Orders' },
    { key: 'trend', header: 'Trend' },
    { key: 'actions', header: 'Actions' },
  ];

  useEffect(() => {
    loadData();
  }, [company?.id, selectedPeriod]);

  const loadData = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [performanceData, vendorsData] = await Promise.all([
      supabase
        .from('vendor_performance')
        .select('*, vendors(*, vendor_type)')
        .eq('company_id', company.id),
      supabase
        .from('vendors')
        .select('*')
        .eq('company_id', company.id),
    ]);

    setVendorPerformance(performanceData.data || []);
    setVendors(vendorsData.data || []);
    setLoading(false);
  };

  const calculateTrend = (vendor: any) => {
    if (vendor.rating >= 4.0) return 'up';
    if (vendor.rating >= 3.0) return 'stable';
    return 'down';
  };

  const submitRating = async () => {
    if (!company?.id || !selectedVendorForRating) return;

    const { error } = await supabase.from('vendor_performance').upsert({
      company_id: company.id,
      vendor_id: selectedVendorForRating,
      rating: parseFloat(rating),
      quality_score: parseFloat(qualityScore),
      last_evaluation: new Date().toISOString().split('T')[0],
    });

    if (error) {
      toast.error('Failed to submit vendor rating');
      return;
    }

    setRating('');
    setOnTimeDelivery('');
    setQualityScore('');
    setFeedback('');
    setSelectedVendorForRating('');
    setIsRatingDialogOpen(false);
    loadData();
  };

  const filteredData = vendorPerformance.filter(vp => {
    const vendor = vp.vendors;
    if (!vendor) return false;
    const matchesSearch = !searchTerm || vendor.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !selectedVendorType || vendor.vendor_type === selectedVendorType;
    return matchesSearch && matchesType;
  });

  const avgRating = vendorPerformance.length > 0 
    ? (vendorPerformance.reduce((sum, vp) => sum + (vp.rating || 0), 0) / vendorPerformance.length).toFixed(1)
    : '0.0';
  
  const totalOrders = vendorPerformance.reduce((sum, vp) => sum + (vp.total_orders || 0), 0);
  const totalLate = vendorPerformance.reduce((sum, vp) => sum + (vp.late_deliveries || 0), 0);
  const onTimeRate = totalOrders > 0 ? Math.round(((totalOrders - totalLate) / totalOrders) * 100) : 0;
  const avgQuality = vendorPerformance.length > 0
    ? (vendorPerformance.reduce((sum, vp) => sum + (vp.quality_score || 0), 0) / vendorPerformance.length).toFixed(0)
    : '0';
  const needsAttention = vendorPerformance.filter(vp => vp.rating < 3.0).length;

  const getRatingStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
    
    return (
      <div className="flex items-center gap-1">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        ))}
        {hasHalf && <Star className="h-4 w-4 fill-yellow-400/50 text-yellow-400" />}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={i} className="h-4 w-4 text-gray-300" />
        ))}
        <span className="text-sm ml-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const getTrendBadge = (trend: string) => {
    if (trend === 'up') {
      return (
        <div className="flex items-center gap-1 text-emerald-600">
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm">Improving</span>
        </div>
      );
    }
    if (trend === 'down') {
      return (
        <div className="flex items-center gap-1 text-red-600">
          <TrendingDown className="h-4 w-4" />
          <span className="text-sm">Declining</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-gray-600">
        <span className="text-sm">Stable</span>
      </div>
    );
  };

  const formattedData = filteredData.map((item) => {
    const vendor = item.vendors;
    const trend = calculateTrend(item);
    return {
      ...item,
      vendor: vendor?.name || '-',
      type: vendor?.vendor_type || '-',
      rating: getRatingStars(item.rating || 0),
      onTimeDelivery: item.total_orders > 0 ? `${Math.round(((item.total_orders - item.late_deliveries) / item.total_orders) * 100)}%` : 'N/A',
      qualityScore: `${item.quality_score || 0}%`,
      totalOrders: item.total_orders || 0,
      trend: getTrendBadge(trend),
      actions: (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-8">
            View Details
          </Button>
        </div>
      ),
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Performance"
        description="Track vendor performance and ratings"
        breadcrumbs={[
          { label: 'Administration', href: '/administration' },
          { label: 'Vendor Management', href: '/administration/vendor-management' },
          { label: 'Performance' },
        ]}
      >
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setIsRatingDialogOpen(true)}>
            <Star className="h-4 w-4 mr-2" />
            Rate Vendor
          </Button>
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <Star className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Rating</p>
                <p className="text-2xl font-bold">{loading ? '...' : avgRating}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">On-Time Delivery</p>
                <p className="text-2xl font-bold">{loading ? '...' : `${onTimeRate}%`}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                <Star className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Quality Score</p>
                <p className="text-2xl font-bold">{loading ? '...' : `${avgQuality}%`}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Needs Attention</p>
                <p className="text-2xl font-bold">{loading ? '...' : needsAttention}</p>
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
                  placeholder="Search vendors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={selectedVendorType || 'all'} onValueChange={(v) => setSelectedVendorType(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Vendor Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="internet">Internet</SelectItem>
                  <SelectItem value="electricity">Electricity</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">1 Month</SelectItem>
                  <SelectItem value="3m">3 Months</SelectItem>
                  <SelectItem value="6m">6 Months</SelectItem>
                  <SelectItem value="1y">1 Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={formattedData}
          />
        </CardContent>
      </Card>

      {/* Rating Dialog */}
      <Dialog open={isRatingDialogOpen} onOpenChange={setIsRatingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate Vendor Performance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              <Select value={selectedVendorForRating} onValueChange={setSelectedVendorForRating}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rating">Overall Rating (1-5)</Label>
              <Select value={rating} onValueChange={setRating}>
                <SelectTrigger>
                  <SelectValue placeholder="Select rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 - Excellent</SelectItem>
                  <SelectItem value="4">4 - Good</SelectItem>
                  <SelectItem value="3">3 - Average</SelectItem>
                  <SelectItem value="2">2 - Fair</SelectItem>
                  <SelectItem value="1">1 - Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="onTime">On-Time Delivery (%)</Label>
                <Input id="onTime" type="number" min="0" max="100" placeholder="0-100" value={onTimeDelivery} onChange={(e) => setOnTimeDelivery(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quality">Quality Score (%)</Label>
                <Input id="quality" type="number" min="0" max="100" placeholder="0-100" value={qualityScore} onChange={(e) => setQualityScore(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback">Feedback</Label>
              <Textarea id="feedback" placeholder="Provide detailed feedback..." value={feedback} onChange={(e) => setFeedback(e.target.value)} />
            </div>
            <Button className="w-full" onClick={submitRating}>Submit Rating</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
