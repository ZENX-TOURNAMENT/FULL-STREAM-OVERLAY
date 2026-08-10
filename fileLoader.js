const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class fileLoader {
    constructor() {
        this.isInitialized = false;
        this.mapsAreLocked = false;
        this._adminPassword = null;
        this.configDir = null;

        this.config = {
            players: null,
            gameState: null,
            mapPicks: null,
            timer: null,
            casters: {
                caster_1: { name: "Ailyrr", handle: "@ailyrr", role: "Caster" },
                caster_2: { name: "Vanguard", handle: "@vanguard_val", role: "Analyst" },
                show_lower_third: false
            }
        };
    }

    init(configFilesLocation) {
        this.configDir = path.isAbsolute(configFilesLocation) 
            ? configFilesLocation 
            : path.join(__dirname, configFilesLocation);

        let errors = [];
        if (this.isInitialized) {
            console.log('fileLoader() | Files are already loaded into memory');
            return false;
        }

        try {
            // Read players
            const playersData = fs.readFileSync(path.join(this.configDir, 'players.json'), 'utf8');
            const players = JSON.parse(playersData);
            for (const key in players) {
                if (key.startsWith('player_')) {
                    players[key].last_updated = Date.now();
                }
            }
            this.config.players = players;

            // Read Game State
            const gameStateData = fs.readFileSync(path.join(this.configDir, 'gameState.json'), 'utf8');
            this.config.gameState = JSON.parse(gameStateData);

            // Read Map Picks
            const mapPicksData = fs.readFileSync(path.join(this.configDir, 'mapPicks.json'), 'utf8');
            this.config.mapPicks = JSON.parse(mapPicksData);

            // Read Timer
            const timerData = fs.readFileSync(path.join(this.configDir, 'timer.json'), 'utf8');
            this.config.timer = JSON.parse(timerData);

            // Read Admin Password
            const appConfigData = fs.readFileSync(path.join(this.configDir, 'appConfig.json'), 'utf8');
            const password = JSON.parse(appConfigData);
            this._adminPassword = password.admin_key;

            this.isInitialized = true;
            console.info('fileLoader() | All Config Files Loaded into Memory Successfully!');
        } catch (err) {
            console.error('fileLoader() | Error loading config files:', err.message);
        }

        // Auto check for inactive external players
        setInterval(() => {
            this.checkForInactivePlayers();
        }, 15000);
    }

    saveStateToFile(filename, data) {
        if (!this.configDir) return;
        const filePath = path.join(this.configDir, filename);
        fs.writeFile(filePath, JSON.stringify(data, null, 4), (err) => {
            if (err) console.error(`Failed to save ${filename}:`, err);
        });
    }

    checkPassword(userInput) {
        return this._adminPassword === userInput;
    }

    updateAdminPassword(newPassword) {
        this._adminPassword = newPassword;
        this.saveStateToFile('appConfig.json', { admin_key: newPassword });
        return true;
    }

    generateRandomUserToken() {
        return crypto.randomBytes(12).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
    }

    // --- Timer Logic ---
    setTimer(timeMiliseconds, description) {
        this.config.timer.time = timeMiliseconds;
        this.config.timer.description = description;
        this.config.timer.isOn = true;
        this.config.timer.startTime = Date.now();
        this.saveStateToFile('timer.json', this.config.timer);
    }

    stopTimer() {
        this.config.timer.isOn = false;
        this.saveStateToFile('timer.json', this.config.timer);
    }

    getTimer() {
        return {
            isOn: this.config.timer.isOn,
            time: this.config.timer.time,
            description: this.config.timer.description,
            startTime: this.config.timer.startTime || Date.now()
        };
    }

    // --- Team Setup Logic ---
    updateTeamInfo(team1Data, team2Data) {
        if (team1Data) {
            this.config.gameState.team_1 = {
                ...this.config.gameState.team_1,
                ...team1Data
            };
        }
        if (team2Data) {
            this.config.gameState.team_2 = {
                ...this.config.gameState.team_2,
                ...team2Data
            };
        }
        this.saveStateToFile('gameState.json', this.config.gameState);
    }

    // --- Caster Lower Third Logic ---
    updateCasters(caster1, caster2, showLowerThird) {
        if (caster1) this.config.casters.caster_1 = { ...this.config.casters.caster_1, ...caster1 };
        if (caster2) this.config.casters.caster_2 = { ...this.config.casters.caster_2, ...caster2 };
        if (typeof showLowerThird === 'boolean') this.config.casters.show_lower_third = showLowerThird;
        return this.config.casters;
    }

    getCasters() {
        return this.config.casters;
    }

    // --- Player Logic ---
    checkGameTokenValidity(gameToken) {
        for (const key in this.config.players) {
            if (key.startsWith("player_") && this.config.players[key].token == gameToken) {
                if (!this.config.players[key].is_registered) {
                    return { status: true, key: key };
                } else {
                    return { status: false, message: 'Token is already registered!' };
                }
            }
        }
        return { status: false, message: 'Token does not exist!' };
    }

    findPlayerKeyByToken(gameToken) {
        for (const key in this.config.players) {
            if (key.startsWith('player_') && this.config.players[key].token == gameToken) {
                return { status: true, key: key };
            }
        }
        return { status: false, message: 'Token does not exist!' };
    }

    updatePlayerData(playerDataObject) {
        let playerKey = this.findPlayerKeyByToken(playerDataObject.token);
        if (playerKey.status) {
            playerKey = playerKey.key;
            if (this.config.players[playerKey].is_registered) {
                this.config.players[playerKey].data = {
                    ...this.config.players[playerKey].data,
                    ...playerDataObject
                };
                this.config.players[playerKey].last_updated = Date.now();
                return true;
            }
        }
        return false;
    }

    updatePlayerDirect(playerIndex, playerData) {
        const key = `player_${playerIndex}`;
        if (this.config.players[key]) {
            this.config.players[key].data = {
                ...this.config.players[key].data,
                ...playerData
            };
            this.config.players[key].is_registered = true;
            this.config.players[key].last_updated = Date.now();
            this.saveStateToFile('players.json', this.config.players);
            return true;
        }
        return false;
    }

    regeneratePlayerTokens() {
        for (const key in this.config.players) {
            if (key.startsWith('player_')) {
                this.config.players[key].token = this.generateRandomUserToken();
            }
        }
        this.saveStateToFile('players.json', this.config.players);
        console.log('Regenerated all player tokens');
        return this.config.players;
    }

    // --- Game Logic ---
    getGameConfiguration() {
        return {
            team_1: this.config.gameState.team_1,
            team_2: this.config.gameState.team_2,
            game_flow: this.config.gameState.game_flow,
            team_1_score: this.config.gameState.team_1_score,
            team_2_score: this.config.gameState.team_2_score,
            round_number: this.config.gameState.round_number,
            spike_down: this.config.gameState.spike_down,
            switch_sides: this.config.gameState.switch_sides || false,
            mapPicks: this.config.mapPicks
        };
    }

    getGameState() {
        let roundOver = false;
        if (this.config.gameState.round_over) {
            roundOver = true;
            this.config.gameState.round_over = false;
        }
        return {
            round_number: this.config.gameState.round_number,
            spike_down: this.config.gameState.spike_down,
            round_over: roundOver,
            team_1_score: this.config.gameState.team_1_score,
            team_2_score: this.config.gameState.team_2_score,
            team_1: this.config.gameState.team_1,
            team_2: this.config.gameState.team_2,
            switch_sides: this.config.gameState.switch_sides || false,
            game_flow: this.config.gameState.game_flow
        };
    }

    // --- Map Pick Logic ---
    updateMapPick(targetIndex, map, action) {
        if (!this.config.mapPicks.picks[targetIndex]) {
            this.config.mapPicks.picks[targetIndex] = [];
        }
        this.config.mapPicks.picks[targetIndex] = [map, action];
        this.reCalculateMapFlow();
        this.saveStateToFile('mapPicks.json', this.config.mapPicks);
    }

    reCalculateMapFlow() {
        let chosenMaps = [];
        for (const index in this.config.mapPicks.picks) {
            if (this.config.mapPicks.picks[index] && this.config.mapPicks.picks[index][1] !== 'ban') {
                let mapChosenByTeam = (index % 2 === 0) ? 'team_1' : 'team_2';
                chosenMaps.push([...this.config.mapPicks.picks[index], mapChosenByTeam, 'upcomming']);
            }
        }
        this.config.gameState.game_flow = {};
        for (let i = 0; i < chosenMaps.length; i++) {
            this.config.gameState.game_flow[`map_${i + 1}`] = {
                state: i === 0 ? 'current' : 'upcomming',
                winner: '',
                team_1_score: 0,
                team_2_score: 0,
                map_pick: chosenMaps[i][2],
                map: chosenMaps[i][0]
            };
        }
        this.saveStateToFile('gameState.json', this.config.gameState);
    }

    // Auto kick inactive external clients
    checkForInactivePlayers() {
        let currentDate = Date.now();
        for (const key in this.config.players) {
            if (
                key.startsWith('player_') &&
                this.config.players[key].is_registered &&
                Math.abs(currentDate - this.config.players[key].last_updated) >= 30000
            ) {
                // Don't auto kick if no token set
                if (this.config.players[key].token) {
                    this.config.players[key].last_updated = currentDate;
                    this.config.players[key].is_registered = false;
                    console.log(`User with token: ${this.config.players[key].token} auto kicked due to inactivity`);
                }
            }
        }
    }
}

module.exports = fileLoader;