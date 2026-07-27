'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, DollarSign, TrendingUp, Calendar, Check, AlertCircle } from 'lucide-react';

export default function BillingSettingsPage() {
  const { company } = useAuth();
  const [loading, setLoading] = useState(false);

  const billingInfo = {
    plan: company?.subscription_plan || 'Professional',
    status: company?.subscription_status || 'Active',
    maxUsers: company?.max_users || 50,
    currentUsers: 12,
    nextBilling: '2026-08-27',
    amount: '$299.00',
  };

  const invoices = [
    { id: 'INV-2026-001', date: '2026-07-27', amount: '$299.00', status: 'Paid' },
    { id: 'INV-2026-002', date: '2026-06-27', amount: '$299.00', status: 'Paid' },
    { id: 'INV-2026-003', date: '2026-05-27', amount: '$299.00', status: 'Paid' },
  ];

  const plans = [
    {
      name: 'Starter',
      price: '$99',
      users: 10,
      features: ['Core HR', 'Basic Finance', 'Email Support'],
      current: false,
    },
    {
      name: 'Professional',
      price: '$299',
      users: 50,
      features: ['All Starter features', 'Full ERP Suite', 'Priority Support', 'API Access'],
      current: true,
    },
    {
      name: 'Enterprise',
      price: '$799',
      users: 'Unlimited',
      features: ['All Professional features', 'Custom Integrations', 'Dedicated Account Manager', 'SLA Guarantee'],
      current: false,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Manage your subscription, payment methods, and invoices"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Billing' }]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard 
          title="Current Plan" 
          value={billingInfo.plan} 
          icon={<CreditCard className="h-4 w-4 text-blue-600" />} 
          iconBg="bg-blue-50 dark:bg-blue-950/50" 
          loading={loading} 
        />
        <KPICard 
          title="Monthly Cost" 
          value={billingInfo.amount} 
          icon={<DollarSign className="h-4 w-4 text-green-600" />} 
          iconBg="bg-green-50 dark:bg-green-950/50" 
          loading={loading} 
        />
        <KPICard 
          title="Users" 
          value={`${billingInfo.currentUsers}/${billingInfo.maxUsers}`} 
          icon={<TrendingUp className="h-4 w-4 text-violet-600" />} 
          iconBg="bg-violet-50 dark:bg-violet-950/50" 
          loading={loading} 
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
          <CardDescription>Your current subscription details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Plan</span>
              <Badge variant="outline">{billingInfo.plan}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                {billingInfo.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Next Billing Date</span>
              <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {billingInfo.nextBilling}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">User Usage</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {billingInfo.currentUsers} of {billingInfo.maxUsers} users
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>Upgrade or downgrade your subscription</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <Card key={plan.name} className={plan.current ? 'border-blue-500 border-2' : ''}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {plan.name}
                    {plan.current && <Badge className="bg-blue-600">Current</Badge>}
                  </CardTitle>
                  <CardDescription>
                    <span className="text-2xl font-bold">{plan.price}</span>
                    <span className="text-sm text-gray-500">/month</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full mt-4"
                    variant={plan.current ? 'outline' : 'default'}
                    disabled={plan.current}
                  >
                    {plan.current ? 'Current Plan' : 'Upgrade'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
          <CardDescription>Download your past invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{invoice.id}</p>
                  <p className="text-sm text-gray-500">{invoice.date}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold">{invoice.amount}</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300">
                    {invoice.status}
                  </Badge>
                  <Button variant="outline" size="sm">
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
