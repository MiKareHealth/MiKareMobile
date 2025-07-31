import React from 'react';
import { ChevronDown } from 'lucide-react';

type TabType = 'diary' | 'documents' | 'notes' | 'symptoms' | 'medications' | 'mood';

interface Tab {
  id: TabType;
  label: string;
  count?: number;
}

interface MobileTabDropdownProps {
  tabs: Tab[];
  activeTab: TabType;
  onTabChange: (tabId: TabType) => void;
}

export default function MobileTabDropdown({ tabs, activeTab, onTabChange }: MobileTabDropdownProps) {
  const activeTabLabel = tabs.find(tab => tab.id === activeTab)?.label || 'Select Tab';

  return (
    <div className="relative w-full">
      <select
        value={activeTab}
        onChange={(e) => onTabChange(e.target.value as TabType)}
        className="w-full appearance-none bg-background-default border border-border-default rounded-lg px-4 py-3 pr-10 text-base font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
      >
        {tabs.map((tab) => (
          <option key={tab.id} value={tab.id}>
            {tab.label}
            {tab.count !== undefined && ` (${tab.count})`}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <ChevronDown className="h-5 w-5 text-text-tertiary" />
      </div>
    </div>
  );
}