// components/hero-carousel.tsx
"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface HeroSlide {
  id: number
  title: string
  description: string
  background?: string
  backgroundImage?: string
  textColor: string
  buttonText: string
  buttonVariant: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  link: string
  openInNewTab: boolean
  overlay?: string
}

interface HeroCarouselProps {
  slides: HeroSlide[]
}

export function HeroCarousel({ slides }: HeroCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
  }

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying) return

    const interval = setInterval(() => {
      nextSlide()
    }, 5000) // Change slide every 5 seconds

    return () => clearInterval(interval)
  }, [isAutoPlaying, currentSlide])

  const handleMouseEnter = () => {
    setIsAutoPlaying(false)
  }

  const handleMouseLeave = () => {
    setIsAutoPlaying(true)
  }

  const currentSlideData = slides[currentSlide]

  return (
    <section 
      className="relative overflow-hidden border-b border-border"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background */}
      <div 
        className={`h-[400px] transition-all duration-500 ease-in-out ${currentSlideData.background}`}
        style={{
          backgroundImage: currentSlideData.backgroundImage,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Overlay if specified */}
        {currentSlideData.overlay && (
          <div className={`absolute inset-0 ${currentSlideData.overlay}`} />
        )}
        
        {/* Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`container mx-auto px-4 text-center max-w-2xl z-10 ${currentSlideData.textColor}`}>
            <h1 className="mb-4 text-3xl md:text-4xl font-bold">
              {currentSlideData.title}
            </h1>
            <p className="mb-6 text-lg md:text-xl opacity-90">
              {currentSlideData.description}
            </p>
            {currentSlideData.openInNewTab ? (
              <Link href={currentSlideData.link} target="_blank" rel="noopener noreferrer">
                <Button variant={currentSlideData.buttonVariant} className="gap-2">
                  {currentSlideData.buttonText}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link href={currentSlideData.link}>
                <Button variant={currentSlideData.buttonVariant} className="gap-2">
                  {currentSlideData.buttonText}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="absolute top-1/2 left-4 right-4 flex justify-between -translate-y-1/2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full bg-black/20 hover:bg-black/40 text-white border-none"
          onClick={prevSlide}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full bg-black/20 hover:bg-black/40 text-white border-none"
          onClick={nextSlide}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Dots indicator */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentSlide 
                ? "w-8 bg-white" 
                : "w-2 bg-white/50 hover:bg-white/70"
            }`}
            onClick={() => goToSlide(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
