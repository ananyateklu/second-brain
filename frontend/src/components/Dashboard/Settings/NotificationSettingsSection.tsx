import { useState, useEffect } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { notificationService } from '../../../services/notification/notification.service';
import { useTheme } from '../../../contexts/themeContextUtils';

export function NotificationSettingsSection() {
    const { theme } = useTheme();
    const [pushNotifications, setPushNotifications] = useState(false);

    useEffect(() => {
        setPushNotifications(notificationService.isNotificationsEnabled());
    }, []);

    const handlePushNotificationChange = async () => {
        if (!pushNotifications) {
            const enabled = await notificationService.enableNotifications();
            setPushNotifications(enabled);
            if (!enabled) {
                console.warn('Failed to enable notifications');
            } else {
                await notificationService.showNotification(
                    'Notifications Enabled',
                    {
                        body: 'You will now receive notifications for reminders and achievements.',
                        requireInteraction: false,
                        tag: 'notifications-enabled'
                    }
                );
            }
        } else {
            notificationService.disableNotifications();
            setPushNotifications(false);
        }
    };

    const getContainerBackground = () => {
        if (theme === 'dark') return 'bg-gray-900/30';
        if (theme === 'midnight') return 'bg-[#1e293b]/30';
        return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
    };

    const innerElementClasses = `
    ${getContainerBackground()}
    border-[0.5px] 
    border-white/10
    backdrop-blur-xl
    rounded-xl
    transition-all
    duration-200
    hover:bg-[var(--color-surfaceHover)]
  `;

    const toggleClasses = `
    w-14 
    h-7 
    bg-gray-400/50
    dark:bg-gray-700/30
    rounded-full 
    peer 
    peer-checked:after:translate-x-full 
    after:content-[''] 
    after:absolute 
    after:top-[2px] 
    after:left-[2px] 
    after:bottom-[2px]
    after:bg-white
    dark:after:bg-gray-200
    after:rounded-full 
    after:w-6 
    after:transition-all 
    after:shadow-sm
    peer-checked:bg-[var(--color-accent)]
    peer-checked:border-[var(--color-accent)]
    border-[0.5px]
    border-white/10
    transition-all
    duration-300
    backdrop-blur-sm
    hover:bg-gray-500/50
    dark:hover:border-gray-500/40
    peer-checked:hover:bg-[var(--color-accent)]/90
    peer-checked:hover:border-[var(--color-accent)]/90
  `;

    const primaryButtonClasses = `
    flex items-center gap-2 px-4 py-2
    ${theme === 'midnight' ? 'bg-[var(--color-accent)]/80 hover:bg-[var(--color-accent)]/70' : 'bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90'}
    text-white rounded-lg transition-all duration-200 
    hover:scale-105 hover:-translate-y-0.5 
    shadow-sm hover:shadow-md
    text-sm font-medium
  `;

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-[var(--color-text)]">Notifications</h3>
            <p className="text-sm text-[var(--color-textSecondary)]">Configure how you want to be notified</p>

            <div className="space-y-4 mt-6">
                <label className={`flex items-center justify-between p-4 cursor-pointer ${innerElementClasses}`}>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                            <Bell className="w-4 h-4 text-[var(--color-accent)]" />
                        </div>
                        <div>
                            <p className="font-medium text-[var(--color-text)]">Push Notifications</p>
                            <p className="text-xs text-[var(--color-textSecondary)]">
                                Get notified about updates and reminders
                            </p>
                        </div>
                    </div>
                    <div className="relative inline-flex">
                        <input
                            type="checkbox"
                            checked={pushNotifications}
                            onChange={handlePushNotificationChange}
                            className="sr-only peer"
                        />
                        <div className={toggleClasses}></div>
                    </div>
                </label>

                {pushNotifications && (
                    <>
                        <div className={`flex items-center justify-between p-4 ${innerElementClasses}`}>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                                    <BellRing className="w-4 h-4 text-[var(--color-accent)]" />
                                </div>
                                <div>
                                    <p className="font-medium text-[var(--color-text)]">Notification Sound</p>
                                    <p className="text-xs text-[var(--color-textSecondary)]">
                                        Play a sound when notifications arrive
                                    </p>
                                </div>
                            </div>
                            <select
                                className={`
                  px-3 py-2 rounded-lg text-sm
                  ${getContainerBackground()}
                  border-[0.5px] border-white/10
                  text-[var(--color-text)]
                  hover:bg-[var(--color-surfaceHover)]
                  transition-all duration-200
                `}
                            >
                                <option>Default Sound</option>
                                <option>Soft Bell</option>
                                <option>Chime</option>
                                <option>None</option>
                            </select>
                        </div>

                        <button
                            onClick={() => {
                                notificationService.showNotification('Test Notification', {
                                    body: 'This is a test notification.',
                                    tag: 'test-notification',
                                    requireInteraction: false
                                });
                            }}
                            className={primaryButtonClasses}
                        >
                            <Bell className="w-4 h-4" />
                            Send Test Notification
                        </button>
                    </>
                )}
            </div>
        </div>
    );
} 