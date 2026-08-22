/**
 * Global Context Isolation Middleware
 * 
 * Extracts the X-Context-Id from incoming requests and attaches it to req.contextId.
 * This guarantees that downstream services (like logging or specific context-bound logic)
 * know exactly which context generated the request without needing to parse headers manually.
 */
export const contextIsolationMiddleware = (req, res, next) => {
  const contextId = req.headers['x-context-id'];
  
  if (contextId) {
    req.contextId = parseInt(contextId, 10);
  } else {
    req.contextId = null;
  }
  
  // Strict mode: If your application requires EVERY request to be context-bound,
  // you could throw an error here if contextId is missing.
  // For Vanguard, we attach it optionally to preserve existing unbounded APIs.
  
  next();
};
