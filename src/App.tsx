import { lazy, Suspense } from "react"
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router"

import { useSession } from "@/auth/session-context"
import { PageError, PageLoading } from "@/components/page-state"
import { AppShell } from "@/layouts/app-shell"
import { LoginPage } from "@/pages/login-page"
import { OnboardingPage } from "@/pages/onboarding-page"
import { apiConfigurationError } from "@/api"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ServerCrash } from "lucide-react"

const InboxPage = lazy(() => import("@/pages/inbox-page"))
const ActionPage = lazy(() => import("@/pages/action-page"))
const WeeklyReportPage = lazy(() => import("@/pages/weekly-report-page"))
const SettingsPage = lazy(() => import("@/pages/settings-page"))

function RequireSession() {
  const { session, isLoading, error, retry } = useSession()

  if (isLoading) return <PageLoading />
  if (error && !session)
    return <PageError message={error.message} onRetry={retry} />
  if (!session) return <Navigate to="/login" replace />
  if (!session.user.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}

function OnboardingRoute() {
  const { session, isLoading, error, retry } = useSession()

  if (isLoading) return <PageLoading />
  if (error && !session)
    return <PageError message={error.message} onRetry={retry} />
  if (!session) return <Navigate to="/login" replace />
  if (session.user.onboardingCompleted) return <Navigate to="/inbox" replace />

  return <OnboardingPage />
}

function LoginRoute() {
  const { session, isLoading, error, retry } = useSession()

  if (isLoading) return <PageLoading />
  if (error && !session)
    return <PageError message={error.message} onRetry={retry} />
  if (session) {
    return (
      <Navigate
        to={session.user.onboardingCompleted ? "/inbox" : "/onboarding"}
        replace
      />
    )
  }

  return <LoginPage />
}

export function App() {
  if (apiConfigurationError) {
    return (
      <main className="flex min-h-svh items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-xl">
          <ServerCrash aria-hidden="true" />
          <AlertTitle>云端配置缺失</AlertTitle>
          <AlertDescription>{apiConfigurationError}</AlertDescription>
        </Alert>
      </main>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/onboarding" element={<OnboardingRoute />} />
        <Route element={<RequireSession />}>
          <Route element={<AppShell />}>
            <Route
              path="/inbox"
              element={
                <Suspense fallback={<PageLoading />}>
                  <InboxPage />
                </Suspense>
              }
            />
            <Route
              path="/action"
              element={
                <Suspense fallback={<PageLoading />}>
                  <ActionPage />
                </Suspense>
              }
            />
            <Route
              path="/archive"
              element={<Navigate to="/settings?tab=archive" replace />}
            />
            <Route
              path="/weekly"
              element={
                <Suspense fallback={<PageLoading />}>
                  <WeeklyReportPage />
                </Suspense>
              }
            />
            <Route
              path="/settings"
              element={
                <Suspense fallback={<PageLoading />}>
                  <SettingsPage />
                </Suspense>
              }
            />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/inbox" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
