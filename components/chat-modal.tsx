// components/chat-modal.tsx
"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { X, Search, Send, Trash2, MessageCircle, Menu, MoreHorizontal, Smile, Ban, User, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import Link from "next/link"

interface ChatModalProps {
  isOpen: boolean
  onClose: () => void
  recipientUser: {
    id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
  }
  currentUser: {
    id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
  }
}

interface Message {
  id: string
  content: string
  sender_id: string
  created_at: string
  updated_at: string
  deleted_by: string[]
  chat_id: string
  reactions: Reaction[]
  is_read: boolean
}

interface Reaction {
  id: string
  emoji: string
  user_id: string
  message_id: string
}

interface Chat {
  id: string
  created_at: string
  participants: any[]
  last_message?: Message
  unread_count: number
}

interface SearchedUser {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

interface BlockedUser {
  id: string
  blocker_id: string
  blocked_user_id: string
  created_at: string
}

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "👏"]

// Мемоизированный компонент аватарки для предотвращения лишних ререндеров
const MemoizedAvatar = ({ user, size = 8 }: { user: SearchedUser, size?: number }) => {
  const getInitials = useCallback((name: string | null) => {
    if (!name) return "U"
    return name[0].toUpperCase()
  }, [])

  return (
    <Avatar className={`h-${size} w-${size}`}>
      <AvatarImage 
        src={user.avatar_url || ""} 
        className="object-cover"
        alt={user.display_name || user.username || ""}
      />
      <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
        {getInitials(user.display_name || user.username)}
      </AvatarFallback>
    </Avatar>
  )
}

export function ChatModal({ isOpen, onClose, recipientUser, currentUser }: ChatModalProps) {
  const [activeChat, setActiveChat] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [chats, setChats] = useState<Chat[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null)
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    description: string
    onConfirm: () => void
    confirmText?: string
    cancelText?: string
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
    confirmText: "Confirm",
    cancelText: "Cancel"
  })
  const [notificationDialog, setNotificationDialog] = useState<{
    isOpen: boolean
    title: string
    description: string
  }>({
    isOpen: false,
    title: "",
    description: ""
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  // Загружаем заблокированных пользователей
  const loadBlockedUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('blocks')
        .select('*')
        .eq('blocker_id', currentUser.id)

      if (error) throw error
      setBlockedUsers(data || [])
    } catch (error) {
      console.error('Error loading blocked users:', error)
      showNotification("Error", "Failed to load blocked users")
    }
  }, [currentUser.id, supabase])

  // Показать диалог подтверждения
  const showConfirmDialog = useCallback((
    title: string, 
    description: string, 
    onConfirm: () => void,
    confirmText?: string,
    cancelText?: string
  ) => {
    setConfirmDialog({
      isOpen: true,
      title,
      description,
      onConfirm,
      confirmText,
      cancelText
    })
  }, [])

  // Показать диалог уведомления
  const showNotification = useCallback((title: string, description: string) => {
    setNotificationDialog({
      isOpen: true,
      title,
      description
    })
  }, [])

  // Мемоизированная функция для группировки сообщений по датам
  const groupMessagesByDate = useCallback((messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {}
    
    messages.forEach(message => {
      const date = new Date(message.created_at)
      const dateKey = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(message)
    })
    
    return groups
  }, [])

  // Мемоизированные сгруппированные сообщения
  const groupedMessages = useMemo(() => 
    groupMessagesByDate(messages), 
    [messages, groupMessagesByDate]
  )

  // Фокус на инпут при открытии
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen, activeChat])

  // Авто-скролл к новым сообщениям
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom()
    }
  }, [messages])

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: "smooth"
      })
    }, 100)
  }

  // Загружаем чаты и заблокированных пользователей
  useEffect(() => {
    if (isOpen) {
      loadChats()
      loadBlockedUsers()
      setSearchResults([])
    }
  }, [isOpen, loadBlockedUsers])

  // Подписываемся на новые сообщения только для активного чата
  useEffect(() => {
    if (!activeChat) return

    const channel = supabase
      .channel(`chat:${activeChat}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${activeChat}`
        },
        async (payload) => {
          const newMessage = payload.new as Message
          
          // Загружаем реакции для нового сообщения
          const { data: reactions } = await supabase
            .from('message_reactions')
            .select('*')
            .eq('message_id', newMessage.id)
          
          // Добавляем только если сообщение для активного чата
          if (newMessage.chat_id === activeChat) {
            setMessages(prev => [...prev, {
              ...newMessage,
              reactions: reactions || []
            }])
            
            // Обновляем список чатов чтобы показать последнее сообщение
            setTimeout(() => loadChats(), 300)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${activeChat}`
        },
        (payload) => {
          // Удаляем сообщение локально
          setMessages(prev => prev.filter(msg => msg.id !== payload.old.id))
          
          // Обновляем список чатов
          setTimeout(() => loadChats(), 300)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeChat])

  // Подписка на уведомления о непрочитанных сообщениях
  useEffect(() => {
    const channel = supabase
      .channel(`unread_messages:${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=neq.${currentUser.id}`
        },
        (payload) => {
          const newMessage = payload.new as Message
          // Обновляем счетчик непрочитанных для соответствующего чата
          loadChats()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUser.id, supabase])

  const loadChats = async () => {
    try {
      setIsLoading(true)
      
      // Загружаем чаты пользователя с участниками
      const { data: chatParticipants, error } = await supabase
        .from('chat_participants')
        .select(`
          chat_id,
          chats (
            id,
            created_at,
            participants:chat_participants (
              user:profiles (
                id,
                username,
                display_name,
                avatar_url
              )
            )
          )
        `)
        .eq('user_id', currentUser.id)

      if (error) {
        console.error('Error loading chats:', error)
        return
      }

      if (!chatParticipants) {
        setChats([])
        return
      }

      // Загружаем последние сообщения и количество непрочитанных для каждого чата
      const chatsWithMessages = await Promise.all(
        chatParticipants.map(async (cp: any) => {
          const chat = cp.chats
          
          // Получаем последнее сообщение
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          // Считаем количество непрочитанных сообщений
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', chat.id)
            .eq('is_read', false)
            .neq('sender_id', currentUser.id)

          return {
            id: chat.id,
            created_at: chat.created_at,
            participants: chat.participants.map((p: any) => p.user),
            last_message: lastMessage || undefined,
            unread_count: unreadCount || 0
          }
        })
      )

      // Сортируем по дате последнего сообщения или созданию чата
      const sortedChats = chatsWithMessages.sort((a, b) => {
        const aDate = a.last_message?.created_at || a.created_at
        const bDate = b.last_message?.created_at || b.created_at
        return new Date(bDate).getTime() - new Date(aDate).getTime()
      })

      setChats(sortedChats)

      // Автоматически открываем чат с получателем
      const existingChat = sortedChats.find(chat =>
        chat.participants.some((p: any) => p.id === recipientUser.id)
      )

      if (existingChat) {
        setActiveChat(existingChat.id)
        await loadMessages(existingChat.id)
        // Помечаем сообщения как прочитанные
        await markMessagesAsRead(existingChat.id)
      } else {
        // Создаем новый чат с получателем
        await createNewChat(recipientUser)
      }
    } catch (error) {
      console.error('Error in loadChats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Пометить сообщения как прочитанные
  const markMessagesAsRead = async (chatId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('chat_id', chatId)
        .eq('is_read', false)
        .neq('sender_id', currentUser.id)

      if (error) throw error

      // Обновляем локальное состояние
      setMessages(prev => prev.map(msg => ({
        ...msg,
        is_read: true
      })))

      // Обновляем счетчик непрочитанных в чатах
      setChats(prev => prev.map(chat => 
        chat.id === chatId 
          ? { ...chat, unread_count: 0 }
          : chat
      ))
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  const createNewChat = async (user: SearchedUser) => {
    try {
      // Проверяем, не заблокирован ли пользователь
      const isBlocked = blockedUsers.some(block => block.blocked_user_id === user.id)
      if (isBlocked) {
        showNotification("Cannot Message", "You cannot message a blocked user")
        return null
      }

      // Создаем новый чат
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert({})
        .select()
        .single()

      if (createError || !newChat) {
        console.error('Error creating chat:', createError)
        showNotification("Error", "Failed to create chat")
        return null
      }

      // Добавляем участников
      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert([
          { chat_id: newChat.id, user_id: currentUser.id },
          { chat_id: newChat.id, user_id: user.id }
        ])

      if (participantsError) {
        console.error('Error adding participants:', participantsError)
        showNotification("Error", "Failed to add participants")
        return null
      }

      const newChatObj = {
        id: newChat.id,
        created_at: newChat.created_at,
        participants: [currentUser, user],
        last_message: undefined,
        unread_count: 0
      }

      setChats(prev => [newChatObj, ...prev])
      setActiveChat(newChat.id)
      
      showNotification("Success", "Chat created successfully")
      return newChat.id
    } catch (error) {
      console.error('Error in createNewChat:', error)
      showNotification("Error", "Failed to create chat")
      return null
    }
  }

  const loadMessages = async (chatId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          reactions:message_reactions (
            id,
            emoji,
            user_id,
            message_id
          )
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error loading messages:', error)
        return
      }

      // Фильтруем сообщения, удаленные текущим пользователем
      const filteredMessages = (data || []).filter(msg => 
        !msg.deleted_by?.includes(currentUser.id)
      )

      // Обеспечиваем что у каждого сообщения есть массив reactions
      const messagesWithReactions = filteredMessages.map(msg => ({
        ...msg,
        reactions: msg.reactions || [],
        is_read: msg.is_read || false
      }))

      setMessages(messagesWithReactions)

      // Помечаем сообщения как прочитанные
      await markMessagesAsRead(chatId)
    } catch (error) {
      console.error('Error in loadMessages:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChat || isSending) return

    setIsSending(true)
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: activeChat,
          sender_id: currentUser.id,
          content: newMessage.trim(),
          is_read: false
        })
        .select()
        .single()

      if (error) {
        console.error('Error sending message:', error)
        showNotification("Error", "Failed to send message")
        return
      }

      // Добавляем сообщение локально для мгновенного отображения
      setMessages(prev => [...prev, {
        ...data,
        reactions: [],
        is_read: true
      }])

      setNewMessage("")
      // Фокус остается на инпуте после отправки
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)

      // Обновляем список чатов
      setTimeout(() => loadChats(), 300)
    } catch (error) {
      console.error('Error in sendMessage:', error)
      showNotification("Error", "Failed to send message")
    } finally {
      setIsSending(false)
    }
  }

  const deleteMessage = async (messageId: string) => {
    try {
      showConfirmDialog(
        "Delete Message",
        "Are you sure you want to delete this message? This action cannot be undone.",
        async () => {
          // Удаляем сначала все реакции, связанные с сообщением
          const { error: reactionsError } = await supabase
            .from('message_reactions')
            .delete()
            .eq('message_id', messageId)

          if (reactionsError) {
            console.error('Error deleting reactions:', reactionsError)
            showNotification("Error", "Failed to delete reactions")
            return
          }

          // Удаляем само сообщение
          const { error } = await supabase
            .from('messages')
            .delete()
            .eq('id', messageId)

          if (error) {
            console.error('Error deleting message:', error)
            showNotification("Error", "Failed to delete message")
          } else {
            // Удаляем сообщение локально
            setMessages(prev => prev.filter(msg => msg.id !== messageId))
            showNotification("Success", "Message deleted successfully")
          }
        },
        "Delete"
      )
    } catch (error) {
      console.error('Error in deleteMessage:', error)
      showNotification("Error", "Failed to delete message")
    }
  }

  const addReaction = async (messageId: string, emoji: string) => {
    try {
      const { error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: currentUser.id,
          emoji
        })

      if (error) {
        console.error('Error adding reaction:', error)
        showNotification("Error", "Failed to add reaction")
      } else {
        // Обновляем сообщения локально
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? {
                ...msg,
                reactions: [...(msg.reactions || []), {
                  id: Date.now().toString(),
                  emoji,
                  user_id: currentUser.id,
                  message_id: messageId
                }]
              }
            : msg
        ))
      }
    } catch (error) {
      console.error('Error in addReaction:', error)
      showNotification("Error", "Failed to add reaction")
    }
  }

  const removeReaction = async (messageId: string, emoji: string) => {
    try {
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', currentUser.id)
        .eq('emoji', emoji)

      if (error) {
        console.error('Error removing reaction:', error)
        showNotification("Error", "Failed to remove reaction")
      } else {
        // Обновляем сообщения локально
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? {
                ...msg,
                reactions: msg.reactions.filter(r => 
                  !(r.user_id === currentUser.id && r.emoji === emoji)
                )
              }
            : msg
        ))
      }
    } catch (error) {
      console.error('Error in removeReaction:', error)
      showNotification("Error", "Failed to remove reaction")
    }
  }

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .neq('id', currentUser.id)
        .limit(10)

      if (error) {
        console.error('Error searching users:', error)
        showNotification("Error", "Failed to search users")
        return
      }

      setSearchResults(data || [])
    } catch (error) {
      console.error('Error in searchUsers:', error)
      showNotification("Error", "Failed to search users")
    } finally {
      setIsLoading(false)
    }
  }

  const startChatWithUser = async (user: SearchedUser) => {
    try {
      // Проверяем, не заблокирован ли пользователь
      const isBlocked = blockedUsers.some(block => block.blocked_user_id === user.id)
      if (isBlocked) {
        showNotification("Cannot Message", "You cannot message a blocked user")
        return
      }

      // Ищем существующий чат с этим пользователем
      const existingChat = chats.find(chat =>
        chat.participants.some((p: any) => p.id === user.id)
      )

      if (existingChat) {
        setActiveChat(existingChat.id)
        await loadMessages(existingChat.id)
      } else {
        // Создаем новый чат
        const newChatId = await createNewChat(user)
        if (newChatId) {
          await loadMessages(newChatId)
        }
      }

      setSearchResults([])
      setSearchQuery("")
      setMobileSidebarOpen(false)
    } catch (error) {
      console.error('Error starting chat:', error)
      showNotification("Error", "Failed to start chat")
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getCurrentChatUser = () => {
    if (!activeChat) return recipientUser
    const chat = chats.find(c => c.id === activeChat)
    if (!chat) return recipientUser
    const otherUser = chat.participants.find((p: any) => p.id !== currentUser.id)
    return otherUser || recipientUser
  }

  const deleteChat = async (chatId: string) => {
    try {
      showConfirmDialog(
        "Delete Chat",
        "Are you sure you want to delete this chat? This action cannot be undone.",
        async () => {
          // Удаляем все сообщения в чате
          const { error: messagesError } = await supabase
            .from('messages')
            .delete()
            .eq('chat_id', chatId)

          if (messagesError) throw messagesError

          // Удаляем участников чата
          const { error: participantsError } = await supabase
            .from('chat_participants')
            .delete()
            .eq('chat_id', chatId)

          if (participantsError) throw participantsError

          // Удаляем сам чат
          const { error: chatError } = await supabase
            .from('chats')
            .delete()
            .eq('id', chatId)

          if (chatError) throw chatError

          // Обновляем локальное состояние
          setChats(prev => prev.filter(chat => chat.id !== chatId))
          if (activeChat === chatId) {
            setActiveChat(null)
            setMessages([])
          }
          
          showNotification("Success", "Chat deleted successfully")
        },
        "Delete"
      )
    } catch (error) {
      console.error('Error deleting chat:', error)
      showNotification("Error", "Failed to delete chat")
    }
  }

  const blockUser = async (userId: string) => {
    try {
      showConfirmDialog(
        "Block User",
        "Are you sure you want to block this user? You will not receive messages from them.",
        async () => {
          const { error } = await supabase
            .from('blocks')
            .insert({
              blocker_id: currentUser.id,
              blocked_user_id: userId
            })

          if (error) throw error

          // Обновляем локальное состояние
          setBlockedUsers(prev => [...prev, {
            id: Date.now().toString(),
            blocker_id: currentUser.id,
            blocked_user_id: userId,
            created_at: new Date().toISOString()
          }])

          // Если есть активный чат с этим пользователем, удаляем его
          const chatWithUser = chats.find(chat =>
            chat.participants.some((p: any) => p.id === userId)
          )
          
          if (chatWithUser) {
            deleteChat(chatWithUser.id)
          }

          showNotification("Success", "User blocked successfully")
        },
        "Block"
      )
    } catch (error) {
      console.error('Error blocking user:', error)
      showNotification("Error", "Failed to block user")
    }
  }

  const unblockUser = async (userId: string) => {
    try {
      showConfirmDialog(
        "Unblock User",
        "Are you sure you want to unblock this user? You will be able to receive messages from them again.",
        async () => {
          const { error } = await supabase
            .from('blocks')
            .delete()
            .eq('blocker_id', currentUser.id)
            .eq('blocked_user_id', userId)

          if (error) throw error

          // Обновляем локальное состояние
          setBlockedUsers(prev => prev.filter(block => block.blocked_user_id !== userId))
          
          showNotification("Success", "User unblocked successfully")
        },
        "Unblock"
      )
    } catch (error) {
      console.error('Error unblocking user:', error)
      showNotification("Error", "Failed to unblock user")
    }
  }

  const ReactionPicker = ({ messageId, onClose }: { messageId: string, onClose: () => void }) => (
    <div className="absolute bottom-full left-0 mb-2 bg-background border border-border rounded-lg shadow-lg p-2 z-10">
      <div className="flex gap-1">
        {EMOJIS.map(emoji => (
          <button
            key={emoji}
            className="h-8 w-8 text-lg hover:bg-accent rounded transition-colors flex items-center justify-center"
            onClick={() => {
              addReaction(messageId, emoji)
              onClose()
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )

  // Мемоизированная функция для рендеринга сообщений по группам дат
  const renderMessages = () => {
    return Object.entries(groupedMessages).map(([date, dateMessages]) => (
      <div key={date} className="space-y-3 sm:space-y-4">
        {/* Дата заголовок */}
        <div className="flex justify-center my-4">
          <Badge variant="outline" className="px-3 py-1 bg-background">
            {date}
          </Badge>
        </div>
        
        {/* Сообщения для этой даты */}
        {dateMessages.map(message => {
          const isBlockedUser = blockedUsers.some(block => 
            block.blocked_user_id === message.sender_id
          )
          
          if (isBlockedUser) return null
          
          return (
            <div
              key={message.id}
              className={`flex gap-2 sm:gap-3 group relative ${
                message.sender_id === currentUser.id ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.sender_id !== currentUser.id && (
                <MemoizedAvatar user={getCurrentChatUser()} size={8} />
              )}
              
              <div className={`max-w-[85%] sm:max-w-[70%] min-w-0 ${
                message.sender_id === currentUser.id ? 'order-first' : ''
              }`}>
                <div
                  className={`rounded-lg p-3 text-sm sm:text-base relative ${
                    message.sender_id === currentUser.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="break-words whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Меню сообщения */}
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setShowReactionPicker(message.id)}>
                          <Smile className="h-4 w-4 mr-2" />
                          Add Reaction
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteMessage(message.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    {formatTime(message.created_at)}
                  </span>
                  
                  {/* Реакции */}
                  {message.reactions && message.reactions.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {Object.entries(
                        message.reactions.reduce((acc: any, reaction) => {
                          acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1
                          return acc
                        }, {})
                      ).map(([emoji, count]) => (
                        <Badge
                          key={emoji}
                          variant="secondary"
                          className="text-xs cursor-pointer hover:bg-accent px-1 py-0 h-5"
                          onClick={() => {
                            const userReaction = message.reactions.find(
                              r => r.user_id === currentUser.id && r.emoji === emoji
                            )
                            if (userReaction) {
                              removeReaction(message.id, emoji)
                            } else {
                              addReaction(message.id, emoji)
                            }
                          }}
                        >
                          {emoji} {count}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Picker для реакций */}
              {showReactionPicker === message.id && (
                <ReactionPicker 
                  messageId={message.id} 
                  onClose={() => setShowReactionPicker(null)}
                />
              )}
            </div>
          )
        })}
      </div>
    ))
  }

  // Сайдбар для мобильных
  const ChatSidebar = () => {
    const currentChatUserMemo = useMemo(() => getCurrentChatUser(), [activeChat, chats, recipientUser])

    return (
      <div className="w-full h-full flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
              className="flex-1"
            />
          </div>
          <Button variant="outline" className="w-full" onClick={searchUsers} disabled={isLoading}>
            {isLoading ? "Searching..." : "Search"}
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {/* Результаты поиска */}
            {searchResults.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2 px-2">Search Results</h3>
                {searchResults.map(user => {
                  const isBlocked = blockedUsers.some(block => block.blocked_user_id === user.id)
                  return (
                    <div
                      key={user.id}
                      className={`p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors mb-2 ${
                        isBlocked ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      onClick={() => {
                        if (!isBlocked) {
                          startChatWithUser(user)
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <MemoizedAvatar user={user} size={10} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">
                              {user.display_name || user.username}
                            </p>
                            {isBlocked && (
                              <Badge variant="destructive" className="text-xs">
                                Blocked
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            @{user.username}
                          </p>
                        </div>
                        <MessageCircle className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Список чатов */}
            <h3 className="text-sm font-medium mb-2 px-2">Your Chats</h3>
            {chats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No chats yet</p>
              </div>
            ) : (
              chats.map(chat => {
                const otherUser = chat.participants.find((p: any) => p.id !== currentUser.id)
                if (!otherUser) return null
                
                const isBlocked = blockedUsers.some(block => block.blocked_user_id === otherUser.id)

                return (
                  <div
                    key={chat.id}
                    className={`p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors mb-2 ${
                      activeChat === chat.id ? 'bg-accent' : ''
                    } ${isBlocked ? 'opacity-50' : ''}`}
                    onClick={() => {
                      if (!isBlocked) {
                        setActiveChat(chat.id)
                        loadMessages(chat.id)
                        setMobileSidebarOpen(false)
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <MemoizedAvatar user={otherUser} size={10} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">
                              {otherUser.display_name || otherUser.username}
                            </p>
                            {isBlocked && (
                              <Badge variant="destructive" className="text-xs">
                                Blocked
                              </Badge>
                            )}
                          </div>
                          {chat.last_message && (
                            <p className="text-xs text-muted-foreground truncate">
                              {chat.last_message.content}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Счетчик непрочитанных сообщений */}
                        {chat.unread_count > 0 && (
                          <div className="relative">
                            <div className="absolute -top-2 -right-2">
                              <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center rounded-full bg-blue-500 text-white text-xs font-bold">
                                {chat.unread_count > 9 ? '9+' : chat.unread_count}
                              </Badge>
                            </div>
                            <Bell className="h-4 w-4 text-blue-500" />
                          </div>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/user/${otherUser.username}`} className="cursor-pointer">
                                <User className="h-4 w-4 mr-2" />
                                View Profile
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteChat(chat.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Chat
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {isBlocked ? (
                              <DropdownMenuItem onClick={() => unblockUser(otherUser.id)}>
                                <Ban className="h-4 w-4 mr-2" />
                                Unblock User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => blockUser(otherUser.id)}>
                                <Ban className="h-4 w-4 mr-2" />
                                Block User
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </div>
    )
  }

  if (!isOpen) return null

  const currentChatUser = getCurrentChatUser()
  const isBlocked = blockedUsers.some(block => block.blocked_user_id === currentChatUser.id)

  return (
    <>
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
        <div className="bg-background border border-border rounded-lg shadow-lg w-full h-full max-w-6xl max-h-[90vh] flex flex-col sm:flex-row">
          {/* Мобильный header */}
          <div className="sm:hidden p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <ChatSidebar />
                </SheetContent>
              </Sheet>
              <MemoizedAvatar user={currentChatUser} size={8} />
              <div className="flex items-center gap-2">
                <div>
                  <p className="font-medium text-sm">
                    {currentChatUser.display_name || currentChatUser.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    @{currentChatUser.username}
                  </p>
                </div>
                {isBlocked && (
                  <Badge variant="destructive" className="text-xs">
                    Blocked
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/user/${currentChatUser.username}`} className="cursor-pointer">
                      <User className="h-4 w-4 mr-2" />
                      View Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => deleteChat(activeChat || "")}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Chat
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {isBlocked ? (
                    <DropdownMenuItem onClick={() => unblockUser(currentChatUser.id)}>
                      <Ban className="h-4 w-4 mr-2" />
                      Unblock User
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => blockUser(currentChatUser.id)}>
                      <Ban className="h-4 w-4 mr-2" />
                      Block User
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Сайдбар с чатами - десктоп */}
          <div className="hidden sm:flex w-80 border-r border-border flex-col">
            <ChatSidebar />
          </div>

          {/* Основная область чата */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Заголовок чата - десктоп */}
            <div className="hidden sm:flex p-4 border-b border-border items-center justify-between">
              <div className="flex items-center gap-3">
                <MemoizedAvatar user={currentChatUser} size={8} />
                <div className="flex items-center gap-2">
                  <div>
                    <p className="font-medium">
                      {currentChatUser.display_name || currentChatUser.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      @{currentChatUser.username}
                    </p>
                  </div>
                  {isBlocked && (
                    <Badge variant="destructive" className="text-xs">
                      Blocked
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/user/${currentChatUser.username}`} className="cursor-pointer">
                        <User className="h-4 w-4 mr-2" />
                        View Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteChat(activeChat || "")}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Chat
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {isBlocked ? (
                      <DropdownMenuItem onClick={() => unblockUser(currentChatUser.id)}>
                        <Ban className="h-4 w-4 mr-2" />
                        Unblock User
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => blockUser(currentChatUser.id)}>
                        <Ban className="h-4 w-4 mr-2" />
                        Block User
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Сообщения */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-3 sm:p-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>{isBlocked ? "This user is blocked. No messages available." : "No messages yet. Start the conversation!"}</p>
                  </div>
                ) : (
                  renderMessages()
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Ввод сообщения */}
            {!isBlocked && (
              <div className="p-3 sm:p-4 border-t border-border">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    className="flex-1"
                    disabled={isSending}
                  />
                  <Button 
                    onClick={sendMessage} 
                    disabled={!newMessage.trim() || isSending}
                    size="sm"
                    className="sm:px-3"
                  >
                    {isSending ? (
                      <div className="animate-spin">
                        <Send className="h-4 w-4" />
                      </div>
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Диалог подтверждения */}
      <AlertDialog open={confirmDialog.isOpen} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, isOpen: open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}>
              {confirmDialog.cancelText}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              confirmDialog.onConfirm()
              setConfirmDialog(prev => ({ ...prev, isOpen: false }))
            }}>
              {confirmDialog.confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Диалог уведомления */}
      <Dialog open={notificationDialog.isOpen} onOpenChange={(open) => setNotificationDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{notificationDialog.title}</DialogTitle>
            <DialogDescription>
              {notificationDialog.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setNotificationDialog(prev => ({ ...prev, isOpen: false }))}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
