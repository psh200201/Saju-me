const GA_MEASUREMENT_ID = 'G-2VPMQ57GVD'

function gtag(...args) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag(...args)
}

export function trackEvent(eventName, params = {}) {
  gtag('event', eventName, params)
}

export function trackPageView(path, title) {
  gtag('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
    send_to: GA_MEASUREMENT_ID,
  })
}
