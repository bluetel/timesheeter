import { SiGooglesheets, SiJira, SiToggl } from 'react-icons/si';
import { HolidayIcon } from '../lib';
import { ClockIcon } from '@heroicons/react/24/outline';

const features = [
  {
    name: 'Toggl',
    description: 'Toggl entries can be automatically imported, including custom descriptions',
    icon: SiToggl,
  },
  {
    name: 'Jira',
    description: 'Task information can be imported to automate task naming',
    icon: SiJira,
  },
  {
    name: 'Holiday Support',
    description: 'Record holidays and they will automatically appear on your timesheet',
    icon: HolidayIcon,
  },
  {
    name: 'Google Sheets Output',
    description: 'All information can be exported daily to your Google Sheets timesheet, including custom descriptions',
    icon: SiGooglesheets,
  },
  {
    name: 'Overtime Calculations',
    description: 'Overtime is automatically calculated - including bank holidays and weekends',
    icon: ClockIcon,
  },
] as const;

export const FeatureSection = () => (
  <div className="bg-white py-24 sm:py-32">
    <div className="mx-auto max-w-7xl px-6 lg:px-8">
      <div className="mx-auto max-w-2xl lg:text-center">
        <h2 className="text-base font-semibold leading-7 text-indigo-600">All the features you need</h2>
        <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Connects to existing software
        </p>
        <p className="mt-6 text-lg leading-8 text-gray-600">Integrates to existing software through integrations</p>
      </div>
      <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
        <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
          {features.map((feature) => (
            <div key={feature.name} className="relative pl-16">
              <dt className="text-base font-semibold leading-7 text-gray-900">
                <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                  <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                {feature.name}
              </dt>
              <dd className="mt-2 text-base leading-7 text-gray-600">{feature.description}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  </div>
);
