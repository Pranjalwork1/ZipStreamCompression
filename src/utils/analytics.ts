/**
 * Umami Analytics Utility
 * Wraps window.umami to safely execute tracking events and distinct user identification.
 */

export const initUmami = () => {
  const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID;
  const scriptSrc = import.meta.env.VITE_UMAMI_SRC;

  if (!websiteId || !scriptSrc) {
    console.warn('Umami analytics not initialized: Missing VITE_UMAMI_WEBSITE_ID or VITE_UMAMI_SRC in environment variables.');
    return;
  }

  // Prevent multiple injections
  if (document.querySelector('script[data-website-id]')) {
    return;
  }

  const script = document.createElement('script');
  script.defer = true;
  script.src = scriptSrc;
  script.setAttribute('data-website-id', websiteId);

  document.head.appendChild(script);
};

export const trackEvent = (eventName: string, eventData?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.umami && typeof window.umami.track === 'function') {
    window.umami.track(eventName, eventData);
  } else if (import.meta.env.DEV) {
    console.log(`[Umami Event Tracked - Dev Mode] ${eventName}`, eventData || '');
  }
};

export const identifyUser = (userId: string, sessionData?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.umami && typeof window.umami.identify === 'function') {
    window.umami.identify({ id: userId, ...sessionData });
  } else if (import.meta.env.DEV) {
    console.log(`[Umami User Identified - Dev Mode] User ID: ${userId}`, sessionData || '');
  }
};
