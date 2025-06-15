import React from 'react';
import {
  ServerIcon,
  WrenchScrewdriverIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  CubeIcon,
  CommandLineIcon,
} from '@heroicons/react/24/outline';

interface NavigationProps {
  selectedTab: string;
  onTabChange: (tab: string) => void;
  connectedServers: number;
  totalTools: number;
}

const Navigation: React.FC<NavigationProps> = ({ 
  selectedTab, 
  onTabChange, 
  connectedServers, 
  totalTools 
}) => {
  const navItems = [
    {
      id: 'servers',
      label: 'Servers',
      icon: ServerIcon,
      badge: connectedServers > 0 ? connectedServers.toString() : undefined,
      description: 'Manage MCP servers'
    },
    {
      id: 'tools',
      label: 'Tools',
      icon: WrenchScrewdriverIcon,
      badge: totalTools > 0 ? totalTools.toString() : undefined,
      description: 'Available tools'
    },
    {
      id: 'resources',
      label: 'Resources',
      icon: CubeIcon,
      description: 'Server resources'
    },
    {
      id: 'prompts',
      label: 'Prompts',
      icon: DocumentTextIcon,
      description: 'Template prompts'
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: ChatBubbleLeftRightIcon,
      description: 'AI assistant'
    },
    {
      id: 'logs',
      label: 'Logs',
      icon: CommandLineIcon,
      description: 'System logs'
    }
  ];

  return (
    <nav className="space-y-2 p-4">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = selectedTab === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
              ${isActive 
                ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-white shadow-lg shadow-indigo-500/10' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
              }
            `}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              {item.badge && (
                <span className="absolute -top-2 -right-2 bg-indigo-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[16px] h-4 flex items-center justify-center font-medium">
                  {item.badge}
                </span>
              )}
            </div>
            <div className="flex-1 text-left">
              <div className={`font-medium text-sm ${isActive ? 'text-white' : 'text-slate-300'}`}>
                {item.label}
              </div>
              <div className={`text-xs ${isActive ? 'text-indigo-200' : 'text-slate-500'}`}>
                {item.description}
              </div>
            </div>
          </button>
        );
      })}
    </nav>
  );
};

export default Navigation;
