export interface TomPlayer {
    userid?: number | string;
    firstname?: string;
    lastname?: string;
    id?: number | string;
    place?: number | string;
}

export interface TomMatch {
    outcome?: number | string;
    player1?: { userid?: string | number };
    player2?: { userid?: string | number };
    player?: { userid?: string | number };
    tablenumber?: string | number;
}

export interface TomRound {
    number?: string | number;
    matches?: {
        match?: TomMatch | TomMatch[];
    };
}

export interface TomPod {
    category?: string | number;
    type?: string;
    rounds?: {
        round?: TomRound | TomRound[];
    };
    player?: TomPlayer | TomPlayer[];
}

export interface TomTournament {
    stage?: string | number;
    standings?: {
        pod?: TomPod | TomPod[];
    };
    data?: {
        name?: string;
        startdate?: string;
        city?: string;
        country?: string;
        id?: string | number;
        organizer?: {
            popid?: string;
            '@_popid'?: string;
        };
    };
    players?: {
        player?: TomPlayer | TomPlayer[];
    };
    pods?: {
        pod?: TomPod | TomPod[];
    };
}
