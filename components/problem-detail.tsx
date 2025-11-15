const handleApplyAsCofounder = async () => {
  if (!userId) {
    router.push("/auth/login")
    return
  }

  if (!contactInfo.trim()) {
    toast({
      title: "Contact info required",
      description: "Please provide your contact information",
      variant: "destructive",
    })
    return
  }

  setIsSubmitting(true)
  const supabase = createClient()

  try {
    console.log('Starting simple insert...')
    
    // Упрощенный запрос без сложного select
    const { data, error } = await supabase
      .from("cofounder_applications")
      .insert({
        problem_id: problem.id,
        user_id: userId,
        contact_info: contactInfo.trim(),
        message: message.trim() || null,
      })
      .select() // Простой select без join
      .single()

    console.log('Simple insert result:', { data, error })

    if (error) {
      console.error("Insert error:", error)
      throw error
    }

    if (data) {
      // После успешной вставки, получим полные данные с профилем
      const { data: fullData, error: fetchError } = await supabase
        .from("cofounder_applications")
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq("id", data.id)
        .single()

      if (!fetchError && fullData) {
        setCurrentUserApplication(fullData)
        setApplications(prev => [fullData, ...prev])
      } else {
        // Если не получилось получить полные данные, используем базовые
        setCurrentUserApplication(data)
        setApplications(prev => [data, ...prev])
      }

      setShowApplicationForm(false)
      setContactInfo("")
      setMessage("")
      
      toast({
        title: "Application sent!",
        description: "Your cofounder application has been submitted",
      })
    }
  } catch (error: any) {
    console.error("Full error:", error)
    toast({
      title: "Network Error",
      description: "Please check your connection and try again",
      variant: "destructive",
    })
  } finally {
    setIsSubmitting(false)
  }
}
