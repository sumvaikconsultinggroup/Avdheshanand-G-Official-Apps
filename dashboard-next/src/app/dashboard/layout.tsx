"use client";

import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import React from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F7F1E7] dark:bg-gray-900">
      {/* Sidebar */}
      <AppSidebar />
      
      {/* Main Content Area */}
      <div className="lg:pl-64">
        {/* Header */}
        <AppHeader />
        
        {/* Page Content */}
        <main className="p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
