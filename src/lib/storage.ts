import { ChatHistory } from './types'

const STORAGE_KEY = 'agentflow_chats'

export const storage = {
  getChats: (): ChatHistory[] => {
    if (typeof window === 'undefined') return []
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  },

  saveChat: (chat: ChatHistory): void => {
    if (typeof window === 'undefined') return
    try {
      const chats = storage.getChats()
      const index = chats.findIndex(c => c.id === chat.id)
      if (index >= 0) {
        chats[index] = chat
      } else {
        chats.unshift(chat)
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats.slice(0, 50))) // Keep last 50
    } catch (error) {
      console.error('Failed to save chat:', error)
    }
  },

  deleteChat: (id: string): void => {
    if (typeof window === 'undefined') return
    try {
      const chats = storage.getChats().filter(c => c.id !== id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats))
    } catch (error) {
      console.error('Failed to delete chat:', error)
    }
  },

  clearAll: (): void => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('Failed to clear storage:', error)
    }
  },
}
