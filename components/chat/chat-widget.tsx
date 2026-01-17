"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Bot, Send, User, X, Minimize2, Maximize2, MessageCircle, AlertCircle, Copy } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface ChatWidgetProps {
  defaultLanguage?: string;
}

export function ChatWidget({ defaultLanguage = "id" }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [language, setLanguage] = useState(defaultLanguage)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content: getWelcomeMessage(language),
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Update welcome message when language changes
  useEffect(() => {
    if (messages.length === 1 && messages[0].role === "assistant") {
      setMessages([
        {
          id: "1",
          role: "assistant",
          content: getWelcomeMessage(language),
          timestamp: new Date()
        }
      ])
    }
  }, [language])

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])
  
  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          message: input,
          language: language
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
        setError(null)
      } else {
        throw new Error(data.error || "Failed to get response")
      }
    } catch (error) {
      console.error("Chat error:", error)
      setError(getErrorMessage(language))
      
      // Add error message in the current language
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: getErrorResponseMessage(language),
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const clearChat = () => {
    setMessages([
      {
        id: "1",
        role: "assistant",
        content: getWelcomeMessage(language),
        timestamp: new Date()
      }
    ])
  }

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage)
  }

  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(messageId)
      setTimeout(() => setCopiedMessageId(null), 2000) // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    )
  }

  return (
    <Card className={cn(
      "fixed bottom-6 right-6 w-96 shadow-2xl border-2 flex flex-col",
      isMinimized ? "h-16" : "h-[600px]"
    )}>
      <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <CardTitle className="text-lg">AI Assistant</CardTitle>
          <div className="flex items-center gap-1 ml-2">
            <button 
              onClick={() => handleLanguageChange("id")}
              className={`text-xs px-2 py-1 rounded ${language === "id" ? "bg-primary-foreground/20" : "hover:bg-primary-foreground/10"}`}
            >
              ID
            </button>
            <button 
              onClick={() => handleLanguageChange("en")}
              className={`text-xs px-2 py-1 rounded ${language === "en" ? "bg-primary-foreground/20" : "hover:bg-primary-foreground/10"}`}
            >
              EN
            </button>
            <button 
              onClick={() => handleLanguageChange("zh-TW")}
              className={`text-xs px-2 py-1 rounded ${language === "zh-TW" ? "bg-primary-foreground/20" : "hover:bg-primary-foreground/10"}`}
            >
              繁中
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <>
          <CardContent className="flex-1 p-4 overflow-y-auto">
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className="relative group">
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-4 py-3",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      <div className={cn(
                        "text-xs mt-2",
                        message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    {message.role === "assistant" && (
                      <button
                        className="absolute top-1 right-1 text-token-text-secondary hover:bg-token-bg-secondary rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Copy"
                        aria-pressed={copiedMessageId === message.id}
                        onClick={() => handleCopyMessage(message.id, message.content)}
                      >
                        <span className="flex items-center justify-center w-6 h-6">
                          {copiedMessageId === message.id ? (
                            <span className="text-xs">✓</span>
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </span>
                      </button>
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="max-w-[80%] rounded-lg px-4 py-3 bg-muted">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 rounded-full bg-primary/50 animate-bounce" />
                      <div className="h-2 w-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "0.1s" }} />
                      <div className="h-2 w-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "0.2s" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </CardContent>

          <CardFooter className="border-t p-4">
            <div className="flex w-full gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={getPlaceholderText(language)}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !input.trim()}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardFooter>

          <div className="px-4 pb-2">
            <Button
              variant="link"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={clearChat}
            >
              Clear chat
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              {getFooterText(language)}
            </p>
          </div>
        </>
      )}
    </Card>
  )
}

function getWelcomeMessage(language: string): string {
  switch (language) {
    case "en":
      return "Hello! I'm an AI assistant for the Social Forestry Information System. How can I help you?"
    case "zh-TW":
      return "你好！我是社會林業信息系統的 AI 助手。有什麼可以幫助你的嗎？"
    default:
      return "Halo! Saya asisten AI untuk Sistem Informasi Perhutanan Sosial. Ada yang bisa saya bantu?"
  }
}

function getPlaceholderText(language: string): string {
  switch (language) {
    case "en":
      return "Ask about Social Forestry data..."
    case "zh-TW":
      return "詢問關於社會林業數據..."
    default:
      return "Tanyakan tentang data Perhutanan Sosial..."
  }
}

function getFooterText(language: string): string {
  switch (language) {
    case "en":
      return "AI only answers based on Social Forestry Information System data"
    case "zh-TW":
      return "AI 僅根據社會林業信息系統數據回答"
    default:
      return "AI hanya menjawab berdasarkan data Sistem Informasi Perhutanan Sosial"
  }
}

function getErrorMessage(language: string): string {
  switch (language) {
    case "en":
      return "Failed to send message. Please try again."
    case "zh-TW":
      return "發送消息失敗。請重試。"
    default:
      return "Gagal mengirim pesan. Silakan coba lagi."
  }
}

function getErrorResponseMessage(language: string): string {
  switch (language) {
    case "en":
      return "Sorry, an error occurred. Please try again or contact the administrator."
    case "zh-TW":
      return "對不起，發生錯誤。請重試或聯繫管理員。"
    default:
      return "Maaf, terjadi kesalahan. Silakan coba lagi atau hubungi administrator."
  }
}
