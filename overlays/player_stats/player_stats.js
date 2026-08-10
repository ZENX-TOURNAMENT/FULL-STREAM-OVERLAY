async function fetch_player_status_information() {
    try {
        const res = await fetch('../get_player_stats');
        const json = await res.json();
        if (json.status) {
            renderPlayerHUD(json);
        }
    } catch (e) {
        console.error('Error fetching player stats:', e);
    }
}

function renderPlayerHUD(json) {
    const leftContainer = document.getElementById('left-team-container') || document.body;
    const rightContainer = document.getElementById('right-team-container') || document.body;

    let team1Container = document.createElement('div');
    team1Container.classList.add('left-team');

    let team2Container = document.createElement('div');
    team2Container.classList.add('right-team');

    if (!json.switch_teams) {
        team1Container.classList.add('player-list-green-team');
        team2Container.classList.add('player-list-red-team');
    } else {
        team1Container.classList.add('player-list-red-team');
        team2Container.classList.add('player-list-green-team');
    }

    // Build Team 1 (5 Players Left)
    for (let i = 0; i < 5; i++) {
        const p = json.team_1[`player_${i}`] || { is_registered: true, username: `Player ${i+1}`, agent: 'Jett', health: 100, shield: 50, weapon: 'vandal' };
        team1Container.innerHTML += buildSinglePlayerCard(p);
    }

    // Build Team 2 (5 Players Right)
    for (let i = 0; i < 5; i++) {
        const p = json.team_2[`player_${i}`] || { is_registered: true, username: `Player ${i+6}`, agent: 'Reyna', health: 100, shield: 50, weapon: 'vandal' };
        team2Container.innerHTML += buildSinglePlayerCard(p);
    }

    leftContainer.innerHTML = '';
    rightContainer.innerHTML = '';
    leftContainer.appendChild(team1Container);
    rightContainer.appendChild(team2Container);
}

function buildSinglePlayerCard(p) {
    if (p.health === 0 || p.is_dead) {
        return `<div class="player-stat-container player-dead">
            <div class="has-spike-indicator ${p.has_spike ? 'has-spike' : ''}">
                <img src="../visual_assets/spike_white.png" alt="spike">
            </div>
            <div class="player-status">
                <img class="player-agent" src="../visual_assets/agent_icons/${(p.agent || 'jett').toLowerCase()}/${(p.agent || 'jett').toLowerCase()}_icon.webp" onerror="this.style.opacity=0.3">
            </div>
            <div class="player-health">
                <div style="width: 0%;" class="player-health-bar"></div>
            </div>
            <div class="player-name">
                <span class="player-name-container">${p.username || 'PLAYER'}</span>
                <span class="player-health-count">
                    <span class="player-health-count-number" style="color: #8a96a8;">DEAD</span>
                </span>               
            </div>
        </div>`;
    }

    let ultNeeded = p.ult_points_needed || 7;
    let ultGained = p.ult_points_gained || 0;
    let ultPointsHTML = '';

    if (ultGained >= ultNeeded && ultNeeded > 0) {
        ultPointsHTML = `
        <div class="player-ult-indicator-container">
            <img class="border" src="../visual_assets/ultimage-charged-border.svg">
            <span style="font-weight: 900; font-size: 0.75rem; color: #fff; position: absolute;">READY</span>
        </div>`;
    } else {
        for (let n = 0; n < ultNeeded; n++) {
            ultPointsHTML += `<img class="player-ult-point ${ultGained > n ? 'full-point' : ''}" src="../visual_assets/diamond-solid.svg">`;
        }
    }

    return `
    <div class="player-stat-container">
        <div class="has-spike-indicator ${p.has_spike ? 'has-spike' : ''}">
            <img src="../visual_assets/spike_white.png" alt="spike">
        </div>
        <div class="player-status">
            <img class="player-agent" src="../visual_assets/agent_icons/${(p.agent || 'jett').toLowerCase()}/${(p.agent || 'jett').toLowerCase()}_icon.webp" onerror="this.style.opacity=0.5">
            <span class="player-weapon" style="font-weight: 700; color: #fff; font-size: 0.85rem;">${(p.weapon || 'vandal').toUpperCase()}</span>
            <span class="player-credits">
                $${p.credits ?? 800}
            </span>
        </div>
        <div class="player-health">
            <div style="width: ${p.health}%;" class="player-health-bar"></div>
        </div>
        <div class="player-name">
            <span class="player-name-container">${p.username || 'PLAYER'}</span>
            <div class="player-ult-point-container">
                ${ultPointsHTML}
            </div>
            <span class="player-health-count">
                <div class="player-shield-outline ${!p.shield ? 'shield-down' : ''}">
                    <div class="player-shield-count">
                        ${p.shield || 0}
                    </div>
                </div>
                <span class="player-health-count-number">${p.health}</span>
            </span>               
        </div>
    </div>`;
}

// Socket.io Realtime Listener
if (typeof io !== 'undefined') {
    const socket = io();
    socket.on('playerUpdate', () => {
        fetch_player_status_information();
    });
    socket.on('stateUpdate', () => {
        fetch_player_status_information();
    });
}

// Initial fetch & interval fallback
fetch_player_status_information();
setInterval(fetch_player_status_information, 1000);

