// components/chat-modal.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { X, Search, Send, Smile, Trash2, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()

  // Авто-скролл к новым сообщениям
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
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
        (payload) => {
          const newMessage = payload.new as Message
          // Добавляем пустой массив реакций если его нет
          if (!newMessage.reactions) {
            newMessage.reactions = []
          }
          setMessages(prev => [...prev, newMessage])
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
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=in.(${messages.map(m => m.id).join(',')})`
        },
        (payload) => {
          const newReaction = payload.new as Reaction
          setMessages(prev => prev.map(msg => 
            msg.id === newReaction.message_id 
              ? { 
                  ...msg, 
                  reactions: [...(msg.reactions || []), newReaction] 
                }
              : msg
          ))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeChat, messages])

  const loadChats = async () => {
    try {
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
            ),
            messages (
              id,
              content,
              sender_id,
              created_at,
              updated_at,
              deleted_by
            )
          )
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading chats:', error)
        return
      }

      const formattedChats: Chat[] = (chatParticipants || []).map((cp: any) => {
        const chat = cp.chats
        const otherParticipant = chat.participants
          .find((p: any) => p.user.id !== currentUser.id)?.user

        const sortedMessages = chat.messages?.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ) || []

        return {
          id: chat.id,
          participants: chat.participants.map((p: any) => p.user),
          last_message: sortedMessages[0],
          unread_count: 0
        }
      })

      setChats(formattedChats)

      // Автоматически открываем чат с получателем, если он существует
      const existingChat = formattedChats.find(chat =>
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
    }
  }

  const createOrGetChat = async () => {
    try {
      // Ищем существующий чат с этим пользователем
      const { data: existingChats, error: findError } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', currentUser.id)

      if (findError) throw findError

      if (existingChats && existingChats.length > 0) {
        const chatIds = existingChats.map(cp => cp.chat_id)
        
        const { data: recipientChats, error: recipientError } = await supabase
          .from('chat_participants')
          .select('chat_id')
          .eq('user_id', recipientUser.id)
          .in('chat_id', chatIds)

        if (!recipientError && recipientChats && recipientChats.length > 0) {
          setActiveChat(recipientChats[0].chat_id)
          loadMessages(recipientChats[0].chat_id)
          return
        }
      }

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
      setChats(prev => [...prev, {
        id: newChat.id,
        participants: [currentUser, recipientUser],
        last_message: undefined,
        unread_count: 0
      }])
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
      const { error } = await supabase
        .from('messages')
        .insert({
          chat_id: activeChat,
          sender_id: currentUser.id,
          content: newMessage.trim()
        })

      if (error) {
        console.error('Error sending message:', error)
        alert('Failed to send message')
        return
      }

      setNewMessage("")
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
        .neq('id', currentUser.id) // Исключаем текущего пользователя
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
      // Ищем существующий чат
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
      setChats(prev => [...prev, {
        id: newChat.id,
        participants: [currentUser, user],
        last_message: undefined,
        unread_count: 0
      }])
      setSearchResults([])
      setSearchQuery("")
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-4xl h-[600px] flex">
        {/* Сайдбар с чатами */}
        <div className="w-80 border-r border-border flex flex-col">
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
              {chats.map(chat => {
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
                      {chat.unread_count > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {chat.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Основная область чата */}
        <div className="flex-1 flex flex-col">
          {/* Заголовок чата */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={recipientUser.avatar_url || ""} />
                <AvatarFallback>
                  {recipientUser.display_name?.[0] || recipientUser.username?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {recipientUser.display_name || recipientUser.username}
                </p>
                <p className="text-xs text-muted-foreground">
                  @{recipientUser.username}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Сообщения */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex gap-3 group ${
                    message.sender_id === currentUser.id ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.sender_id !== currentUser.id && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={recipientUser.avatar_url || ""} />
                      <AvatarFallback>
                        {recipientUser.display_name?.[0] || recipientUser.username?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[70%] ${message.sender_id === currentUser.id ? 'order-first' : ''}`}>
                    <div
                      className={`rounded-lg p-3 ${
                        message.sender_id === currentUser.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatTime(message.created_at)}
                      </span>
                      
                      {/* Реакции */}
                      {message.reactions && message.reactions.length > 0 && (
                        <div className="flex gap-1">
                          {Object.entries(
                            message.reactions.reduce((acc: any, reaction) => {
                              acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1
                              return acc
                            }, {})
                          ).map(([emoji, count]) => (
                            <Badge
                              key={emoji}
                              variant="secondary"
                              className="text-xs cursor-pointer hover:bg-accent"
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
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteMessage(message.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Ввод сообщения */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1"
                disabled={isSending}
              />
              <Button onClick={sendMessage} disabled={!newMessage.trim() || isSending}>
                {isSending ? "Sending..." : <Send className="h-4 w-4" />}
              </Button>
            </div>

            {/* Эмодзи */}
            <div className="flex gap-1 mt-2">
              {EMOJIS.map(emoji => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-lg hover:bg-accent"
                  onClick={() => {
                    if (messages.length > 0) {
                      addReaction(messages[messages.length - 1].id, emoji)
                    }
                  }}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
