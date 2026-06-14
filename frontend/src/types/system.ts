export interface WelcomeResponse {
    user_type?: string;
}

export interface SystemStatusInfo {
    environment?: string;
    version?: string;
    apiAddress?: string;
    startTime?: string;
    uptime?: string;
}

export interface SystemStatistics {
    users?: number;
    vendors?: number;
    models?: number;
    records?: number;
}

export interface StatusResponse {
    status?: string;
    mode?: string;
    user_type?: string;
    system?: SystemStatusInfo;
    statistics?: SystemStatistics;
    timestamp?: string;
}

export interface UpdateStatusResponse {
    success: boolean;
    has_update: boolean;
    current_version: string;
    latest_version: string;
    release_url?: string;
    release_notes?: string;
    error_message?: string;
}
