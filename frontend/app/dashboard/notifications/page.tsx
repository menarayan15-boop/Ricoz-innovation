'use client';

import React from 'react';
import Link from 'next/link';
import { Bell, CheckCircle2, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export default function NotificationsPage() {
  const notifications = [
    { title: 'Attorney Review Signed Off', time: '10 minutes ago', type: 'success', text: 'Sarah Jenkins, Esq. marked Exhibit B for APP-2026-0142 as verified.' },
    { title: 'New Exhibit Uploaded', time: '2 hours ago', type: 'info', text: 'Dr. Siddharth Rao uploaded Phd_Transcript_Computer_Science.pdf.' },
    { title: 'Action Required: Prevailing Wage Check', time: '1 day ago', type: 'warning', text: 'Review prevailing wage minimum against certified LCA ETA-9035.' },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm">
        <div className="flex items-center space-x-2">
          <Bell className="w-5 h-5 text-[#172B4D]" />
          <h1 className="text-xl font-bold text-[#172B4D]">
            Notifications &amp; Activity Log
          </h1>
        </div>
        <p className="mt-1 text-xs text-[#627D98]">
          Real-time audit trail of dossier modifications, attorney reviews, and validation alerts
        </p>
      </div>

      <div className="space-y-3">
        {notifications.map((n, idx) => (
          <div key={idx} className="p-4 bg-white rounded-lg border border-[#E2E8F0] shadow-sm flex items-start justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded bg-[#F0F4F8] text-[#172B4D] mt-0.5">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#172B4D]">{n.title}</h3>
                <p className="text-xs text-[#627D98] mt-0.5">{n.text}</p>
                <span className="text-[10px] text-[#829AB1] mt-1 block">{n.time}</span>
              </div>
            </div>
            <Badge variant={n.type === 'success' ? 'success' : n.type === 'warning' ? 'warning' : 'info'} size="sm">
              {n.type}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
