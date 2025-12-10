export interface User {
    id: string;
    username: string;
    displayName?: string;
}

export interface AuthResult {
    user: User;
    token?: string;
}