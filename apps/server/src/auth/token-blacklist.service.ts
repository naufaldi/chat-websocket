import { Injectable } from '@nestjs/common';

interface BlacklistedToken {
  tokenId: string;
  expiresAt: number;
}

@Injectable()
export class TokenBlacklistService {
  private readonly blacklist = new Map<string, BlacklistedToken>();
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired tokens every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Add a token to the blacklist
   * @param tokenId - The unique ID of the token (jti claim)
   * @param expiresAt - Unix timestamp when the token naturally expires (in milliseconds)
   */
  add(tokenId: string, expiresAt: number): void {
    this.blacklist.set(tokenId, { tokenId, expiresAt });
  }

  /**
   * Check if a token is blacklisted
   * @param tokenId - The unique ID of the token
   * @returns true if the token is blacklisted
   */
  isBlacklisted(tokenId: string): boolean {
    const entry = this.blacklist.get(tokenId);
    if (!entry) {
      return false;
    }

    // Check if the token has naturally expired
    if (Date.now() > entry.expiresAt) {
      this.blacklist.delete(tokenId);
      return false;
    }

    return true;
  }

  /**
   * Clean up expired entries from the blacklist
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [tokenId, entry] of this.blacklist.entries()) {
      if (now > entry.expiresAt) {
        this.blacklist.delete(tokenId);
      }
    }
  }

  /**
   * Clean up on module destroy
   */
  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}
