// components/chat-modal.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { X, Search, Send, Trash2, MessageCircle, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

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
  reactions: Reaction[]
}

interface Reaction {
  id: string
  emoji: string
  user_id: string
}

interface Chat {
  id: string
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

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"]

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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  // Авто-скролл к новым сообщениям
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 100)
  }

  // Загружаем чаты текущего пользователя
  useEffect(() => {
    if (isOpen) {
      loadChats()
      setSearchResults([])
    }
  }, [isOpen])

  // Подписываемся на новые сообщения
  useEffect(() => {
    if (!activeChat) return

    let channel: any

    const setupSubscription = async () => {
      channel = supabase
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
            
            setMessages(prev => [...prev, {
              ...newMessage,
              reactions: reactions || []
            }])
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
            setMessages(prev => prev.filter(msg => msg.id !== payload.old.id))
          }
        )
        .subscribe()
    }

    setupSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [activeChat])

  const loadChats = async () => {
    try {
      setIsLoading(true)
      const { data: chatParticipants, error } = await supabase
        .from('chat_participants')
        .select(`
          chat_id,
          chats (
            id,
            created_at,
            updated_at,
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
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading chats:', error)
        return
      }

      // Загружаем последние сообщения для каждого чата
      const chatsWithMessages = await Promise.all(
        (chatParticipants || []).map(async (cp: any) => {
          const chat = cp.chats
          
          // Получаем последнее сообщение
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          return {
            id: chat.id,
            participants: chat.participants.map((p: any) => p.user),
            last_message: lastMessage || undefined,
            unread_count: 0
          }
        })
      )

      setChats(chatsWithMessages)

      // Автоматически открываем чат с получателем, если он существует
      const existingChat = chatsWithMessages.find(chat =>
        chat.participants.some((p: any) => p.id === recipientUser.id)
      )

      if (existingChat) {
        setActiveChat(existingChat.id)
        loadMessages(existingChat.id)
      } else {
        // Создаем новый чат с получателем
        createOrGetChat()
      }
    } catch (error) {
      console.error('Error in loadChats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createOrGetChat = async () => {
    try {
      // Создаем новый чат
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert({})
        .select()
        .single()

      if (createError || !newChat) {
        console.error('Error creating chat:', createError)
        return
      }

      // Добавляем участников
      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert([
          { chat_id: newChat.id, user_id: currentUser.id },
          { chat_id: newChat.id, user_id: recipientUser.id }
        ])

      if (participantsError) {
        console.error('Error adding participants:', participantsError)
        return
      }

      setActiveChat(newChat.id)
      const newChatObj = {
        id: newChat.id,
        participants: [currentUser, recipientUser],
        last_message: undefined,
        unread_count: 0
      }
      setChats(prev => [newChatObj, ...prev])
      
      // Загружаем сообщения для нового чата
      loadMessages(newChat.id)
    } catch (error) {
      console.error('Error in createOrGetChat:', error)
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
            user_id
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
        reactions: msg.reactions || []
      }))

      setMessages(messagesWithReactions)
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
          content: newMessage.trim()
        })
        .select()
        .single()

      if (error) {
        console.error('Error sending message:', error)
        alert('Failed to send message')
        return
      }

      // Обновляем список чатов чтобы показать последнее сообщение
      await loadChats()
      
      setNewMessage("")
      // Фокус на инпут после отправки
      inputRef.current?.focus()
    } catch (error) {
      console.error('Error in sendMessage:', error)
      alert('Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  const deleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return

    try {
      const { error } = await supabase
        .from('messages')
        .update({
          deleted_by: supabase.raw('array_append(deleted_by, ?)', [currentUser.id])
        })
        .eq('id', messageId)

      if (error) {
        console.error('Error deleting message:', error)
      } else {
        // Перезагружаем сообщения
        if (activeChat) {
          loadMessages(activeChat)
        }
      }
    } catch (error) {
      console.error('Error in deleteMessage:', error)
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
      } else {
        // Обновляем сообщения чтобы показать новую реакцию
        if (activeChat) {
          loadMessages(activeChat)
        }
      }
    } catch (error) {
      console.error('Error in addReaction:', error)
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
      } else {
        // Обновляем сообщения
        if (activeChat) {
          loadMessages(activeChat)
        }
      }
    } catch (error) {
      console.error('Error in removeReaction:', error)
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
        return
      }

      setSearchResults(data || [])
    } catch (error) {
      console.error('Error in searchUsers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const startChatWithUser = async (user: SearchedUser) => {
    try {
      // Проверяем существующий чат
      const { data: existingChats } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', currentUser.id)

      if (existingChats && existingChats.length > 0) {
        const chatIds = existingChats.map(cp => cp.chat_id)
        
        const { data: userChats } = await supabase
          .from('chat_participants')
          .select('chat_id')
          .eq('user_id', user.id)
          .in('chat_id', chatIds)

        if (userChats && userChats.length > 0) {
          setActiveChat(userChats[0].chat_id)
          loadMessages(userChats[0].chat_id)
          setSearchResults([])
          setSearchQuery("")
          setMobileSidebarOpen(false)
          return
        }
      }

      // Создаем новый чат
      const { data: newChat } = await supabase
        .from('chats')
        .insert({})
        .select()
        .single()

      if (!newChat) return

      await supabase
        .from('chat_participants')
        .insert([
          { chat_id: newChat.id, user_id: currentUser.id },
          { chat_id: newChat.id, user_id: user.id }
        ])

      setActiveChat(newChat.id)
      const newChatObj = {
        id: newChat.id,
        participants: [currentUser, user],
        last_message: undefined,
        unread_count: 0
      }
      setChats(prev => [newChatObj, ...prev])
      setSearchResults([])
      setSearchQuery("")
      setMobileSidebarOpen(false)
      
      // Загружаем сообщения для нового чата
      loadMessages(newChat.id)
    } catch (error) {
      console.error('Error starting chat:', error)
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
    return chat.participants.find((p: any) => p.id !== currentUser.id) || recipientUser
  }

  // Сайдбар для мобильных
  const ChatSidebar = () => (
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
              {searchResults.map(user => (
                <div
                  key={user.id}
                  className="p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors mb-2"
                  onClick={() => startChatWithUser(user)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url || ""} />
                      <AvatarFallback>
                        {user.display_name?.[0] || user.username?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {user.display_name || user.username}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        @{user.username}
                      </p>
                    </div>
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
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

              return (
                <div
                  key={chat.id}
                  className={`p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                    activeChat === chat.id ? 'bg-accent' : ''
                  }`}
                  onClick={() => {
                    setActiveChat(chat.id)
                    loadMessages(chat.id)
                    setMobileSidebarOpen(false)
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={otherUser.avatar_url || ""} />
                      <AvatarFallback>
                        {otherUser.display_name?.[0] || otherUser.username?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {otherUser.display_name || otherUser.username}
                      </p>
                      {chat.last_message && (
                        <p className="text-xs text-muted-foreground truncate">
                          {chat.last_message.content}
                        </p>
                      )}
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

  if (!isOpen) return null

  const currentChatUser = getCurrentChatUser()

  return (
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
            <Avatar className="h-8 w-8">
              <AvatarImage src={currentChatUser.avatar_url || ""} />
              <AvatarFallback>
                {currentChatUser.display_name?.[0] || currentChatUser.username?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">
                {currentChatUser.display_name || currentChatUser.username}
              </p>
              <p className="text-xs text-muted-foreground">
                @{currentChatUser.username}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
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
              <Avatar className="h-8 w-8">
                <AvatarImage src={currentChatUser.avatar_url || ""} />
                <AvatarFallback>
                  {currentChatUser.display_name?.[0] || currentChatUser.username?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {currentChatUser.display_name || currentChatUser.username}
                </p>
                <p className="text-xs text-muted-foreground">
                  @{currentChatUser.username}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Сообщения */}
          <ScrollArea className="flex-1 p-3 sm:p-4">
            <div className="space-y-3 sm:space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex gap-2 sm:gap-3 group ${
                      message.sender_id === currentUser.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.sender_id !== currentUser.id && (
                      <Avatar className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0">
                        <AvatarImage src={currentChatUser.avatar_url || ""} />
                        <AvatarFallback className="text-xs">
                          {currentChatUser.display_name?.[0] || currentChatUser.username?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className={`max-w-[85%] sm:max-w-[70%] ${message.sender_id === currentUser.id ? 'order-first' : ''}`}>
                      <div
                        className={`rounded-lg p-3 text-sm sm:text-base ${
                          message.sender_id === currentUser.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="break-words">{message.content}</p>
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
                    
                    {/* Кнопка удаления */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 sm:h-6 sm:w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      onClick={() => deleteMessage(message.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Ввод сообщения */}
          <div className="p-3 sm:p-4 border-t border-border">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1"
                disabled={isSending}
              />
              <Button 
                onClick={sendMessage} 
                disabled={!newMessage.trim() || isSending}
                size="sm"
                className="sm:px-3"
              >
                {isSending ? "Sending..." : <Send className="h-4 w-4" />}
              </Button>
            </div>

            {/* Эмодзи */}
            <div className="flex gap-1 mt-2 flex-wrap">
              {EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  className="h-7 w-7 sm:h-8 sm:w-8 text-lg hover:bg-accent rounded transition-colors flex items-center justify-center"
                  onClick={() => {
                    if (messages.length > 0) {
                      addReaction(messages[messages.length - 1].id, emoji)
                    }
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
