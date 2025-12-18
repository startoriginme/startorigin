"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { X, Loader2, Bold, Italic, List, Link as LinkIcon, Heading, Quote, Code, Type, AlertTriangle, Shield, Sparkles } from "lucide-react"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"

type ProblemFormProps = {
  userId: string
  initialData?: {
    id: string
    title: string
    description: string
    category: string | null
    tags: string[] | null
    status: string
    contact: string | null
    looking_for_cofounder: boolean | null
  }
}

const CATEGORIES = [
  "technology",
  "business",
  "healthcare",
  "education",
  "environment",
  "transportation",
  "finance",
  "social",
  "food",
  "energy",
  "housing",
  "entertainment",
  "sports",
  "other",
]

const STATUS_OPTIONS = [
  { value: "open", label: "Open", description: "Problem is open for solutions" },
  { value: "in_progress", label: "In Progress", description: "Problem is being worked on" },
  { value: "solved", label: "Solved", description: "Problem has been solved" },
  { value: "closed", label: "Closed", description: "Problem is closed" },
  { value: "post", label: "Post", description: "General post or discussion" },
  { value: "announcement", label: "Announcement", description: "Important announcement" },
  { value: "project", label: "Project", description: "Project seeking collaborators" },
]

// Gemini API key
const GEMINI_API_KEY = "AIzaSyAe77eTrIa5FRKDgASOkF-D1PG8F0rzoVY"
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent"

// EXTENDED LIST OF FORBIDDEN WORDS AND PATTERNS
const EXTENDED_BAD_PATTERNS = [
  // RUSSIAN PROFANITY AND INSULTS
  /[хx][уy][ёеийяю]/i,
  /[пp][i1!][з3z][дd]/i,
  /[еe][б6][аa@л]/i,
  /[б6][лl][яa@][дdтt]/i,
  /[сc][уy][кk][аa@]/i,
  /[гg][аa][нn][дd][оo0][нn]/i,
  /[пp][i1][дd][оo0][рp]/i,
  /[мm][уy][дd][аa@][кk]/i,
  /[дd][оo0][лl][б6][оo0ё][б6]/i,
  /[шsh][лl][юu][хxh][аa@]/i,
  /[пp][рr][оo0][сc][тt][иi][тt][уy][тt][кk][аa@]/i,
  
  // ENGLISH PROFANITY
  /fuck|shit|bitch|asshole|cunt|dick|pussy|whore|slut|motherfucker|bastard|damn|hell/i,
  
  // ABBREVIATIONS AND EUPHEMISMS (WTF, OMG, etc.)
  /wtf|omg|lol|lmfao|rofl|stfu|gtfo|fk|sh[i1]t|b[i1]tch|@ss|d[i1]ck|n[i1]gga|n[i1]gger/i,
  /(?:what[\s]*the[\s]*fuck|oh[\s]*my[\s]*god|shut[\s]*the[\s]*fuck[\s]*up)/i,
  
  // BYPASS ATTEMPTS (numbers, symbols)
  /[хx][*\-_\.][йy]/i,
  /[пp][*\-_\.][з3z][дd]/i,
  /[еe][*\-_\.][б6]/i,
  /[б6][*\-_\.][лl][яa@]/i,
  /\b[хx][0-9]+[йy]\b/i,
  /\b[пp][0-9]+[з3z][дd]\b/i,
  
  // RACIST AND DISCRIMINATORY EXPRESSIONS
  /nigga|negro|churka|hach|zhid|pindos|black.*(trash|scum)|white.*(trash|scum)/i,
  
  // THREATS AND VIOLENCE
  /\bkill\b|\bmurder\b|\bstab\b|\bexplode\b|\brape\b|\bbeat\b|\bshoot\b/i,
  /\bmurder\b|\bterror\b|\bextremism\b/i,
  
  // EXTREMISM
  /nazi|fascist|islamist|terrorist|radical|extremist/i,
  
  // INAPPROPRIATE TOPICS
  /pedophile|incest|zoophile|necrophile/i,
  
  // "BRAINROT" CONTENT AND MEMES
  /skibidi|gyatt|rizzler|sigma|fanum|tax|🗣️🔥|🔥🔥🔥|💀💀💀/i,
  /ohio|volume|camera|water|camera.*water/i,
  
  // SPAM AND NONSENSE TEXT
  /(.)\1{5,}/, // 5+ repeating characters
  /\b(\w+)\s+\1\s+\1\b/i, // 3+ repeating words
  /[A-ZА-Я]{10,}/, // 10+ uppercase in a row
  /\b[\w\.]+@[\w\.]+\.\w+\b.*\b[\w\.]+@[\w\.]+\.\w+\b/i, // Multiple emails
  /http[s]?:\/\/.*http[s]?:\/\//i, // Multiple links
]

// Check for forbidden patterns
function containsForbiddenPatterns(text: string): { found: boolean; patterns: string[] } {
  const patterns: string[] = []
  
  // Check patterns
  EXTENDED_BAD_PATTERNS.forEach((pattern, index) => {
    if (pattern.test(text)) {
      patterns.push(`Pattern ${index + 1}`)
    }
  })
  
  // Spam check (too many uppercase)
  const words = text.split(/\s+/)
  const upperCaseWords = words.filter(word => /^[A-ZА-ЯЁ]{3,}$/.test(word))
  if (upperCaseWords.length > words.length * 0.3 && words.length > 5) {
    patterns.push("Too many uppercase words (spam)")
  }
  
  // Check for nonsense text (many short repetitions)
  const shortRepeats = text.match(/(\b\w{1,3}\b\s+){5,}/g)
  if (shortRepeats) {
    patterns.push("Repetitive short words")
  }
  
  return {
    found: patterns.length > 0,
    patterns
  }
}

// ENHANCED AI MODERATION
async function moderateWithAI(title: string, description: string): Promise<{ 
  isAllowed: boolean; 
  reason?: string;
  confidence?: number;
  detectedIssues?: string[];
}> {
  try {
    const prompt = `
You are a strict content moderator for a problem-solving platform. Check the following content against ALL these criteria:

1. PROFANITY: Contains profanity, insults, obscenities?
2. ABBREVIATIONS: Contains WTF, OMG, STFU, LMAO and similar abbreviations?
3. FILTER BYPASS: Attempts to bypass filters using symbols (*), numbers, letter replacements?
4. BRAINROT: Contains nonsense text, spam, repetitions, "skibidi toilet", "gyatt" memes?
5. DISCRIMINATION: Contains racism, sexism, xenophobia, homophobia?
6. THREATS: Contains threats, calls to violence, extremism?
7. SCAMS: Contains offers about earnings, investments, sale of prohibited goods?
8. SPAM: Contains advertising, links, contact information, calls to go elsewhere?
9. INAPPROPRIATE TOPICS: Contains pornography, violence, illegal activity?

Return ONLY JSON:
{
  "isAllowed": true/false,
  "reason": "Brief explanation in English if not allowed",
  "confidence": number from 0 to 1 (confidence in decision),
  "detectedIssues": ["list of detected problems"]
}

Content to check:

TITLE: ${title}

DESCRIPTION: ${description}
    `

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1000,
          topP: 0.8,
          topK: 40,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    })

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const result = JSON.parse(jsonMatch[0])
        return {
          isAllowed: result.isAllowed === true,
          reason: result.reason || "Content does not comply with platform rules",
          confidence: result.confidence || 0.5,
          detectedIssues: result.detectedIssues || []
        }
      } catch (e) {
        console.error("Failed to parse Gemini response:", e)
        return {
          isAllowed: false,
          reason: "Error checking content. Please rephrase your text.",
          confidence: 0.3,
          detectedIssues: ["Failed to parse AI response"]
        }
      }
    } else {
      // If no JSON found, look for keywords in response
      const lowerResponse = responseText.toLowerCase()
      const negativeKeywords = ["not allowed", "rejected", "violates", "against", "prohibited"]
      const isNegative = negativeKeywords.some(keyword => lowerResponse.includes(keyword))
      
      return {
        isAllowed: !isNegative,
        reason: isNegative ? "Content failed automatic check" : "Check passed",
        confidence: isNegative ? 0.8 : 0.6,
        detectedIssues: isNegative ? ["AI detected violations"] : []
      }
    }
  } catch (error) {
    console.error("AI moderation failed:", error)
    // If API error, use basic check
    return moderateWithBasic(title, description)
  }
}

// Basic check (fallback)
function moderateWithBasic(title: string, description: string): { 
  isAllowed: boolean; 
  reason?: string;
  confidence?: number;
  detectedIssues?: string[];
} {
  const fullText = `${title} ${description}`
  const patternCheck = containsForbiddenPatterns(fullText)
  
  if (patternCheck.found) {
    return {
      isAllowed: false,
      reason: "Content contains prohibited words or patterns",
      confidence: 0.9,
      detectedIssues: patternCheck.patterns
    }
  }
  
  return {
    isAllowed: true,
    confidence: 0.5,
    detectedIssues: []
  }
}

// Function to add points to user profile
async function addPointsToUser(userId: string, points: number) {
  const supabase = createClient()
  
  try {
    // First, get current points
    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("points")
      .eq("id", userId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error("Error fetching user points:", fetchError)
      return
    }

    const currentPoints = profile?.points || 0
    const newPoints = currentPoints + points

    // Update points in profiles table
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ 
        points: newPoints,
        updated_at: new Date().toISOString()
      })
      .eq("id", userId)

    if (updateError) {
      console.error("Error updating points:", updateError)
      return
    }

    // Create a transaction record
    const { error: transactionError } = await supabase
      .from("point_transactions")
      .insert({
        user_id: userId,
        points: points,
        type: "earned",
        description: "Published a problem",
        created_at: new Date().toISOString()
      })

    if (transactionError) {
      console.error("Error creating transaction record:", transactionError)
    }

    console.log(`Added ${points} points to user ${userId}. Total: ${newPoints}`)
  } catch (error) {
    console.error("Error in addPointsToUser:", error)
  }
}

export function ProblemForm({ userId, initialData }: ProblemFormProps) {
  const [title, setTitle] = useState(initialData?.title || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [category, setCategory] = useState(initialData?.category || "")
  const [contact, setContact] = useState(initialData?.contact || "")
  const [tagInput, setTagInput] = useState("")
  const [tags, setTags] = useState<string[]>(initialData?.tags || [])
  const [status, setStatus] = useState(initialData?.status || "open")
  const [lookingForCofounder, setLookingForCofounder] = useState(initialData?.looking_for_cofounder || false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isModerating, setIsModerating] = useState(false)
  const [moderationWarning, setModerationWarning] = useState<string | null>(null)
  const [moderationDetails, setModerationDetails] = useState<string[]>([])
  const [pointsAwarded, setPointsAwarded] = useState(false)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")
  const [linkText, setLinkText] = useState("")
  
  const router = useRouter()
  const supabase = createClient()

  // PRELIMINARY CHECK ON INPUT
  const checkContent = (text: string) => {
    if (text.length < 5) return
    
    const patternCheck = containsForbiddenPatterns(text)
    if (patternCheck.found) {
      setModerationWarning("Suspicious patterns detected")
      setModerationDetails(patternCheck.patterns.slice(0, 3))
    } else {
      setModerationWarning(null)
      setModerationDetails([])
    }
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim()) && tags.length < 5) {
      setTags([...tags, tagInput.trim()])
      setTagInput("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  // Text formatting functions
  const insertTextAtCursor = (before: string, after: string = "", defaultText: string = "") => {
    const textarea = document.getElementById("description") as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = description.substring(start, end)
    const textToInsert = selectedText || defaultText
    
    const newText = description.substring(0, start) + before + textToInsert + after + description.substring(end)
    setDescription(newText)
    
    // Focus back to textarea
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + before.length + textToInsert.length + after.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 10)
  }

  const formatBold = () => {
    insertTextAtCursor("**", "**", "bold text")
  }

  const formatItalic = () => {
    insertTextAtCursor("*", "*", "italic text")
  }

  const formatHeading = () => {
    insertTextAtCursor("## ", "", "Heading")
  }

  const formatList = () => {
    insertTextAtCursor("- ", "", "List item")
  }

  const formatQuote = () => {
    insertTextAtCursor("> ", "", "Quote")
  }

  const formatCode = () => {
    insertTextAtCursor("```\n", "\n```", "code")
  }

  const formatInlineCode = () => {
    insertTextAtCursor("`", "`", "code")
  }

  const insertLink = () => {
    if (!linkUrl.trim()) {
      setLinkDialogOpen(true)
      return
    }
    
    if (!linkText.trim()) {
      setLinkText(linkUrl)
    }
    
    const markdownLink = `[${linkText.trim()}](${linkUrl.trim()})`
    insertTextAtCursor("", "", markdownLink)
    
    // Reset values
    setLinkUrl("")
    setLinkText("")
    setLinkDialogOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isLoading || isModerating) return
    
    setIsModerating(true)
    setError(null)
    setModerationWarning(null)
    setModerationDetails([])
    setPointsAwarded(false)

    // VALIDATION
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required")
      setIsModerating(false)
      return
    }

    if (title.length < 10) {
      setError("Title must be at least 10 characters")
      setIsModerating(false)
      return
    }

    if (description.length < 50) {
      setError("Description must be at least 50 characters")
      setIsModerating(false)
      return
    }

    // BASIC CHECK FOR FORBIDDEN PATTERNS
    const patternCheck = containsForbiddenPatterns(title + " " + description)
    if (patternCheck.found) {
      setError(`Content contains prohibited elements: ${patternCheck.patterns.join(", ")}`)
      setModerationDetails(patternCheck.patterns)
      setIsModerating(false)
      return
    }

    try {
      // AI MODERATION
      const moderationResult = await moderateWithAI(title.trim(), description.trim())
      
      if (!moderationResult.isAllowed) {
        setError(`Content failed moderation: ${moderationResult.reason}`)
        if (moderationResult.detectedIssues) {
          setModerationDetails(moderationResult.detectedIssues)
        }
        setIsModerating(false)
        return
      }

      if (moderationResult.reason && moderationResult.reason.includes("attention")) {
        setModerationWarning(moderationResult.reason)
      }

      setIsModerating(false)
      setIsLoading(true)

      // PREPARE DATA FOR DATABASE
      const problemData = {
        title: title.trim(),
        description: description.trim(),
        category: category.trim() || null,
        tags: tags.length > 0 ? tags : null,
        status: status || "open",
        contact: contact.trim() || null,
        looking_for_cofounder: lookingForCofounder,
        author_id: userId,
        updated_at: new Date().toISOString(),
        moderation_status: moderationResult.confidence && moderationResult.confidence > 0.8 ? "approved" : "pending_review",
        moderation_confidence: moderationResult.confidence || 0.5,
        moderation_issues: moderationResult.detectedIssues || [],
      }

      let problemId: string | null = null

      if (initialData) {
        // Update existing problem
        const { error: updateError } = await supabase
          .from("problems")
          .update(problemData)
          .eq("id", initialData.id)
          .eq("author_id", userId)

        if (updateError) {
          console.error("Update error:", updateError)
          throw new Error(`Failed to update: ${updateError.message}`)
        }
        
        problemId = initialData.id
        router.push(`/problems/${initialData.id}`)
        router.refresh()
      } else {
        // Create new problem
        const { data, error: insertError } = await supabase
          .from("problems")
          .insert(problemData)
          .select("id")
          .single()

        if (insertError) {
          console.error("Insert error:", insertError)
          throw new Error(`Failed to create: ${insertError.message}`)
        }
        
        if (data?.id) {
          problemId = data.id
          
          // AWARD 10 POINTS FOR PUBLISHING A PROBLEM
          await addPointsToUser(userId, 10)
          setPointsAwarded(true)
          
          router.push(`/problems/${data.id}`)
          router.refresh()
        } else {
          throw new Error("No ID returned after creation")
        }
      }
    } catch (error: unknown) {
      console.error("Form submission error:", error)
      
      if (error instanceof Error) {
        if (error.message.includes("Failed to fetch")) {
          setError("Network error. Please check your connection.")
        } else if (error.message.includes("permission denied")) {
          setError("Permission denied. Please ensure you're logged in.")
        } else if (error.message.includes("status")) {
          setError("Database error. The 'status' field might not exist.")
        } else {
          setError(error.message)
        }
      } else {
        setError("An unexpected error occurred")
      }
      setIsModerating(false)
      setIsLoading(false)
    }
  }

  const getCategoryLabel = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1)
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* STRICT MODERATION BANNER */}
          <Alert className="bg-blue-50 border-blue-200">
            <Shield className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800">Strict moderation enabled</AlertTitle>
            <AlertDescription className="text-blue-700 text-sm">
              All publications go through enhanced AI check. Prohibited: profanity, abbreviations (WTF, OMG), brainrot content, filter bypass, spam.
            </AlertDescription>
          </Alert>

          {moderationWarning && !error && (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Warning</AlertTitle>
              <AlertDescription className="text-amber-700 text-sm">
                {moderationWarning}
                {moderationDetails.length > 0 && (
                  <div className="mt-2">
                    <p className="font-semibold">Detected:</p>
                    <ul className="list-disc list-inside text-xs">
                      {moderationDetails.slice(0, 3).map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {pointsAwarded && (
            <Alert className="bg-green-50 border-green-200">
              <Sparkles className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Points Awarded!</AlertTitle>
              <AlertDescription className="text-green-700 text-sm">
                You earned <span className="font-bold">10 points</span> for publishing a problem! Use them to buy customizations in your profile.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Problem Title *</Label>
            <Input
              id="title"
              placeholder="What problem are you facing?"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                checkContent(e.target.value)
              }}
              required
              maxLength={200}
              disabled={isLoading || isModerating}
              className={moderationWarning ? "border-amber-300" : ""}
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">{title.length}/200 characters</p>
              {title.length < 10 && title.length > 0 && (
                <p className="text-xs text-amber-600">Minimum 10 characters</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Description *</Label>
              <div className="text-xs text-muted-foreground">
                Supports Markdown formatting
              </div>
            </div>
            
            {/* Formatting toolbar */}
            <TooltipProvider>
              <div className="flex items-center gap-1 p-2 border rounded-t-lg bg-muted/50">
                <ToggleGroup type="multiple" className="flex-wrap gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem value="bold" onClick={formatBold} disabled={isLoading || isModerating}>
                        <Bold className="h-4 w-4" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Bold (Ctrl+B)</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem value="italic" onClick={formatItalic} disabled={isLoading || isModerating}>
                        <Italic className="h-4 w-4" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Italic (Ctrl+I)</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem value="heading" onClick={formatHeading} disabled={isLoading || isModerating}>
                        <Heading className="h-4 w-4" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Heading</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem value="list" onClick={formatList} disabled={isLoading || isModerating}>
                        <List className="h-4 w-4" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Bullet List</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem value="quote" onClick={formatQuote} disabled={isLoading || isModerating}>
                        <Quote className="h-4 w-4" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Quote</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem value="code" onClick={formatCode} disabled={isLoading || isModerating}>
                        <Code className="h-4 w-4" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Code Block</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem value="inline-code" onClick={formatInlineCode} disabled={isLoading || isModerating}>
                        <Type className="h-4 w-4" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Inline Code</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                        <DialogTrigger asChild>
                          <ToggleGroupItem value="link" disabled={isLoading || isModerating}>
                            <LinkIcon className="h-4 w-4" />
                          </ToggleGroupItem>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Insert Link</DialogTitle>
                            <DialogDescription>
                              Add a hyperlink to your description
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="link-url">URL *</Label>
                              <Input
                                id="link-url"
                                placeholder="https://example.com"
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="link-text">Text (optional)</Label>
                              <Input
                                id="link-text"
                                placeholder="Link text"
                                value={linkText}
                                onChange={(e) => setLinkText(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={insertLink} disabled={!linkUrl.trim()}>
                              Insert Link
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Insert Link (Ctrl+K)</p>
                    </TooltipContent>
                  </Tooltip>
                </ToggleGroup>
              </div>
            </TooltipProvider>
            
            <Textarea
              id="description"
              placeholder="Describe the problem in detail... You can use Markdown for formatting."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                checkContent(e.target.value)
              }}
              required
              rows={8}
              maxLength={2000}
              disabled={isLoading || isModerating}
              className={`rounded-t-none focus:ring-2 focus:ring-primary ${moderationWarning ? "border-amber-300" : ""}`}
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">{description.length}/2000 characters</p>
              {description.length < 50 && description.length > 0 && (
                <p className="text-xs text-amber-600">Minimum 50 characters</p>
              )}
            </div>
          </div>

          {/* Status field */}
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select 
              value={status} 
              onValueChange={setStatus} 
              disabled={isLoading || isModerating}
              required
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((statusOption) => (
                  <SelectItem 
                    key={statusOption.value} 
                    value={statusOption.value}
                  >
                    <div className="flex flex-col">
                      <span>{statusOption.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {statusOption.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact">Contact</Label>
            <Input
              id="contact"
              placeholder="Telegram, WhatsApp, or Email"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              maxLength={100}
              disabled={isLoading || isModerating}
            />
            <p className="text-xs text-muted-foreground">How can people reach you? (Optional)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory} disabled={isLoading || isModerating}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {getCategoryLabel(cat)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                placeholder="Add a tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddTag()
                  }
                }}
                disabled={isLoading || isModerating}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTag}
                disabled={!tagInput.trim() || tags.length >= 5 || isLoading || isModerating}
              >
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button 
                      type="button" 
                      onClick={() => handleRemoveTag(tag)} 
                      className="ml-1 hover:text-destructive"
                      disabled={isLoading || isModerating}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="cofounder"
              checked={lookingForCofounder}
              onCheckedChange={(checked) => setLookingForCofounder(checked as boolean)}
              disabled={isLoading || isModerating}
            />
            <Label htmlFor="cofounder" className="text-sm font-normal cursor-pointer">
              I'm looking for a cofounder to solve this problem
            </Label>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3">
              <p className="text-sm text-destructive font-medium">Error: {error}</p>
              {moderationDetails.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium">Details:</p>
                  <ul className="text-xs text-muted-foreground list-disc list-inside">
                    {moderationDetails.slice(0, 5).map((detail, idx) => (
                      <li key={idx}>{detail}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading || isModerating} className="flex-1">
              {isModerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Strict content check...
                </>
              ) : isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {initialData ? "Updating..." : "Publishing..."}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {initialData ? "Update Problem" : "Publish Problem (+10 points)"}
                </>
              )}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.back()} 
              disabled={isLoading || isModerating}
            >
              Cancel
            </Button>
          </div>

          <div className="rounded-lg border p-4 bg-muted/30">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Strict Moderation Rules:
            </h3>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>Prohibited profanity and insults</strong> in any language</li>
              <li><strong>Prohibited abbreviations:</strong> WTF, OMG, STFU, LMAO, ROFL and similar</li>
              <li><strong>Prohibited "brainrot" content:</strong> skibidi, gyatt, sigma, Ohio memes</li>
              <li><strong>Prohibited filter bypass attempts:</strong> symbols (*), numbers, letter replacements</li>
              <li><strong>Prohibited spam:</strong> ALL CAPS, repetitions, nonsense text</li>
              <li><strong>Prohibited discrimination:</strong> racism, sexism, xenophobia</li>
              <li><strong>Prohibited threats and calls to violence</strong></li>
              <li>Content is checked by AI and may be manually removed</li>
              <li>Violations lead to account ban</li>
              <li className="font-bold text-green-600">Earn 10 points for every published problem!</li>
            </ul>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
