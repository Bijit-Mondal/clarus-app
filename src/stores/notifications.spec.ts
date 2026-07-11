import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNotificationStore } from './notifications'

describe('Notification Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with mock notifications', () => {
    const store = useNotificationStore()
    expect(store.notifications.length).toBeGreaterThan(0)
  })

  it('calculates unreadCount correctly', () => {
    const store = useNotificationStore()
    const initialUnreadCount = store.unreadCount

    const unread = store.notifications.find((n) => !n.read)
    expect(unread).toBeDefined()

    if (unread) {
      store.markAsRead(unread.id)
      expect(store.unreadCount).toBe(initialUnreadCount - 1)
    }
  })

  it('toggles notification read status', () => {
    const store = useNotificationStore()
    const firstNotif = store.notifications[0]
    expect(firstNotif).toBeDefined()
    if (firstNotif) {
      const id = firstNotif.id
      const initialState = firstNotif.read

      store.toggleRead(id)
      expect(store.notifications[0]?.read).toBe(!initialState)

      store.toggleRead(id)
      expect(store.notifications[0]?.read).toBe(initialState)
    }
  })

  it('marks all as read', () => {
    const store = useNotificationStore()
    store.markAllAsRead()
    expect(store.unreadCount).toBe(0)
    store.notifications.forEach((n) => {
      expect(n.read).toBe(true)
    })
  })

  it('deletes a notification', () => {
    const store = useNotificationStore()
    const initialLength = store.notifications.length
    const firstNotif = store.notifications[0]
    expect(firstNotif).toBeDefined()
    if (firstNotif) {
      const idToDelete = firstNotif.id

      store.deleteNotification(idToDelete)
      expect(store.notifications.length).toBe(initialLength - 1)
      expect(store.notifications.find((n) => n.id === idToDelete)).toBeUndefined()
    }
  })
})
