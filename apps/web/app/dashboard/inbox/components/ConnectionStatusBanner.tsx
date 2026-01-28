'use client';

import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import type { ConnectionStatus } from '../hooks/useWebSocket';

interface ConnectionStatusBannerProps {
  status: ConnectionStatus;
  onReconnect: () => void;
}

export function ConnectionStatusBanner({ status, onReconnect }: ConnectionStatusBannerProps) {
  const statusConfig = {
    connected: {
      dotColor: 'bg-green-500',
      text: 'Connected',
      textColor: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
      icon: Wifi,
    },
    disconnected: {
      dotColor: 'bg-red-500',
      text: 'Disconnected',
      textColor: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      icon: WifiOff,
    },
    connecting: {
      dotColor: 'bg-yellow-500',
      text: 'Connecting...',
      textColor: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
      icon: Wifi,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`flex items-center justify-between px-4 py-2 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
      <div className="flex items-center gap-2">
        <span className={`relative flex h-2.5 w-2.5`}>
          <span className={`${status === 'connecting' ? 'animate-ping' : ''} absolute inline-flex h-full w-full rounded-full ${config.dotColor} opacity-75`}></span>
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${config.dotColor}`}></span>
        </span>
        <Icon className={`w-4 h-4 ${config.textColor}`} />
        <span className={`text-sm font-medium ${config.textColor}`}>{config.text}</span>
      </div>
      {status === 'disconnected' && (
        <button
          onClick={onReconnect}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reconnect
        </button>
      )}
    </div>
  );
}
