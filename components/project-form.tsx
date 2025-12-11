"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { X, Upload, Users, Globe, Mail, Phone, MessageSquare } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

const categories = [
  "technology",
  "healthcare",
  "education",
  "finance",
  "ecommerce",
  "sustainability",
  "entertainment",
  "food_beverage",
  "real_estate",
  "transportation",
  "other"
]

const popularTags = [
  "AI",
  "SaaS",
  "Mobile",
  "Web3",
  "Fintech",
  "Edtech",
  "Healthtech",
  "Eco-friendly",
  "B2B",
  "B2C",
  "Marketplace",
  "Social",
  "Enterprise",
  "Consumer",
  "Hardware",
  "Software"
]

interface ProjectFormProps {
  userId: string
}

export function ProjectForm({ userId }: ProjectFormProps) {
  const [title, setTitle] = useState("")
  const [shortDescription, setShortDescription] = useState("")
  const [detailedDescription, setDetailedDescription] = useState("")
  const [category, setCategory] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [customTag, setCustomTag] = useState("")
  const [lookingForCofounder, setLookingForCofounder] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [website, setWebsite] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [telegram, setTelegram] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()
  const { toast } = useToast()

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Logo must be less than 5MB",
          variant: "destructive",
        })
        return
      }

      setLogoFile(file)
      const previewUrl = URL.createObjectURL(file)
      setLogoPreview(previewUrl)
    }
  }

  const removeLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
  }

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags([...tags, tag])
      setCustomTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const formatWebsiteUrl = (url: string) => {
    if (!url) return ""
    // Убираем протоколы если они есть
    url = url.replace(/^https?:\/\//, "")
    // Убираем www. если есть
    url = url.replace(/^www\./, "")
    return url
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()

      // Upload logo if exists
      let logoUrl = null
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop()
        const fileName = `${userId}/${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('project-logos')
          .upload(fileName, logoFile)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('project-logos')
          .getPublicUrl(fileName)
        
        logoUrl = publicUrl
      }

      // Подготавливаем контактные данные
      const contactData = {
        website: website.trim(),
        email: email.trim(),
        phone: phone.trim(),
        telegram: telegram.trim()
      }

      // Создаем объект проекта
      const projectData: any = {
        author_id: userId,
        title,
        short_description: shortDescription,
        detailed_description: detailedDescription,
        category,
        tags,
        logo_url: logoUrl,
        looking_for_cofounder: lookingForCofounder,
        status: "active"
      }

      // Добавляем контактные данные только если они заполнены
      if (contactData.website) projectData.website = contactData.website
      if (contactData.email) projectData.email = contactData.email
      if (contactData.phone) projectData.phone = contactData.phone
      if (contactData.telegram) projectData.telegram = contactData.telegram

      // Create project
      const { error } = await supabase.from("projects").insert(projectData)

      if (error) throw error

      toast({
        title: "Project published!",
        description: "Your project has been shared with the community.",
      })

      router.push("/projects")
      router.refresh()
    } catch (error) {
      console.error("Error creating project:", error)
      toast({
        title: "Error",
        description: "Failed to publish project. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Project Name *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter your project name"
            required
          />
        </div>

        <div>
          <Label htmlFor="shortDescription">Short Description *</Label>
          <Textarea
            id="shortDescription"
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            placeholder="Briefly describe your project (max 200 characters)"
            maxLength={200}
            rows={2}
            required
          />
          <p className="text-xs text-muted-foreground mt-1">
            {shortDescription.length}/200 characters
          </p>
        </div>

        <div>
          <Label htmlFor="detailedDescription">Detailed Description *</Label>
          <Textarea
            id="detailedDescription"
            value={detailedDescription}
            onChange={(e) => setDetailedDescription(e.target.value)}
            placeholder="Describe your project in detail: vision, goals, progress, etc."
            rows={6}
            required
          />
        </div>

        <div>
          <Label htmlFor="category">Category *</Label>
          <Select value={category} onValueChange={setCategory} required>
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Website Field */}
        <div>
          <Label htmlFor="website" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Project Website URL
          </Label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(formatWebsiteUrl(e.target.value))}
                placeholder="example.com"
                type="url"
              />
              {website && (
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                  https://{website}
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Optional. Enter your project website (without https://)
          </p>
        </div>

        {/* Contact Information Section */}
        <div className="space-y-4 pt-4 border-t">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Contact Information (Optional)</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your contact details so people can reach out to you directly
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@example.com"
                type="email"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (123) 456-7890"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="telegram" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Telegram Username
              </Label>
              <Input
                id="telegram"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                placeholder="@username"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Include @ symbol for your Telegram username
              </p>
            </div>
          </div>
        </div>

        <div>
          <Label>Logo</Label>
          <div className="flex items-center gap-4">
            {logoPreview ? (
              <div className="relative">
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="w-24 h-24 rounded-lg object-cover border"
                />
                <button
                  type="button"
                  onClick={removeLogo}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <div className="w-24 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-muted/50">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Upload</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            )}
            <div className="text-sm text-muted-foreground">
              <p>Upload your project logo (optional)</p>
              <p className="text-xs">Max 5MB. PNG, JPG, or SVG.</p>
            </div>
          </div>
        </div>

        <div>
          <Label>Tags (max 5)</Label>
          <div className="flex flex-wrap gap-2 mb-3">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                placeholder="Add custom tag"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag(customTag.trim())
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => addTag(customTag.trim())}
                disabled={!customTag.trim() || tags.length >= 5}
              >
                Add
              </Button>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground mb-2">Popular tags:</p>
              <div className="flex flex-wrap gap-2">
                {popularTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer hover:bg-secondary"
                    onClick={() => tags.length < 5 && addTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            <div>
              <Label htmlFor="cofounder" className="cursor-pointer">
                Looking for a co-founder?
              </Label>
              <p className="text-sm text-muted-foreground">
                Check if you&apos;re open to collaboration
              </p>
            </div>
          </div>
          <Switch
            id="cofounder"
            checked={lookingForCofounder}
            onCheckedChange={setLookingForCofounder}
          />
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Publishing..." : "Publish Project"}
        </Button>
      </div>
    </form>
  )
}
