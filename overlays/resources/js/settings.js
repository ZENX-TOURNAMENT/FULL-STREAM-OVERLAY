class AdminSettingsManager {
    constructor() {
        this.simInterval = null;
    }

    async init() {
        this.bindEvents();
        await this.loadTokens();
        await this.loadAutoFetchStatus();
        setInterval(() => this.loadAutoFetchStatus(), 1500);
    }

    bindEvents() {
        document.getElementById('change-pw-btn')?.addEventListener('click', () => this.changePassword());
        document.getElementById('regen-tokens-btn')?.addEventListener('click', () => this.regenerateTokens());
        document.getElementById('start-sim-btn')?.addEventListener('click', () => this.startDemoSimulation());
        document.getElementById('stop-sim-btn')?.addEventListener('click', () => this.stopDemoSimulation());
        document.getElementById('save-auto-fetch-btn')?.addEventListener('click', () => this.saveAutoFetchConfig());
    }

    async loadAutoFetchStatus() {
        try {
            const res = await fetch('../get_auto_fetch_status');
            if (res.status === 200) {
                const data = await res.json();
                const statusEl = document.getElementById('live-sync-status-text');
                const badge = document.getElementById('auto-sync-badge');

                if (statusEl) statusEl.textContent = data.statusText || 'Ready';

                if (badge) {
                    if (data.clientDetected) {
                        badge.textContent = 'VALORANT CLIENT DETECTED';
                        badge.style.background = 'rgba(0, 230, 118, 0.15)';
                        badge.style.color = '#00e676';
                    } else if (data.autoFetchEnabled) {
                        badge.textContent = 'SCANNING FOR GAME...';
                        badge.style.background = 'rgba(0, 242, 254, 0.15)';
                        badge.style.color = '#00f2fe';
                    } else {
                        badge.textContent = 'AUTO-FETCH PAUSED';
                        badge.style.background = 'rgba(255, 42, 95, 0.15)';
                        badge.style.color = '#ff2a5f';
                    }
                }
            }
        } catch (e) {}
    }

    async saveAutoFetchConfig() {
        const enabled = document.getElementById('auto-fetch-toggle').value;
        const mode = document.getElementById('auto-fetch-mode').value;
        const riotId = document.getElementById('cloud-riot-id').value.trim();

        const formData = new FormData();
        formData.append('enabled', enabled);
        formData.append('mode', mode);
        formData.append('riotId', riotId);

        try {
            const res = await fetch('../set_auto_fetch_config', { method: 'POST', body: formData });
            if (res.status === 200) {
                if (typeof successAlertLowerBottom === 'function') {
                    successAlertLowerBottom('Auto-Fetch In-Game Settings Saved!');
                } else {
                    alert('Auto-Fetch settings saved!');
                }
                this.loadAutoFetchStatus();
            }
        } catch (e) {
            console.error(e);
        }
    }


    async changePassword() {
        const pw = document.getElementById('new-pw-input').value.trim();
        if (!pw) {
            alert('Please enter a new password!');
            return;
        }

        const formData = new FormData();
        formData.append('newPassword', pw);

        try {
            const res = await fetch('../change_password', { method: 'POST', body: formData });
            if (res.status === 200) {
                if (typeof successAlertLowerBottom === 'function') {
                    successAlertLowerBottom('Admin Password Changed Successfully!');
                } else {
                    alert('Password changed successfully!');
                }
                document.getElementById('new-pw-input').value = '';
            }
        } catch (e) {
            console.error(e);
        }
    }

    async loadTokens() {
        try {
            const res = await fetch('../print_state');
            if (res.status === 200) {
                const state = await res.json();
                this.renderTokensTable(state.players);
            }
        } catch (e) {
            console.error(e);
        }
    }

    renderTokensTable(players) {
        const tbody = document.getElementById('tokens-table-body');
        if (!tbody || !players) return;

        let html = '';
        for (let i = 0; i < 10; i++) {
            const key = `player_${i}`;
            const p = players[key];
            const isTeam1 = i < 5;

            html += `
            <tr class="${isTeam1 ? 'team-1-row' : 'team-2-row'}">
                <td style="font-weight: 700;">Player Slot #${i + 1}</td>
                <td style="font-weight: 700; color: ${isTeam1 ? 'var(--green-team)' : 'var(--red-team)'}">${isTeam1 ? 'Team 1 (Left)' : 'Team 2 (Right)'}</td>
                <td>
                    <span class="status-badge" style="background: ${p.is_registered ? 'rgba(0,230,118,0.15)' : 'rgba(255,42,95,0.15)'}; color: ${p.is_registered ? '#00e676' : '#ff2a5f'}">
                        ${p.is_registered ? 'REGISTERED & ACTIVE' : 'WAITING CLIENT'}
                    </span>
                </td>
                <td style="font-family: monospace; font-size: 0.95rem; letter-spacing: 1px; color: var(--accent-secondary); font-weight: 700;">
                    ${p.token || 'NO_TOKEN'}
                </td>
                <td>
                    <button class="btn btn-accent" style="padding: 4px 10px; font-size: 0.75rem;" onclick="navigator.clipboard.writeText('${p.token}'); if(typeof successAlertLowerBottom==='function') successAlertLowerBottom('Copied Token to Clipboard!');">
                        <i class="fa-solid fa-copy"></i> Copy Token
                    </button>
                </td>
            </tr>`;
        }
        tbody.innerHTML = html;
    }

    async regenerateTokens() {
        if (!confirm('Regenerate all 10 player tokens? External clients will need the new tokens to reconnect.')) return;
        try {
            const res = await fetch('../regenerate_user_tokens');
            if (res.status === 200) {
                const data = await res.json();
                this.renderTokensTable(data.players);
                if (typeof successAlertLowerBottom === 'function') {
                    successAlertLowerBottom('Player Tokens Regenerated!');
                }
            }
        } catch (e) {}
    }

    startDemoSimulation() {
        if (this.simInterval) clearInterval(this.simInterval);
        if (typeof successAlertLowerBottom === 'function') {
            successAlertLowerBottom('Started Demo Match Simulation Loop!');
        }

        let round = 1;
        let t1Score = 0;
        let t2Score = 0;

        this.simInterval = setInterval(async () => {
            const spikeDown = (Math.random() < 0.4);
            if (Math.random() < 0.2) {
                if (Math.random() < 0.5) t1Score++;
                else t2Score++;
                round++;
            }

            const formData = new FormData();
            formData.append('round_number', round);
            formData.append('team_1_score', t1Score);
            formData.append('team_2_score', t2Score);
            formData.append('spike', spikeDown ? 'down' : 'up');

            await fetch('../change_game_state', { method: 'POST', body: formData });
        }, 3000);
    }

    stopDemoSimulation() {
        if (this.simInterval) {
            clearInterval(this.simInterval);
            this.simInterval = null;
        }
        if (typeof successAlertLowerBottom === 'function') {
            successAlertLowerBottom('Stopped Demo Simulation');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const settingsMgr = new AdminSettingsManager();
    settingsMgr.init();
});
