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
  buttonText: string
  buttonVariant: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  link: string
  openInNewTab: boolean
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
    <div 
      className="relative max-w-2xl mx-auto text-center w-full h-full flex flex-col justify-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Content */}
      <div className="transition-all duration-500 ease-in-out">
        <h1 className="mb-2 text-2xl font-bold text-foreground">
          {currentSlideData.title}
        </h1>
        <p className="mb-4 text-muted-foreground text-sm">
          {currentSlideData.description}
        </p>
        {currentSlideData.openInNewTab ? (
          <Link href={currentSlideData.link} target="_blank" rel="noopener noreferrer">
            <Button variant={currentSlideData.buttonVariant} size="sm" className="gap-1">
              {currentSlideData.buttonText}
              <ChevronRight className="h-3 w-3" />
            </Button>
          </Link>
        ) : (
          <Link href={currentSlideData.link}>
            <Button variant={currentSlideData.buttonVariant} size="sm" className="gap-1">
              {currentSlideData.buttonText}
              <ChevronRight className="h-3 w-3" />
            </Button>
          </Link>
        )}
      </div>

      {/* Navigation buttons */}
      {slides.length > 1 && (
        <>
          <div className="absolute top-1/2 left-0 right-0 flex justify-between -translate-y-1/2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full hover:bg-gray-100"
              onClick={prevSlide}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full hover:bg-gray-100"
              onClick={nextSlide}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>

          {/* Dots indicator */}
          <div className="absolute -bottom-6 left-0 right-0 flex justify-center gap-1">
            {slides.map((_, index) => (
              <button
                key={index}
                className={`h-1 rounded-full transition-all duration-300 ${
                  index === currentSlide 
                    ? "w-6 bg-primary" 
                    : "w-1 bg-gray-300 hover:bg-gray-400"
                }`}
                onClick={() => goToSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
