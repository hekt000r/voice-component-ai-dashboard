"use client"
import { useRef, useState } from "react"

export const useRecording = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState("")

  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunks = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  
  // lock to prevent spamming
  const isTransitioning = useRef(false)

  const startRecording = async () => {
    // if we are already recording or in the middle of stopping, abort.
    if (isRecording || isTransitioning.current) return
    
    try {
      isTransitioning.current = true
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

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
        // Final safety check: don't upload if chunks were wiped during a cancel
        if (chunks.current.length === 0) return
        
        const audioBlob = new Blob(chunks.current, { type: mimeType })
        if (audioBlob.size > 100) { // Ensure blob actually has data
          await sendToGroq(audioBlob)
        }
      }

      startTimeRef.current = Date.now()
      recorder.start(100)
      setIsRecording(true)
    } catch (err) {
      console.error("Mic Access Error:", err)
    } finally {
      isTransitioning.current = false
    }
  }

  const stopRecording = () => {
    // not recording/ stopping
    if (!mediaRecorder.current || !isRecording || isTransitioning.current) return

    isTransitioning.current = true
    const duration = Date.now() - startTimeRef.current

    if (duration < 400) {
      console.warn("Recording too short, cancelling...")
      chunks.current = [] 
      cleanup()
      return
    }

    // stop and flush data
    try {
      if (mediaRecorder.current.state !== "inactive") {
        mediaRecorder.current.requestData()
        setTimeout(() => {
          cleanup()
        }, 50)
      } else {
        cleanup()
      }
    } catch (e) {
      cleanup()
    }
  }

  const cleanup = () => {
    mediaRecorder.current?.stop()
    streamRef.current?.getTracks().forEach((track) => track.stop())
    setIsRecording(false)
    setTimeout(() => { isTransitioning.current = false }, 100)
  }

  const sendToGroq = async (blob: Blob) => {
    try {
      const formData = new FormData()
      formData.append("file", blob, "audio.webm")

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()
      if (data.text) setTranscript(data.text)
    } catch (err) {
      console.error("Transcription failed:", err)
    }
  }

  return { isRecording, transcript, stopRecording, startRecording }
}