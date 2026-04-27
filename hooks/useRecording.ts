"use client"
import { useRef, useState, useEffect, useCallback } from "react"

export const useRecording = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const hasSpokenRef = useRef(false)

  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunks = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  
  const isTransitioning = useRef(false)
  const isHardwareReady = useRef(false)

  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length
    
    // threshold for speech detection
    if (average > 5) hasSpokenRef.current = true
    
    setAudioLevel(average)
    animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
  }, [])

  const startRecording = async () => {
    if (isRecording || isTransitioning.current) return
    
    // immediate state update for snappy ui
    setIsRecording(true)
    isTransitioning.current = true
    isHardwareReady.current = false
    hasSpokenRef.current = false
    setRecordingTime(0)
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        audioContextRef.current = new AudioContextClass()
      }
      
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume()
      }

      const source = audioContextRef.current.createMediaStreamSource(stream)
      const analyser = audioContextRef.current.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser
      
      updateAudioLevel()

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/mp4"

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorder.current = recorder
      chunks.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data)
      }

      recorder.onstop = async () => {
        if (chunks.current.length === 0) return
        if (!hasSpokenRef.current) return

        const audioBlob = new Blob(chunks.current, { type: mimeType })
        if (audioBlob.size > 100) await sendToGroq(audioBlob)
      }

      startTimeRef.current = Date.now()
      timerRef.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)

      recorder.start(100)
      isHardwareReady.current = true

      // check if key was released while hardware was starting
      if (!(window as any).__v_key_down) stopRecording()

    } catch (err) {
      console.error("mic error:", err)
      setIsRecording(false)
    } finally {
      isTransitioning.current = false
    }
  }

  const stopRecording = useCallback(() => {
    if (!isRecording) return

    // if hardware is still booting, just toggle state and wait for startRecording finish
    if (!isHardwareReady.current) {
      setIsRecording(false)
      return
    }

    if (isTransitioning.current) return
    isTransitioning.current = true

    const duration = Date.now() - startTimeRef.current
    if (duration < 400) {
      chunks.current = [] 
      cleanup()
      return
    }

    try {
      if (mediaRecorder.current?.state !== "inactive") {
        mediaRecorder.current?.requestData()
        setTimeout(() => cleanup(), 50)
      } else {
        cleanup()
      }
    } catch (e) {
      cleanup()
    }
  }, [isRecording])

  const cleanup = () => {
    mediaRecorder.current?.stop()
    streamRef.current?.getTracks().forEach((track) => track.stop())
    
    if (timerRef.current) clearInterval(timerRef.current)
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    
    setIsRecording(false)
    setAudioLevel(0)
    setTimeout(() => { 
      isTransitioning.current = false 
      isHardwareReady.current = false
    }, 100)
  }

  const sendToGroq = async (blob: Blob) => {
    try {
      const formData = new FormData()
      formData.append("file", blob, "audio.webm")
      const response = await fetch("/api/transcribe", { method: "POST", body: formData })
      const data = await response.json()
      if (data.text) setTranscript(data.text)
    } catch (err) {
      console.error("transcription failed:", err)
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioContextRef.current) audioContextRef.current.close()
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  return { isRecording, transcript, recordingTime, audioLevel, stopRecording, startRecording }
}