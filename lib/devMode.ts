export function isDevMode(): boolean {
    if (process.env.NODE_ENV === "development") {
        return true;
    }
    if (typeof window !== "undefined") {
        const hostname = window.location.hostname;
        if (hostname === "localhost" || hostname === "127.0.0.1") {
            return true;
        }
        try {
            const search = window.location.search;
            if (search) {
                const params = new URLSearchParams(search);
                if (params.get("dev") === "true" || params.get("dev") === "1" || params.get("debug") === "true") {
                    return true;
                }
            }
            if (window.localStorage && window.localStorage.getItem("dev") === "true") {
                return true;
            }
        } catch {
            // Ignore any cross-origin or security exceptions
        }
    }
    return false;
}
