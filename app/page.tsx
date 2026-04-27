"use client"
import { Button } from "@/components/ui/button"
import { useRecording } from "@/hooks/useRecording"
import { useEffect } from "react"
import { Mic, MicOff } from "lucide-react"

export default function Page() {
  const { isRecording, transcript, startRecording, stopRecording } = useRecording()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Guard against typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      // 2. Only trigger on 'V' and ignore the browser's "auto-repeat"
      if (e.code === "KeyV" && !e.repeat) {
        startRecording()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "KeyV") {
        stopRecording()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [startRecording, stopRecording]) // Hooks included in deps for safety

  return (
    <div className="flex flex-col items-center justify-center min-h-svh p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Voice Dashboard</h1>
        <p className="text-muted-foreground">
          Press and hold <kbd className="px-2 py-1 bg-muted rounded border shadow-sm text-xs font-bold">V</kbd> to talk.
        </p>
      </div>

      {/* Visual Feedback Area */}
      <div className="relative flex items-center justify-center">
        {/* Glow effect when recording */}
        {isRecording && (
          <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
        )}
        
        <Button
          size="lg"
          variant={isRecording ? "destructive" : "default"}
          className="relative h-20 w-20 rounded-full shadow-xl transition-all active:scale-95"
          // Mouse support for non-keyboard users
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
        >
          {isRecording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
        </Button>
      </div>

      {/* Transcript Results */}
      <div className="w-full max-w-md h-32 p-4 rounded-xl border bg-card text-card-foreground shadow-sm overflow-y-auto">
        {isRecording ? (
          <p className="text-sm text-primary animate-pulse italic">Listening...</p>
        ) : transcript ? (
          <p className="text-lg font-medium leading-tight">"{transcript}"</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">Your transcript will appear here...</p>
        )}
      </div>
    </div>
  )
}