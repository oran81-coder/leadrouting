import helmet from "helmet";
import { env } from "../config/env";

/**
 * Security middleware configuration using Helmet
 * 
 * Helmet helps secure Express apps by setting various HTTP headers:
 * - Content Security Policy (CSP)
 * - X-Content-Type-Options
 * - X-Frame-Options
 * - X-XSS-Protection
 * - Strict-Transport-Security (HSTS)
 * - And more...
 */
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for development
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.monday.com"], // Allow Monday.com API
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },

  // Strict-Transport-Security (HSTS)
  // Only enable in production with HTTPS
  hsts: env.NODE_ENV === "production" ? {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  } : false,

  // Referrer-Policy
  referrerPolicy: {
    policy: "strict-origin-when-cross-origin",
  },
});

/**
 * Additional security middleware for sanitization
 * Prevents XSS attacks by sanitizing user input
 */
export function sanitizeInput(req: any, _res: any, next: any) {
  // Sanitize request body
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === "object") {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize URL parameters
  if (req.params && typeof req.params === "object") {
    req.params = sanitizeObject(req.params);
  }

  next();
}

/**
 * Recursively sanitize an object
 * Removes potentially dangerous HTML/script tags
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  if (typeof obj === "object") {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  if (typeof obj === "string") {
    return sanitizeString(obj);
  }

  return obj;
}

/**
 * Sanitize a string by removing dangerous HTML/script tags
 * This is a basic implementation - for production, consider using a library like DOMPurify
 */
function sanitizeString(str: string): string {
  // Remove script tags
  str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  
  // Remove iframe tags
  str = str.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");
  
  // Remove on* event handlers (onclick, onerror, etc.)
  str = str.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "");
  str = str.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, "");
  
  // Remove javascript: protocol
  str = str.replace(/javascript:/gi, "");
  
  return str;
}

