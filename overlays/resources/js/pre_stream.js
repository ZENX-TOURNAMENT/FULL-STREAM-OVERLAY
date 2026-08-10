class adminPreStreamInterface {
    constructor() {
        this.mapPicksDiv = document.getElementById('map-pick-holder');
        this.team1Abbr = document.getElementById('team1-abbr');
        this.team1Info = document.getElementById('team1-info');
        this.team1Icon = document.getElementById('team1-icon');

        this.team2Abbr = document.getElementById('team2-abbr');
        this.team2Info = document.getElementById('team2-info');
        this.team2Icon = document.getElementById('team2-icon');

        this.saveTeamsBtn = document.getElementById('save-teams-btn');
    }

    async init() {
        await this.loadTeamConfiguration();
        await this.constructMapPickInterface();

        if (this.saveTeamsBtn) {
            this.saveTeamsBtn.addEventListener('click', () => this.saveTeamConfiguration());
        }
    }

    async loadTeamConfiguration() {
        try {
            const res = await fetch('../get_game_configuration');
            if (res.status === 200) {
                const data = await res.json();
                if (data.team_1) {
                    if (this.team1Abbr) this.team1Abbr.value = data.team_1.abbreviation || '';
                    if (this.team1Info) this.team1Info.value = data.team_1.team_info || '';
                    if (this.team1Icon) this.team1Icon.value = data.team_1.icon_link || '';
                }
                if (data.team_2) {
                    if (this.team2Abbr) this.team2Abbr.value = data.team_2.abbreviation || '';
                    if (this.team2Info) this.team2Info.value = data.team_2.team_info || '';
                    if (this.team2Icon) this.team2Icon.value = data.team_2.icon_link || '';
                }
            }
        } catch (err) {
            console.error('Error loading team config:', err);
        }
    }

    async saveTeamConfiguration() {
        const payload = new FormData();
        const team1 = {
            abbreviation: this.team1Abbr ? this.team1Abbr.value.trim() : 'T1',
            team_info: this.team1Info ? this.team1Info.value.trim() : '',
            icon_link: this.team1Icon ? this.team1Icon.value.trim() : ''
        };
        const team2 = {
            abbreviation: this.team2Abbr ? this.team2Abbr.value.trim() : 'T2',
            team_info: this.team2Info ? this.team2Info.value.trim() : '',
            icon_link: this.team2Icon ? this.team2Icon.value.trim() : ''
        };

        payload.append('team_1', JSON.stringify(team1));
        payload.append('team_2', JSON.stringify(team2));

        try {
            const res = await fetch('../set_team_info', {
                method: 'POST',
                body: payload
            });
            if (res.status === 200) {
                if (typeof successAlertLowerBottom === 'function') {
                    successAlertLowerBottom('Team Configuration Saved!');
                } else {
                    alert('Team Configuration Saved!');
                }
            } else {
                if (typeof errorAlertLowerBottom === 'function') {
                    errorAlertLowerBottom('Failed to save team configuration');
                }
            }
        } catch (err) {
            console.error('Error saving team config:', err);
        }
    }

    async updateMapPick(map, action, index) {
        let data = new FormData();
        data.append('index', index);
        data.append('map', map);
        data.append('action', action);

        try {
            const res = await fetch('../set_map_picks', {
                method: 'POST',
                body: data
            });
            if (res.status === 200) {
                if (typeof successAlertLowerBottom === 'function') {
                    successAlertLowerBottom(`Updated Map Pick #${index + 1}`);
                }
            } else {
                if (typeof errorAlertLowerBottom === 'function') {
                    errorAlertLowerBottom('Failed to update map pick');
                }
            }
        } catch (err) {
            console.error('Error updating map pick:', err);
        }
    }

    async constructMapPickInterface() {
        if (!this.mapPicksDiv) return;

        try {
            const res = await fetch('../get_map_picks');
            const json = await res.json();
            if (res.status === 200 && json.picks) {
                let html = '';
                const maps = ['abyss', 'ascent', 'bind', 'breeze', 'fracture', 'haven', 'icebox', 'lotus', 'pearl', 'split', 'sunset'];
                
                for (let i = 0; i < json.picks.length; i++) {
                    const currentMap = json.picks[i][0];
                    const currentAction = json.picks[i][1];
                    const pickerTeam = (i % 2 === 0) ? 'Team 1 Pick' : 'Team 2 Pick';

                    html += `
                    <div style="display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.3); padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid var(--panel-border);">
                        <span style="font-weight: 800; color: var(--accent-primary); width: 24px;">#${i + 1}</span>
                        <div style="flex-grow: 1;">
                            <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 2px;">Map Name</label>
                            <select class="map-pick-map-selector input-field" data-index="${i}">
                                ${maps.map(m => `<option ${currentMap === m ? 'selected' : ''} value="${m}">${m.toUpperCase()}</option>`).join('')}
                            </select>
                        </div>
                        <div style="width: 140px;">
                            <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 2px;">Veto Action (${pickerTeam})</label>
                            <select class="map-pick-action-selector input-field" data-index="${i}">
                                <option ${currentAction === 'ban' ? 'selected' : ''} value="ban">BAN</option>
                                <option ${currentAction === 'attack' ? 'selected' : ''} value="attack">PICK (ATTACK)</option>
                                <option ${currentAction === 'defense' ? 'selected' : ''} value="defense">PICK (DEFENSE)</option>
                            </select>
                        </div>
                    </div>`;
                }
                this.mapPicksDiv.innerHTML = html;

                // Attach listeners
                const mapSelectors = document.getElementsByClassName('map-pick-map-selector');
                const actionSelectors = document.getElementsByClassName('map-pick-action-selector');

                for (let i = 0; i < mapSelectors.length; i++) {
                    mapSelectors[i].addEventListener('change', (e) => {
                        const idx = parseInt(e.target.getAttribute('data-index'));
                        const mapVal = e.target.value;
                        const actionVal = actionSelectors[idx].value;
                        this.updateMapPick(mapVal, actionVal, idx);
                    });

                    actionSelectors[i].addEventListener('change', (e) => {
                        const idx = parseInt(e.target.getAttribute('data-index'));
                        const actionVal = e.target.value;
                        const mapVal = mapSelectors[idx].value;
                        this.updateMapPick(mapVal, actionVal, idx);
                    });
                }
            }
        } catch (err) {
            console.error('Error constructing map pick UI:', err);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const adminPanelLogic = new adminPreStreamInterface();
    adminPanelLogic.init();
});