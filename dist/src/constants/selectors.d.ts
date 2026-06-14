export declare const selectors: {
    readonly matchList: {
        readonly matchRow: "li.table-main__tournamentLiContent[data-event-id]";
        readonly matchInfo: "ul.table-main__matchInfo";
        readonly matchTime: "[data-live-cell=\"time\"]";
        readonly matchLink: "a[data-live-cell=\"matchlink\"]";
        readonly participants: "a.table-main__participants";
        readonly homeTeam: ".table-main__participantHome p";
        readonly awayTeam: ".table-main__participantAway p, .table-main__participantAway div.particiantWidthMobile";
        readonly teamLogos: "img.table-main__participantLogo";
        readonly score: "[data-live-cell=\"score\"]";
        readonly odds: ".table-main__odds[data-oid]";
        readonly leagueContainer: "ul.leagues-list";
        readonly leagueHeader: ".table-main__tournamentNavLi";
        readonly leagueName: ".table-main__leaguesNames";
        readonly countryFlag: ".table-main__countryFlags";
    };
    readonly h2h: {
        readonly component: "#H2HComponent";
        readonly title: "#H2HComponent .componentHeader";
        readonly homeWins: "#H2HComponent .totalWinHome";
        readonly draws: "#H2HComponent .totalDraw";
        readonly awayWins: "#H2HComponent .totalWinAway";
        readonly homePercent: "#H2HComponent .percentage-bar__home";
        readonly drawPercent: "#H2HComponent .percentage-bar__draw";
        readonly awayPercent: "#H2HComponent .percentage-bar__away";
        readonly rows: "#mutual_div .head-to-head__row";
    };
    readonly recentResults: {
        readonly component: "#lastResultsComponent";
        readonly homeResults: "#match-results-home";
        readonly awayResults: "#match-results-away";
        readonly title: ".last-results__title .componentHeader";
        readonly rows: ".head-to-head__row";
        readonly date: ".head-to-head__date .mobileHidden, .head-to-head__date";
        readonly link: "a.table-main__participants";
        readonly homeTeam: ".table-main__participantHome p";
        readonly awayTeam: ".table-main__participantAway p, .table-main__participantAway div.particiantWidthMobile";
        readonly score: ".mainResult.last-results__form-results span, .table-main__result, .mainResult span";
        readonly odds: ".last-results__odds-align .table-main__odd, .table-main__odd";
        readonly form: ".last-results__form-results";
    };
    readonly standings: {
        readonly ajaxLink: "a[href*=\"/standings/\"][href*=\"table=table\"]";
        readonly submenuLink: ".standings__submenu-a";
        readonly table: "#table-type-1.stats-table, .stats-table";
        readonly rows: "#table-type-1 tbody tr, .stats-table tbody tr";
        readonly rank: ".rank.col_rank, [data-type=\"rank\"]";
        readonly team: ".participant_name.col_name, [data-type=\"participant_name\"], [data-type=\"team\"]";
        readonly played: ".matches, .matches_played, [data-type=\"matches\"]";
        readonly wins: ".wins_regular, [data-type=\"wins_regular\"], [data-type=\"wins\"]";
        readonly draws: ".draws, [data-type=\"draws\"]";
        readonly losses: ".losses_regular, [data-type=\"losses_regular\"], [data-type=\"losses\"]";
        readonly goals: ".goals, [data-type=\"goals\"]";
        readonly goalDifference: ".goals_for_against_diff, [data-type=\"goals_for_against_diff\"], [data-type=\"goal_difference\"]";
        readonly points: ".points, [data-type=\"points\"]";
        readonly form: ".form, [data-type=\"form\"]";
    };
    readonly teamPage: {
        readonly title: "h1";
        readonly tabs: ".list-tabs a";
        readonly table: "table.table-main.teaminfo";
        readonly tournamentRows: "table.teaminfo tbody tr[data-tsid]";
        readonly matchRows: "table.teaminfo tbody tr[data-ttid]:not([data-tsid])";
        readonly formIcon: ".table-main__formicon i";
        readonly tournamentLink: ".table-main__tournament";
        readonly detailsLink: "a[href*=\"/football/\"]";
        readonly dateCell: "td.h-text-right.h-text-no-wrap";
        readonly filter: "select[onchange*=\"teaminfo_change_matches\"]";
    };
};
//# sourceMappingURL=selectors.d.ts.map