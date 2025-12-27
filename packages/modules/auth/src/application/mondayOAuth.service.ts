/**
 * Monday.com OAuth Service
 * Handles OAuth authentication flow for organization registration
 */

import { log } from "../../../../core/src/shared/logger";

export interface MondayOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface MondayUserInfo {
  id: string;
  name: string;
  email: string;
  photo_original?: string;
  photo_thumb?: string;
  account?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface MondayTokenResponse {
  access_token: string;
  token_type: string;
  scope?: string;
}

export class MondayOAuthService {
  private config: MondayOAuthConfig;

  constructor(config: MondayOAuthConfig) {
    this.config = config;
  }

  /**
   * Generate Monday.com OAuth authorization URL
   */
  getMondayAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
    });

    if (state) {
      params.append("state", state);
    }

    const url = `https://auth.monday.com/oauth2/authorize?${params.toString()}`;
    log.debug("Generated Monday OAuth URL", { url });
    return url;
  }

  /**
   * Exchange authorization code for access token
   */
  async handleMondayCallback(code: string): Promise<string> {
    log.info("Exchanging Monday.com authorization code for access token");

    try {
      const response = await fetch("https://auth.monday.com/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code: code,
          redirect_uri: this.config.redirectUri,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        log.error("Monday OAuth token exchange failed", {
          status: response.status,
          error: errorText,
        });
        throw new Error(`Failed to exchange code for token: ${response.status}`);
      }

      const data = (await response.json()) as MondayTokenResponse;

      if (!data.access_token) {
        log.error("No access token in Monday OAuth response", { data });
        throw new Error("No access token received from Monday.com");
      }

      log.info("Successfully exchanged code for Monday access token");
      return data.access_token;
    } catch (error) {
      log.error("Error in Monday OAuth callback", { error });
      throw error;
    }
  }

  /**
   * Fetch Monday.com user information
   */
  async getMondayUserInfo(accessToken: string): Promise<MondayUserInfo> {
    log.info("Fetching Monday.com user info");

    try {
      const query = `
        query {
          me {
            id
            name
            email
            photo_original
            photo_thumb
            account {
              id
              name
              slug
            }
          }
        }
      `;

      const response = await fetch("https://api.monday.com/v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: accessToken,
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        log.error("Failed to fetch Monday user info", {
          status: response.status,
          error: errorText,
        });
        throw new Error(`Failed to fetch user info: ${response.status}`);
      }

      const data = await response.json();

      if (data.errors) {
        log.error("Monday GraphQL errors", { errors: data.errors });
        throw new Error(`Monday API error: ${JSON.stringify(data.errors)}`);
      }

      if (!data.data?.me) {
        log.error("No user data in Monday response", { data });
        throw new Error("No user data received from Monday.com");
      }

      const userInfo = data.data.me as MondayUserInfo;
      log.info("Successfully fetched Monday user info", {
        userId: userInfo.id,
        email: userInfo.email,
        accountId: userInfo.account?.id,
      });

      return userInfo;
    } catch (error) {
      log.error("Error fetching Monday user info", { error });
      throw error;
    }
  }

  /**
   * Validate Monday.com access token
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      await this.getMondayUserInfo(accessToken);
      return true;
    } catch (error) {
      log.warn("Monday token validation failed", { error });
      return false;
    }
  }
}

/**
 * Create Monday OAuth service instance from environment variables
 */
export function createMondayOAuthService(config: MondayOAuthConfig): MondayOAuthService {
  if (!config.clientId || !config.clientSecret || !config.redirectUri) {
    throw new Error("Missing Monday OAuth configuration. Check MONDAY_OAUTH_* environment variables.");
  }

  return new MondayOAuthService(config);
}

