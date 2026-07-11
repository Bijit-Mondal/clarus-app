import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Notification {
  id: string
  title: string
  description: string
  type: 'failure' | 'expiry' | 'task' | 'update'
  createdAt: string
  read: boolean
  targetUrl?: string
  severity: 'info' | 'warning' | 'destructive' | 'success'
}

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([
    {
      id: 'notif-1',
      title: 'Control AC-2 Check Failed',
      description:
        'Control AC-2 (Account Management) failed the weekly automated configuration check due to inactive user accounts.',
      type: 'failure',
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45m ago
      read: false,
      targetUrl: '/dashboard/controls/overview',
      severity: 'destructive',
    },
    {
      id: 'notif-2',
      title: 'Evidence Nearing Expiration',
      description:
        "Evidence item 'S3 Bucket Encryption Config' expires in 5 days and requires a new upload to remain compliant.",
      type: 'expiry',
      createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3h ago
      read: false,
      targetUrl: '/dashboard/controls/evidence',
      severity: 'warning',
    },
    {
      id: 'notif-3',
      title: 'Audit Documentation Requested',
      description:
        'Lead auditor requested additional sample documents and logs for control SC-7 (Boundary Protection).',
      type: 'task',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1d ago
      read: false,
      targetUrl: '/dashboard/controls/reviews',
      severity: 'info',
    },
    {
      id: 'notif-4',
      title: 'Policy Document Approved',
      description:
        'Security Policy v2.4 (Information Security Policy) has been approved by the security-leads review board.',
      type: 'update',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(), // 1.5d ago
      read: true,
      targetUrl: '/dashboard/controls/overview',
      severity: 'success',
    },
    {
      id: 'notif-5',
      title: 'Control AC-7 Status Changed',
      description:
        "Control AC-7 (Unsuccessful Login Attempts) is now marked as 'Passing' after verification of lockouts.",
      type: 'update',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3d ago
      read: true,
      targetUrl: '/dashboard/controls/overview',
      severity: 'success',
    },
  ])

  const unreadCount = computed(() => notifications.value.filter((n) => !n.read).length)

  function markAsRead(id: string) {
    const notification = notifications.value.find((n) => n.id === id)
    if (notification) {
      notification.read = true
    }
  }

  function markAsUnread(id: string) {
    const notification = notifications.value.find((n) => n.id === id)
    if (notification) {
      notification.read = false
    }
  }

  function toggleRead(id: string) {
    const notification = notifications.value.find((n) => n.id === id)
    if (notification) {
      notification.read = !notification.read
    }
  }

  function markAllAsRead() {
    notifications.value.forEach((n) => {
      n.read = true
    })
  }

  function deleteNotification(id: string) {
    notifications.value = notifications.value.filter((n) => n.id !== id)
  }

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAsUnread,
    toggleRead,
    markAllAsRead,
    deleteNotification,
  }
})
