import './styles/app.css'
import { AppHeader } from './components/AppHeader.jsx'
import { AuthBar } from './components/AuthBar.jsx'
import { AuthLoadingScreen } from './components/AuthLoadingScreen.jsx'
import { GuestGuide } from './components/GuestGuide.jsx'
import { ModeBanner } from './components/ModeBanner.jsx'
import { ProfileCard } from './components/ProfileCard.jsx'
import { ProfileModal } from './components/ProfileModal.jsx'
import { ResultPanel } from './components/ResultPanel.jsx'
import { SajuForm } from './components/SajuForm.jsx'
import { Sidebar } from './components/Sidebar.jsx'
import { Toast } from './components/Toast.jsx'
import { useSajuApp } from './hooks/useSajuApp.js'

function App() {
  const app = useSajuApp()

  if (app.authLoading) {
    return <AuthLoadingScreen />
  }

  return (
    <div className={`layout ${app.blockingUi ? 'is-blocked' : ''}`}>
      <Sidebar
        user={app.user}
        readings={app.readings}
        selectedId={app.selectedId}
        listLoading={app.listLoading}
        profileLoading={app.profileLoading}
        isBusy={app.isBusy}
        authBusy={app.authBusy}
        onNewReading={app.handleNewReading}
        onSelectReading={app.handleSelectReading}
        onGoogleLogin={() => app.handleGoogleLogin('sidebar')}
      />

      <div className="app">
        <AuthBar
          user={app.user}
          userLabel={app.userLabel}
          userAvatar={app.userAvatar}
          isBusy={app.isBusy}
          authBusy={app.authBusy}
          profile={app.profile}
          showOnboarding={app.showOnboarding}
          onOpenProfileEdit={app.openProfileEdit}
          onLogout={app.handleLogout}
          onGoogleLogin={() => app.handleGoogleLogin('auth_bar')}
        />

        {app.profile && (
          <ProfileCard
            profile={app.profile}
            isBusy={app.isBusy}
            onEdit={app.openProfileEdit}
          />
        )}

        <AppHeader user={app.user} readingsCount={app.readingsCount} />

        {!app.user && !app.result && !app.loading && <GuestGuide />}

        {app.viewingSaved && (
          <ModeBanner name={app.form.name} onNewReading={app.handleNewReading} />
        )}

        <SajuForm
          formRef={app.formRef}
          values={app.form}
          onChange={app.setForm}
          onSubmit={app.handleAnalyze}
          formDisabled={app.formDisabled}
          canSubmit={app.canSubmit}
          loading={app.loading}
          viewingSaved={app.viewingSaved}
          user={app.user}
          profile={app.profile}
        />

        {app.error && !app.showOnboarding && !app.showProfileEdit && (
          <p className="error" role="alert">
            {app.error}
          </p>
        )}

        {app.showResultPanel && (
          <ResultPanel
            resultRef={app.resultRef}
            resultRevealKey={app.resultRevealKey}
            name={app.form.name}
            birthDate={app.form.birthDate}
            birthTime={app.form.birthTime}
            gender={app.form.gender}
            calendarType={app.form.calendarType}
            loading={app.loading}
            result={app.result}
            displayResult={app.displayResult}
            viewingSaved={app.viewingSaved}
            isPaywalled={app.isPaywalled}
            paywallActive={app.paywallActive}
            selectedId={app.selectedId}
            isShared={app.isShared}
            shareUrl={app.shareUrl}
            sharing={app.sharing}
            deleting={app.deleting}
            copied={app.copied}
            authBusy={app.authBusy}
            user={app.user}
            onCopy={app.handleCopyResult}
            onShare={app.handleShareResult}
            onDelete={app.handleDeleteReading}
            onNewReading={app.handleNewReading}
            onGoogleLogin={() => app.handleGoogleLogin('paywall')}
            onOpenOnboarding={app.openOnboarding}
          />
        )}
      </div>

      <ProfileModal
        showOnboarding={app.showOnboarding}
        showProfileEdit={app.showProfileEdit}
        profileForm={app.profileForm}
        setProfileForm={app.setProfileForm}
        profileErrors={app.profileErrors}
        profileSaving={app.profileSaving}
        profileNameRef={app.profileNameRef}
        error={app.error}
        onSubmit={app.handleSaveProfile}
        onCancelEdit={() => {
          app.setShowProfileEdit(false)
          app.setError('')
        }}
      />

      <Toast message={app.toast} leaving={app.toastLeaving} />
    </div>
  )
}

export default App
