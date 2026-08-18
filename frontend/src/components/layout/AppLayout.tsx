import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { User } from '../../types';

interface AppLayoutProps {
  currentUser: User | null;
  onLogout: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ currentUser, onLogout }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left Sidebar */}
      <Sidebar currentUser={currentUser} onLogout={onLogout} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header currentUser={currentUser} />
        
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          <Outlet context={{ currentUser }} />
        </main>
      </div>
    </div>
  );
};
