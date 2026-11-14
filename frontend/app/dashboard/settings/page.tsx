'use client';

import React from 'react';
import Link from 'next/link';
import { Settings, Shield, User, Bell, Database, HardDrive, Key } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-[#172B4D]" />
          <h1 className="text-xl font-bold text-[#172B4D]">
            System &amp; Workspace Settings
          </h1>
        </div>
        <p className="mt-1 text-xs text-[#627D98]">
          Configure profile preferences, security policies, and API integration settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Security &amp; Encryption Configuration</CardTitle>
          <CardDescription>Enterprise LegalTech data governance and persistent database binding</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded">
            <div>
              <span className="text-xs font-semibold text-[#172B4D] block">MongoDB Atlas Persistence</span>
              <span className="text-[11px] text-[#627D98]">Connected to cluster0.unoinay.mongodb.net</span>
            </div>
            <Badge variant="success" size="sm">Active (Connected)</Badge>
          </div>

          <div className="flex items-center justify-between p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded">
            <div>
              <span className="text-xs font-semibold text-[#172B4D] block">Volume At-Rest Encryption</span>
              <span className="text-[11px] text-[#627D98]">AES-256 enabled on all evidentiary artifacts</span>
            </div>
            <Badge variant="navy" size="sm">Standard</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
