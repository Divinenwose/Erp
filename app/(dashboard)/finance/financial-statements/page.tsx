'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGuard } from '@/components/rbac/PermissionGuard';
import { formatCurrency, formatDate } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Download, Calendar, TrendingUp, Scale, PieChart } from 'lucide-react';

export default function FinancialStatementsPage() {
  const { company } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [selectedStatement, setSelectedStatement] = useState('income_statement');

  const load = async () => {
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const renderStatement = () => {
    switch (selectedStatement) {
      case 'income_statement':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Income Statement</h3>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b dark:border-gray-800"><span>Revenue</span><span className="font-medium">{formatCurrency(125000)}</span></div>
              <div className="flex justify-between py-2 border-b dark:border-gray-800"><span>Cost of Goods Sold</span><span className="text-rose-600">{formatCurrency(45000)}</span></div>
              <div className="flex justify-between py-2 border-b dark:border-gray-800 font-semibold"><span>Gross Profit</span><span>{formatCurrency(80000)}</span></div>
              <div className="flex justify-between py-2 border-b dark:border-gray-800"><span>Operating Expenses</span><span className="text-rose-600">{formatCurrency(35000)}</span></div>
              <div className="flex justify-between py-2 border-b dark:border-gray-800 font-semibold"><span>Operating Income</span><span>{formatCurrency(45000)}</span></div>
              <div className="flex justify-between py-2 border-b dark:border-gray-800"><span>Interest Expense</span><span className="text-rose-600">{formatCurrency(2000)}</span></div>
              <div className="flex justify-between py-2 border-b dark:border-gray-800"><span>Tax Expense</span><span className="text-rose-600">{formatCurrency(8600)}</span></div>
              <div className="flex justify-between py-3 font-bold text-lg"><span>Net Income</span><span className="text-emerald-600">{formatCurrency(34400)}</span></div>
            </div>
          </div>
        );
      case 'balance_sheet':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Balance Sheet</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Assets</h4>
                <div className="space-y-2">
                  <div className="flex justify-between py-1"><span>Current Assets</span><span>{formatCurrency(85000)}</span></div>
                  <div className="flex justify-between py-1"><span>Fixed Assets</span><span>{formatCurrency(120000)}</span></div>
                  <div className="flex justify-between py-1 font-semibold"><span>Total Assets</span><span>{formatCurrency(205000)}</span></div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Liabilities & Equity</h4>
                <div className="space-y-2">
                  <div className="flex justify-between py-1"><span>Current Liabilities</span><span>{formatCurrency(45000)}</span></div>
                  <div className="flex justify-between py-1"><span>Long-term Liabilities</span><span>{formatCurrency(60000)}</span></div>
                  <div className="flex justify-between py-1"><span>Equity</span><span>{formatCurrency(100000)}</span></div>
                  <div className="flex justify-between py-1 font-semibold"><span>Total Liabilities & Equity</span><span>{formatCurrency(205000)}</span></div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'cash_flow':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Cash Flow Statement</h3>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b dark:border-gray-800"><span>Operating Activities</span><span className="text-emerald-600">{formatCurrency(45000)}</span></div>
              <div className="flex justify-between py-2 border-b dark:border-gray-800"><span>Investing Activities</span><span className="text-rose-600">{formatCurrency(15000)}</span></div>
              <div className="flex justify-between py-2 border-b dark:border-gray-800"><span>Financing Activities</span><span className="text-rose-600">{formatCurrency(10000)}</span></div>
              <div className="flex justify-between py-3 font-bold"><span>Net Cash Flow</span><span className="text-emerald-600">{formatCurrency(20000)}</span></div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <PermissionGuard permission="finance.financial_statements.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view financial statements</div>}>
      <div className="space-y-6">
        <PageHeader title="Financial Statements" description="Generate and view financial reports" breadcrumbs={[{ label: 'Finance' }, { label: 'Financial Statements' }]}>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export PDF</Button>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export Excel</Button>
        </PageHeader>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total Revenue" value={formatCurrency(125000)} icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
          <KPICard title="Net Income" value={formatCurrency(34400)} icon={<BarChart3 className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
          <KPICard title="Total Assets" value={formatCurrency(205000)} icon={<Scale className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
          <KPICard title="Net Cash Flow" value={formatCurrency(20000)} icon={<PieChart className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        </div>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Financial Statements</CardTitle>
              <div className="flex gap-2">
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="current">Current Period</SelectItem><SelectItem value="last_month">Last Month</SelectItem><SelectItem value="last_quarter">Last Quarter</SelectItem><SelectItem value="ytd">Year to Date</SelectItem></SelectContent>
                </Select>
                <Select value={selectedStatement} onValueChange={setSelectedStatement}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="income_statement">Income Statement</SelectItem><SelectItem value="balance_sheet">Balance Sheet</SelectItem><SelectItem value="cash_flow">Cash Flow Statement</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderStatement()}
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}
