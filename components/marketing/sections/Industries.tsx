import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const industries = [
  { name: 'Manufacturing', emoji: '🏭', desc: 'Production orders, BOM, MRP, quality control, and shop floor management.', tags: ['BOMs', 'MRP', 'Quality', 'Maintenance'] },
  { name: 'Retail & E-commerce', emoji: '🛍️', desc: 'Multi-store inventory, POS integration, customer loyalty, and supplier management.', tags: ['POS', 'Inventory', 'CRM', 'Analytics'] },
  { name: 'Healthcare', emoji: '🏥', desc: 'Patient records, staff scheduling, compliance tracking, and equipment management.', tags: ['Compliance', 'HR', 'Assets', 'Reports'] },
  { name: 'Education', emoji: '🎓', desc: 'Student management, fee collection, timetabling, and staff payroll automation.', tags: ['HR', 'Finance', 'Attendance', 'LMS'] },
  { name: 'Logistics', emoji: '🚚', desc: 'Fleet tracking, delivery scheduling, warehouse ops, and customer portal.', tags: ['Fleet', 'WMS', 'Dispatch', 'CRM'] },
  { name: 'Construction', emoji: '🏗️', desc: 'Project costing, subcontractor management, equipment tracking, and compliance.', tags: ['Projects', 'Assets', 'Finance', 'HR'] },
  { name: 'Hospitality', emoji: '🏨', desc: 'Staff rostering, inventory management, vendor procurement, and guest services.', tags: ['HR', 'Procurement', 'Finance', 'Admin'] },
  { name: 'Financial Services', emoji: '💼', desc: 'Compliance management, client relationships, expense control, and audit trails.', tags: ['Compliance', 'CRM', 'Finance', 'Audit'] },
  { name: 'Agriculture', emoji: '🌾', desc: 'Farm management, crop tracking, equipment maintenance, and supply chain.', tags: ['Assets', 'Inventory', 'Fleet', 'Finance'] },
  { name: 'NGOs & Nonprofits', emoji: '🤝', desc: 'Grant management, donor tracking, program reporting, and volunteer coordination.', tags: ['Finance', 'HR', 'Projects', 'Reports'] },
];

export default function IndustriesSection() {
  return (
    <section className="bg-gray-50 py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-6">
            <span className="text-blue-600 text-xs font-semibold uppercase tracking-wider">Industry Solutions</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900">
            Built for <span className="text-blue-600">your industry</span>
          </h2>
          <p className="mt-4 text-gray-500 text-lg max-w-2xl mx-auto">
            Pre-configured workflows, templates, and reports tailored to your sector&apos;s specific requirements.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {industries.map(industry => (
            <div key={industry.name} className="group bg-white rounded-2xl p-5 border border-gray-100 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50/50 transition-all duration-300 cursor-pointer">
              <div className="text-3xl mb-3">{industry.emoji}</div>
              <h3 className="font-bold text-gray-900 text-sm mb-2">{industry.name}</h3>
              <p className="text-gray-500 text-xs leading-relaxed mb-3">{industry.desc}</p>
              <div className="flex flex-wrap gap-1.5">
                {industry.tags.map(tag => (
                  <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">{tag}</span>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-gray-300 group-hover:text-blue-500 transition-colors">
                <span>View solution</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link href="/industries" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm">
            See all industry solutions <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
