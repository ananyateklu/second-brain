import { Activity } from '../../../services/api/activities.service';
import {
  FileText,
  CheckSquare,
  Lightbulb,
  Bell,
  MessageSquare,
  Tag,
  Settings,
  Link as LinkIcon,
  Cloud
} from 'lucide-react';
import { ElementType } from 'react';

export function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) {
    return 'just now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString();
}

export function groupActivitiesByDate(activities: Activity[]): Record<string, Activity[]> {
  const groups: Record<string, Activity[]> = {};
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  activities.forEach(activity => {
    const date = new Date(activity.timestamp);
    let groupKey: string;

    if (date.toDateString() === today.toDateString()) {
      groupKey = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = 'Yesterday';
    } else {
      groupKey = date.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(activity);
  });

  return groups;
}

export const getActivityIcon = (type: string): ElementType => {
  const normalizedType = type.toLowerCase();

  switch (normalizedType) {
    case 'note':
      return FileText;
    case 'task':
      return CheckSquare;
    case 'ticktick_task':
      return CheckSquare; // Using same icon as regular tasks for consistency
    case 'idea':
      return Lightbulb;
    case 'reminder':
      return Bell;
    case 'ai_chat':
    case 'ai_message':
      return MessageSquare;
    case 'tag':
      return Tag;
    case 'notelink':
      return LinkIcon;
    case 'integration':
    case 'ticktick_integration':
      return Cloud;
    case 'settings':
      return Settings;
    default:
      return FileText;
  }
};