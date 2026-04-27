"use client"
import { useRecording } from "@/hooks/useRecording"
import { useEffect } from "react"
import { Mic } from "lucide-react"

export default function Page() {
  const { isRecording, transcript, recordingTime, audioLevel, startRecording, stopRecording } = useRecording()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.code === "KeyV" && !e.repeat) {
        ;(window as any).__v_key_down = true
        startRecording()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "KeyV") {
        ;(window as any).__v_key_down = false
        stopRecording()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [startRecording, stopRecording])

  return (
    <div className="flex flex-col items-center justify-center min-h-svh p-6 transition-colors duration-500">
      {!isRecording && !transcript && (
        <div className="text-center space-y-4 animate-in fade-in zoom-in duration-500">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Mic className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Voice Assistant</h1>
          <p className="text-muted-foreground">
            Hold <kbd className="px-2 py-0.5 bg-muted rounded border text-xs font-bold">V</kbd> to talk
          </p>
        </div>
      )}

      {!isRecording && transcript && (
        <div className="w-full max-w-xl animate-in slide-in-from-bottom-4 duration-500">
          <div className="p-6 rounded-xl border bg-card shadow-sm">
            <p className="text-sm font-medium text-muted-foreground mb-2">Transcript</p>
            <p className="text-xl font-medium">"{transcript}"</p>
          </div>
          <p className="text-center mt-6 text-sm text-muted-foreground">
            Hold <kbd className="px-1.5 py-0.5 bg-muted rounded border text-[10px] font-bold">V</kbd> to record again
          </p>
        </div>
      )}

      {isRecording && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-popover border rounded-3xl p-6 shadow-lg flex flex-col items-center gap-4">
            <div className="flex items-center justify-center gap-1 h-12 w-full">
              {[...Array(15)].map((_, i) => (
                <div 
                  key={i}
                  className="w-1.5 bg-primary rounded-full transition-all duration-75"
                  style={{ 
                    height: `${Math.min(100, Math.max(10, (audioLevel * 1.5) * (0.4 + Math.random() * 0.6) * (0.5 + Math.abs(Math.sin(i * 0.4)) * 1.5)))}%`
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-3 w-full border-t pt-4">
              <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
              <div className="flex-1">
                <p className="text-sm font-semibold italic">Listening...</p>
                <p className="text-xs text-muted-foreground">{recordingTime}s elapsed</p>
              </div>
              <Mic className="h-4 w-4 text-muted-foreground animate-pulse" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}