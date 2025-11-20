"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Share2, Download, RotateCcw } from "lucide-react"

// Types
interface CountryData {
  name: string
  education: string
  economy: string
  population: string
  socialNeeds: string
  score: number
}

interface AnswerValues {
  [key: string]: { [key: string]: number }
}

interface UserAnswers {
  country?: number
  education?: string
  motivation?: string
  networks?: string
  industry?: string
}

interface FactorScores {
  country: number
  education: number
  motivation: number
  networks: number
  industry: number
}

interface Result {
  totalScore: number
  factorScores: FactorScores
  rawPercent: {
    country: number
    education: number
    motivation: number
    networks: number
    industry: number
  }
}

// Data
const countryData: { [key: string]: CountryData } = {
  'india': { name: 'India', education: 'High', economy: 'Medium', population: '>30M', socialNeeds: 'High', score: 3 },
  'israel': { name: 'Israel', education: 'High', economy: 'High', population: '<30M', socialNeeds: 'Medium', score: 3 },
  'canada': { name: 'Canada', education: 'High', economy: 'High', population: '>30M', socialNeeds: 'Low', score: 3 },
  'uk': { name: 'UK', education: 'High', economy: 'High', population: '>30M', socialNeeds: 'Low', score: 3 },
  'china': { name: 'China', education: 'High', economy: 'Medium', population: '>30M', socialNeeds: 'Medium', score: 3 },
  'germany': { name: 'Germany', education: 'High', economy: 'High', population: '>30M', socialNeeds: 'Low', score: 3 },
  'france': { name: 'France', education: 'High', economy: 'High', population: '>30M', socialNeeds: 'Low', score: 3 },
  'russia': { name: 'Russia', education: 'High', economy: 'High', population: '>30M', socialNeeds: 'Medium', score: 3 },
  'taiwan': { name: 'Taiwan', education: 'High', economy: 'High', population: '<30M', socialNeeds: 'Low', score: 2 },
  'ukraine': { name: 'Ukraine', education: 'Medium', economy: 'Medium', population: '>30M', socialNeeds: 'High', score: 2 },
  'usa': { name: 'USA', education: 'High', economy: 'High', population: '>30M', socialNeeds: 'Low', score: 3 },
  'other': { name: 'Other', education: 'Medium', economy: 'Medium', population: '<30M', socialNeeds: 'Medium', score: 1 }
}

const factorWeights = { country: 40, education: 20, motivation: 15, networks: 15, industry: 10 }

const answerValues: AnswerValues = {
  education: { phd: 100, masters: 85, bachelors: 70, college: 50, school: 30 },
  motivation: { 'solve-problem': 100, impact: 90, freedom: 75, financial: 60, other: 50 },
  networks: { extensive: 100, good: 80, moderate: 60, limited: 40, minimal: 20 },
  industry: { 'ai-ml': 100, fintech: 90, healthtech: 85, saas: 80, cleantech: 75, edtech: 70, ecommerce: 65, other: 50 }
}

export function StartupTest() {
  const [currentQuestion, setCurrentQuestion] = useState(1)
  const [userAnswers, setUserAnswers] = useState<UserAnswers>({})
  const [result, setResult] = useState<Result | null>(null)
  const [selectedCountry, setSelectedCountry] = useState("")

  const totalQuestions = 5

  const updateProgress = () => {
    return ((currentQuestion - 1) / totalQuestions) * 100
  }

  const handleCountrySelect = (countryCode: string) => {
    setSelectedCountry(countryCode)
    if (countryData[countryCode]) {
      setUserAnswers(prev => ({ ...prev, country: countryData[countryCode].score }))
    }
  }

  const handleOptionSelect = (field: keyof UserAnswers, value: string) => {
    setUserAnswers(prev => ({ ...prev, [field]: value }))
  }

  const calculateResult = (): Result => {
    let totalScore = 0
    const factorScores: FactorScores = { country: 0, education: 0, motivation: 0, networks: 0, industry: 0 }
    const rawPercent = { country: 0, education: 0, motivation: 0, networks: 0, industry: 0 }

    // Country
    const countryRaw = userAnswers.country || 0
    const countryPct = Math.round((countryRaw / 3) * 100)
    const countryWeighted = (countryPct / 100) * factorWeights.country
    factorScores.country = Math.round(countryWeighted)
    rawPercent.country = countryPct
    totalScore += countryWeighted

    // Education
    let eduPct = 0
    if (userAnswers.education && answerValues.education[userAnswers.education] !== undefined) {
      eduPct = answerValues.education[userAnswers.education]
    }
    const eduWeighted = (eduPct / 100) * factorWeights.education
    factorScores.education = Math.round(eduWeighted)
    rawPercent.education = eduPct
    totalScore += eduWeighted

    // Motivation
    let motPct = 0
    if (userAnswers.motivation && answerValues.motivation[userAnswers.motivation] !== undefined) {
      motPct = answerValues.motivation[userAnswers.motivation]
    }
    const motWeighted = (motPct / 100) * factorWeights.motivation
    factorScores.motivation = Math.round(motWeighted)
    rawPercent.motivation = motPct
    totalScore += motWeighted

    // Networks
    let netPct = 0
    if (userAnswers.networks && answerValues.networks[userAnswers.networks] !== undefined) {
      netPct = answerValues.networks[userAnswers.networks]
    }
    const netWeighted = (netPct / 100) * factorWeights.networks
    factorScores.networks = Math.round(netWeighted)
    rawPercent.networks = netPct
    totalScore += netWeighted

    // Industry
    let indPct = 0
    if (userAnswers.industry && answerValues.industry[userAnswers.industry] !== undefined) {
      indPct = answerValues.industry[userAnswers.industry]
    }
    const indWeighted = (indPct / 100) * factorWeights.industry
    factorScores.industry = Math.round(indWeighted)
    rawPercent.industry = indPct
    totalScore += indWeighted

    const totalRounded = Math.min(Math.round(totalScore), 100)

    return { totalScore: totalRounded, factorScores, rawPercent }
  }

  const detectWeaknesses = (raw: Result['rawPercent']) => {
    const weaknesses: { key: string; reason: string }[] = []
    const threshold = 60

    if (raw.country < threshold) {
      weaknesses.push({
        key: 'Country of Origin',
        reason: `Country score ${raw.country}% — your region has increased barriers (access to capital/infrastructure).`
      })
    }

    if (raw.education < threshold) {
      weaknesses.push({
        key: 'Education Level',
        reason: `Your current education level (${raw.education}%) may limit technical expertise or investor trust. Consider courses/master's degree/team with strong tech lead.`
      })
    }

    if (raw.motivation < threshold) {
      weaknesses.push({
        key: 'Motivation',
        reason: `Motivation ${raw.motivation}%. Strong motivation (mission/problem-solving) helps withstand years of uncertainty.`
      })
    }

    if (raw.networks < threshold) {
      weaknesses.push({
        key: 'Professional Networks',
        reason: `Contacts rated at ${raw.networks}%. Network is key to early fundraising and mentoring. Work on building connections: meetups, accelerators, LinkedIn.`
      })
    }

    if (raw.industry < threshold) {
      weaknesses.push({
        key: 'Startup Industry',
        reason: `The chosen field has relative complexity/competition (${raw.industry}%). Consider niche or strong differentiated offering.`
      })
    }

    if (weaknesses.length === 0) {
      weaknesses.push({
        key: 'Strong Indicators',
        reason: 'You have no clearly expressed weaknesses in basic factors — continue to build network and focus on product.'
      })
    }

    return weaknesses
  }

  const handleNext = () => {
    if (currentQuestion < totalQuestions) {
      setCurrentQuestion(prev => prev + 1)
    } else {
      const calculatedResult = calculateResult()
      setResult(calculatedResult)
    }
  }

  const handlePrev = () => {
    if (currentQuestion > 1) {
      setCurrentQuestion(prev => prev - 1)
    }
  }

  const handleRestart = () => {
    setCurrentQuestion(1)
    setUserAnswers({})
    setSelectedCountry("")
    setResult(null)
  }

  const handleShare = () => {
    const text = `My startup success potential according to StartOrigin: ${result?.totalScore}%`
    const url = window.location.href
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
    window.open(shareUrl, '_blank', 'noopener')
  }

  const handleDownload = () => {
    if (!result) return
    
    const data = {
      answers: userAnswers,
      result,
      generatedAt: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'startorigin-result.json'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const getResultMessage = (score: number) => {
    if (score >= 80) return 'Excellent chances! Your profile is close to successful founders.'
    if (score >= 60) return 'Good prospects. There is something to work on.'
    if (score >= 40) return 'Average potential. It is recommended to strengthen key areas.'
    return 'Serious work required — we recommend starting with education and network development.'
  }

  if (result) {
    const weaknesses = detectWeaknesses(result.rawPercent)
    
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            <div>
              <p className="text-muted-foreground mb-2">Your Success Potential</p>
              <div className="text-6xl font-bold text-primary mb-2">{result.totalScore}%</div>
              <p className="text-muted-foreground">{getResultMessage(result.totalScore)}</p>
            </div>

            <div className="space-y-3">
              {weaknesses.map((weakness, index) => (
                <div key={index} className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-left">
                  <strong className="text-destructive">{weakness.key}:</strong> {weakness.reason}
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button onClick={handleShare} variant="outline" className="gap-2">
                <Share2 className="h-4 w-4" />
                Share on X
              </Button>
              <Button onClick={handleDownload} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Download JSON
              </Button>
              <Button onClick={handleRestart} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Start Over
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Startup Potential Assessment</CardTitle>
          <div className="text-sm text-muted-foreground">
            Question {currentQuestion} of {totalQuestions}
          </div>
        </div>
        <Progress value={updateProgress()} className="h-2" />
      </CardHeader>
      <CardContent>
        {/* Question 1: Country */}
        {currentQuestion === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Which country are you from?</h3>
            <select
              value={selectedCountry}
              onChange={(e) => handleCountrySelect(e.target.value)}
              className="w-full p-3 border rounded-lg"
            >
              <option value="">Select a country</option>
              {Object.entries(countryData).map(([code, data]) => (
                <option key={code} value={code}>{data.name}</option>
              ))}
            </select>
            
            {selectedCountry && countryData[selectedCountry] && (
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <h4 className="font-semibold mb-2">Country Information</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Education Quality: <strong>{countryData[selectedCountry].education}</strong></div>
                  <div>Economy: <strong>{countryData[selectedCountry].economy}</strong></div>
                  <div>Population: <strong>{countryData[selectedCountry].population}</strong></div>
                  <div>Social Needs: <strong>{countryData[selectedCountry].socialNeeds}</strong></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Question 2: Education */}
        {currentQuestion === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">What is your education level?</h3>
            <div className="space-y-2">
              {[
                { value: 'phd', label: 'PhD' },
                { value: 'masters', label: 'Master\'s Degree' },
                { value: 'bachelors', label: 'Bachelor\'s Degree' },
                { value: 'college', label: 'College/Technical School' },
                { value: 'school', label: 'High School' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleOptionSelect('education', option.value)}
                  className={`w-full p-4 border rounded-lg text-left transition-all ${
                    userAnswers.education === option.value 
                      ? 'border-primary bg-primary/10' 
                      : 'hover:border-primary/50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Question 3: Motivation */}
        {currentQuestion === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">What is your primary motivation?</h3>
            <div className="space-y-2">
              {[
                { value: 'solve-problem', label: 'Solving important social or technological problem' },
                { value: 'financial', label: 'Financial independence and wealth' },
                { value: 'freedom', label: 'Freedom and independence' },
                { value: 'impact', label: 'Creating meaningful impact' },
                { value: 'other', label: 'Other' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleOptionSelect('motivation', option.value)}
                  className={`w-full p-4 border rounded-lg text-left transition-all ${
                    userAnswers.motivation === option.value 
                      ? 'border-primary bg-primary/10' 
                      : 'hover:border-primary/50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Question 4: Networks */}
        {currentQuestion === 4 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">How developed are your professional networks?</h3>
            <div className="space-y-2">
              {[
                { value: 'extensive', label: 'Very developed — investors, mentors, and experts' },
                { value: 'good', label: 'Well developed — professional connections' },
                { value: 'moderate', label: 'Moderate — work colleagues' },
                { value: 'limited', label: 'Limited — small circle' },
                { value: 'minimal', label: 'Minimal — just starting' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleOptionSelect('networks', option.value)}
                  className={`w-full p-4 border rounded-lg text-left transition-all ${
                    userAnswers.networks === option.value 
                      ? 'border-primary bg-primary/10' 
                      : 'hover:border-primary/50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Question 5: Industry */}
        {currentQuestion === 5 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">What industry is your startup in?</h3>
            <div className="space-y-2">
              {[
                { value: 'ai-ml', label: 'Artificial Intelligence and ML' },
                { value: 'fintech', label: 'FinTech' },
                { value: 'healthtech', label: 'HealthTech / Bio' },
                { value: 'edtech', label: 'EdTech' },
                { value: 'saas', label: 'SaaS' },
                { value: 'ecommerce', label: 'E-commerce' },
                { value: 'cleantech', label: 'CleanTech' },
                { value: 'other', label: 'Other industry' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleOptionSelect('industry', option.value)}
                  className={`w-full p-4 border rounded-lg text-left transition-all ${
                    userAnswers.industry === option.value 
                      ? 'border-primary bg-primary/10' 
                      : 'hover:border-primary/50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Button
            onClick={handlePrev}
            variant="outline"
            disabled={currentQuestion === 1}
          >
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={
              (currentQuestion === 1 && !selectedCountry) ||
              (currentQuestion === 2 && !userAnswers.education) ||
              (currentQuestion === 3 && !userAnswers.motivation) ||
              (currentQuestion === 4 && !userAnswers.networks) ||
              (currentQuestion === 5 && !userAnswers.industry)
            }
          >
            {currentQuestion === totalQuestions ? 'Calculate' : 'Next'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
