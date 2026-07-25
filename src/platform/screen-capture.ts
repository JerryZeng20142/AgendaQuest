const FRAME_WAIT_TIMEOUT_MS = 10_000

function hasFunction(target: object, property: PropertyKey) {
  return typeof Reflect.get(target, property) === "function"
}

export function isScreenCaptureSupported() {
  if (
    typeof navigator === "undefined" ||
    typeof document === "undefined" ||
    typeof HTMLVideoElement === "undefined" ||
    typeof HTMLCanvasElement === "undefined" ||
    typeof CanvasRenderingContext2D === "undefined" ||
    typeof File === "undefined" ||
    typeof navigator.mediaDevices?.getDisplayMedia !== "function" ||
    !hasFunction(HTMLVideoElement.prototype, "play") ||
    !hasFunction(HTMLCanvasElement.prototype, "toBlob")
  ) {
    return false
  }

  const canvas = document.createElement("canvas")
  try {
    const context = canvas.getContext("2d")
    return Boolean(context && hasFunction(context, "drawImage"))
  } catch {
    return false
  } finally {
    canvas.width = 0
    canvas.height = 0
    canvas.remove()
  }
}

function waitForVideoFrame(video: HTMLVideoElement, track: MediaStreamTrack) {
  return new Promise<void>((resolve, reject) => {
    let settled = false

    const events = [
      "loadedmetadata",
      "loadeddata",
      "canplay",
      "playing",
      "resize",
    ] as const

    const cleanup = () => {
      window.clearTimeout(timeoutId)
      events.forEach((eventName) =>
        video.removeEventListener(eventName, handleReady)
      )
      video.removeEventListener("error", handleError)
      track.removeEventListener("ended", handleEnded)
    }

    const finish = (callback: () => void) => {
      if (settled) return
      settled = true
      cleanup()
      callback()
    }

    const handleReady = () => {
      if (
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {
        finish(resolve)
      }
    }

    const handleError = () =>
      finish(() => reject(new Error("屏幕画面读取失败，请重新选择。")))
    const handleEnded = () =>
      finish(() => reject(new Error("屏幕共享已结束，请重新选择。")))
    const timeoutId = window.setTimeout(
      () => finish(() => reject(new Error("屏幕画面读取超时，请重新选择。"))),
      FRAME_WAIT_TIMEOUT_MS
    )

    events.forEach((eventName) =>
      video.addEventListener(eventName, handleReady)
    )
    video.addEventListener("error", handleError, { once: true })
    track.addEventListener("ended", handleEnded, { once: true })

    if (track.readyState === "ended") {
      handleEnded()
      return
    }

    void video.play().then(handleReady, handleError)
    handleReady()
  })
}

function canvasToPng(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error("截图编码失败。"))
      }
    }, "image/png")
  })
}

export async function captureScreenFrame() {
  if (!isScreenCaptureSupported()) {
    throw new Error("当前浏览器不支持截图采集。")
  }

  const video = document.createElement("video")
  const canvas = document.createElement("canvas")
  let stream: MediaStream | undefined

  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    })

    const track = stream.getVideoTracks()[0]
    if (!track) throw new Error("未获取到可用的屏幕画面。")

    video.muted = true
    video.playsInline = true
    video.srcObject = stream
    await waitForVideoFrame(video, track)

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext("2d")
    if (!context) throw new Error("当前浏览器无法处理截图画面。")

    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const blob = await canvasToPng(canvas)

    return new File([blob], `capture-${Date.now()}.png`, { type: "image/png" })
  } finally {
    stream?.getTracks().forEach((item) => item.stop())
    video.pause()
    video.srcObject = null
    video.removeAttribute("src")
    canvas.width = 0
    canvas.height = 0
    video.remove()
    canvas.remove()
  }
}
