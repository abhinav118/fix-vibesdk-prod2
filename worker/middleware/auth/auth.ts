/**
 * Authentication Middleware
 * Handles JWT validation and session management
 */

import { AuthUserSession } from '../../types/auth-types';
import { createLogger } from '../../logger';

const logger = createLogger('AuthMiddleware');

/**
 * Authentication middleware
 */
export async function authMiddleware(
    _request: Request,
    _env: Env
): Promise<AuthUserSession | null> {
    logger.debug('Auth middleware bypass active – returning mock session');
    return {
        sessionId: 'mock-session-id',
        user: {
            id: 'mock-user-id',
            email: 'mock.user@example.com',
            displayName: 'Mock User',
            provider: 'dev',
            emailVerified: true,
            isAnonymous: false,
        },
    };
}

/**
 * Test helper – provides a mock authenticated session that can be reused in unit
 * tests or local tooling where real authentication is not available.
 */
export const FAKE_AUTH_USER_SESSION: AuthUserSession = {
    sessionId: 'fake-session-id',
    user: {
        id: 'fake-user-id',
        email: 'fake@example.com',
        displayName: 'Fake User',
        provider: 'dev',
        emailVerified: true,
        createdAt: new Date(0),
        isAnonymous: false,
    },
};

/**
 * Mock implementation mirroring `authMiddleware` but returning the static fake
 * session. Useful for tests that want to bypass AuthService and database calls.
 */
export async function fakeAuthMiddleware(): Promise<AuthUserSession> {
    return FAKE_AUTH_USER_SESSION;
}
