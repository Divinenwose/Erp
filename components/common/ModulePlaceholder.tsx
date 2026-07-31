'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import PageHeader from '@/components/common/PageHeader';
import { Wrench } from 'lucide-react';

interface ModulePlaceholderProps {
  moduleName: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export default function ModulePlaceholder({ 
  moduleName, 
  description = 'This module is ready for implementation.',
  icon: Icon = Wrench 
}: ModulePlaceholderProps) {
  return (
    <div className="space-y-6">
      <PageHeader 
        title={moduleName} 
        description={description}
      />
      
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            The {moduleName} module is currently under development.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
              <Icon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {moduleName} Module
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
              This feature is ready for implementation. The database schema and permissions are configured.
              Development of the UI and business logic can begin when needed.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
