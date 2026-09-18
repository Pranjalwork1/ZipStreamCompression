/**
 * Umami Analytics Utility
 * Wraps window.umami to safely execute tracking events and distinct user identification.
 */


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
