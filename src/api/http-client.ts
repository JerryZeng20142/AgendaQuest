export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

export class HttpClient {
  private readonly baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  createEventSource(path: string) {
    return new EventSource(`${this.baseUrl}${path}`, { withCredentials: true })
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const isFormData = init.body instanceof FormData
    const hasBody = init.body !== undefined && init.body !== null
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        ...(!hasBody || isFormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...init.headers,
      },
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        message?: string
      } | null
      if (response.status === 401) {
        window.dispatchEvent(new Event("agenda:unauthorized"))
      }
      throw new ApiError(
        payload?.message ?? "请求未能完成，请稍后重试。",
        response.status
      )
    }

    if (response.status === 204) return undefined as T
    return response.json() as Promise<T>
  }
}
