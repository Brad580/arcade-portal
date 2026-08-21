const playerNameInput = document.getElementById("playerName");
const playerClassSelect = document.getElementById("playerClass");
const startGameBtn = document.getElementById("startGameBtn");
const caveBtn = document.getElementById("caveBtn");
const dungeonBtn = document.getElementById("dungeonBtn");
const tavernBtn = document.getElementById("tavernBtn");
const shopBtn = document.getElementById("shopBtn");
const attackBtn = document.getElementById("attackBtn");
const defendBtn = document.getElementById("defendBtn");
const specialBtn = document.getElementById("specialBtn");
const healBtn = document.getElementById("healBtn");
const runBtn = document.getElementById("runBtn");
const restartBtn = document.getElementById("restartBtn");

const playerDisplayName = document.getElementById("playerDisplayName");
const playerClassDisplay = document.getElementById("playerClassDisplay");
const playerHpDisplay = document.getElementById("playerHp");
const playerMaxHpDisplay = document.getElementById("playerMaxHp");
const playerDefenseDisplay = document.getElementById("playerDefense");
const playerPotionsDisplay = document.getElementById("playerPotions");
const playerGoldDisplay = document.getElementById("playerGold");
const playerWinsDisplay = document.getElementById("playerWins");
const playerHpFill = document.getElementById("playerHpFill");
const enemyHpFill = document.getElementById("enemyHpFill");

const enemyNameDisplay = document.getElementById("enemyName");
const enemyHpDisplay = document.getElementById("enemyHp");
const enemyMaxHpDisplay = document.getElementById("enemyMaxHp");
const enemyPowerDisplay = document.getElementById("enemyPower");
const enemyThreatDisplay = document.getElementById("enemyThreat");
const battleLog = document.getElementById("battleLog");

const classTemplates = {
  warrior: {
    label: "Warrior",
    maxHp: 125,
    attackMin: 14,
    attackMax: 22,
    defenseMin: 8,
    defenseMax: 14,
    heals: 3,
    healMin: 16,
    healMax: 26,
    specialName: "Heavy Strike"
  },
  paladin: {
    label: "Paladin",
    maxHp: 115,
    attackMin: 12,
    attackMax: 20,
    defenseMin: 7,
    defenseMax: 13,
    heals: 4,
    healMin: 18,
    healMax: 28,
    specialName: "Smite"
  },
  mage: {
    label: "Mage",
    maxHp: 90,
    attackMin: 18,
    attackMax: 28,
    defenseMin: 4,
    defenseMax: 8,
    heals: 3,
    healMin: 14,
    healMax: 24,
    specialName: "Fireball"
  },
  rogue: {
    label: "Rogue",
    maxHp: 100,
    attackMin: 15,
    attackMax: 24,
    defenseMin: 5,
    defenseMax: 10,
    heals: 3,
    healMin: 15,
    healMax: 24,
    specialName: "Backstab"
  }
};

const enemyPool = [
  { name: "Goblin Raider", baseHp: 80, power: "Wild Slash" },
  { name: "Skeleton Knight", baseHp: 95, power: "Bone Cleave" },
  { name: "Cave Troll", baseHp: 110, power: "Crushing Smash" },
  { name: "Dark Mage", baseHp: 90, power: "Shadow Bolt" },
  { name: "Wolf Rider", baseHp: 88, power: "Feral Lunge" }
];

let player = {};
let enemy = {};
let gameActive = false;
let adventureStarted = false;
let awaitingNextBattle = false;
let dangerLevel = 1;
let currentLocation = "road";
let runSaved = false;

async function saveDndRunToBackend(finalScore) {
  if (finalScore <= 0) {
    return;
  }

  try {
    await fetch("http://localhost:3000/scores", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        gameName: "dnd",
        score: finalScore
      })
    });
  } catch (error) {
    console.error("Failed to save D&D score:", error);
  }
}

function saveDndRun() {
  if ((player.wins ?? 0) <= 0 || runSaved) {
    return;
  }

  const username = localStorage.getItem("arcadeCurrentUser") || "Guest";
  const leaderboard = JSON.parse(localStorage.getItem("dndLeaderboard") || "[]");

  leaderboard.push({
    username,
    score: player.wins
  });

  leaderboard.sort((a, b) => b.score - a.score);
  const trimmed = leaderboard.slice(0, 10);
  localStorage.setItem("dndLeaderboard", JSON.stringify(trimmed));
  saveDndRunToBackend(player.wins);
  runSaved = true;
}

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addLog(message) {
  const entry = document.createElement("p");
  entry.className = "log-entry";
  entry.textContent = message;
  battleLog.prepend(entry);
}

function updateUi() {
  playerDisplayName.textContent = player.name || "Hero";
  playerClassDisplay.textContent = player.classLabel || "Warrior";
  playerHpDisplay.textContent = player.hp ?? 100;
  playerMaxHpDisplay.textContent = player.maxHp ?? 100;
  playerDefenseDisplay.textContent = player.defense ?? 0;
  playerPotionsDisplay.textContent = player.healsLeft ?? 3;
  playerGoldDisplay.textContent = player.gold ?? 0;
  playerWinsDisplay.textContent = player.wins ?? 0;

  if (playerHpFill) {
    const playerHpPercent = Math.max(0, Math.min(100, ((player.hp ?? 0) / (player.maxHp || 1)) * 100));
    playerHpFill.style.width = `${playerHpPercent}%`;
  }

  enemyNameDisplay.textContent = enemy.name || "Goblin Raider";
  enemyHpDisplay.textContent = enemy.hp ?? 80;
  enemyMaxHpDisplay.textContent = enemy.maxHp ?? 80;
  enemyPowerDisplay.textContent = enemy.power || "Wild Slash";
  enemyThreatDisplay.textContent = enemy.threat ?? 1;

  if (enemyHpFill) {
    const enemyHpPercent = Math.max(0, Math.min(100, ((enemy.hp ?? 0) / (enemy.maxHp || 1)) * 100));
    enemyHpFill.style.width = `${enemyHpPercent}%`;
  }

  if (specialBtn) {
    specialBtn.textContent = player.specialName || "Special";
  }
}

function setActionButtons(enabled) {
  attackBtn.disabled = !enabled;
  defendBtn.disabled = !enabled;
  specialBtn.disabled = !enabled;
  healBtn.disabled = !enabled;
  runBtn.disabled = !enabled;
}

function setAdventureButtons(enabled) {
  if (caveBtn) {
    caveBtn.disabled = !enabled;
  }

  if (dungeonBtn) {
    dungeonBtn.disabled = !enabled;
  }

  if (tavernBtn) {
    tavernBtn.disabled = !enabled;
  }

  if (shopBtn) {
    shopBtn.disabled = !enabled;
  }
}

function createEnemy(location = "road") {
  let filteredEnemies = enemyPool;
  let hpBoost = (dangerLevel - 1) * 14;
  let damageBoost = (dangerLevel - 1) * 2;

  if (location === "cave") {
    filteredEnemies = enemyPool.filter(enemyOption =>
      ["Goblin Raider", "Wolf Rider", "Cave Troll"].includes(enemyOption.name)
    );
    hpBoost += 8;
    damageBoost += 1;
  }

  if (location === "dungeon") {
    filteredEnemies = enemyPool.filter(enemyOption =>
      ["Skeleton Knight", "Dark Mage", "Cave Troll"].includes(enemyOption.name)
    );
    hpBoost += 18;
    damageBoost += 3;
  }

  const template = filteredEnemies[randomNumber(0, filteredEnemies.length - 1)];

  enemy = {
    name: template.name,
    power: template.power,
    hp: template.baseHp + hpBoost,
    maxHp: template.baseHp + hpBoost,
    threat: dangerLevel,
    damageMin: 8 + damageBoost,
    damageMax: 16 + damageBoost,
    location
  };
}

function buildPlayer() {
  const chosenClass = playerClassSelect.value;
  const classStats = classTemplates[chosenClass];
  const chosenName = playerNameInput.value.trim() || "Hero";

  player = {
    name: chosenName,
    classKey: chosenClass,
    classLabel: classStats.label,
    hp: classStats.maxHp,
    maxHp: classStats.maxHp,
    defense: 0,
    healsLeft: classStats.heals,
    wins: 0,
    gold: 0,
    attackMin: classStats.attackMin,
    attackMax: classStats.attackMax,
    defenseMin: classStats.defenseMin,
    defenseMax: classStats.defenseMax,
    healMin: classStats.healMin,
    healMax: classStats.healMax,
    specialName: classStats.specialName,
    specialUsed: false
  };
}

function startGame() {
  buildPlayer();
  adventureStarted = true;
  awaitingNextBattle = false;
  dangerLevel = 1;
  runSaved = false;
  currentLocation = "road";
  createEnemy(currentLocation);
  gameActive = true;
  battleLog.innerHTML = "";
  addLog(`${player.name} the ${player.classLabel} enters the frontier.`);
  addLog(`A ${enemy.name} appears on the road. Your adventure begins.`);
  setActionButtons(true);
  setAdventureButtons(false);
  updateUi();
}

function beginEncounter(location) {
  if (!adventureStarted || gameActive) {
    return;
  }

  currentLocation = location;
  awaitingNextBattle = false;
  gameActive = true;
  player.defense = 0;
  player.specialUsed = false;

  if (location === "tavern") {
    const tavernHeal = Math.min(30, player.maxHp - player.hp);
    player.hp += tavernHeal;

    if (player.healsLeft < 5) {
      player.healsLeft += 1;
    }

    addLog(`${player.name} visits the tavern, restores ${tavernHeal} HP, and gains 1 potion.`);
    addLog("After resting, a shady troublemaker starts a fight outside the tavern.");
    createEnemy("road");
  } else if (location === "shop") {
    const potionCost = 20;
    const potionGain = 2;

    if (player.gold >= potionCost) {
      player.gold -= potionCost;
      player.healsLeft += potionGain;
      addLog(`${player.name} visits the shop and buys ${potionGain} potions for ${potionCost} gold.`);
    } else {
      addLog(`${player.name} visits the shop but does not have enough gold for supplies.`);
    }

    player.hp = Math.min(player.hp + 8, player.maxHp);
    createEnemy("road");
    addLog(`On the way back from the shop, ${enemy.name} ambushes ${player.name}.`);
  } else {
    player.hp = Math.min(player.hp + 12, player.maxHp);

    if (player.healsLeft < 5) {
      player.healsLeft += 1;
    }

    createEnemy(location);

    if (location === "cave") {
      addLog(`${player.name} explores a cave, restores 12 HP, and spots a ${enemy.name}.`);
    }

    if (location === "dungeon") {
      addLog(`${player.name} enters a dungeon, restores 12 HP, and faces a ${enemy.name}.`);
    }
  }

  setActionButtons(true);
  setAdventureButtons(false);
  updateUi();
}

function finishAdventure(message) {
  gameActive = false;
  awaitingNextBattle = false;
  setActionButtons(false);
  setAdventureButtons(false);

  if (player.wins > 0) {
    saveDndRun();
  }

  addLog(message);
}

function winBattle() {
  gameActive = false;
  awaitingNextBattle = true;
  player.wins += 1;
  dangerLevel += 1;

  const goldReward = randomNumber(12, 22) + enemy.threat * 4;
  player.gold += goldReward;

  setActionButtons(false);
  setAdventureButtons(true);
  addLog(`${player.name} defeated the ${enemy.name} and earned ${goldReward} gold! Choose where to go next: cave, dungeon, tavern, or shop.`);
  updateUi();
}

function flashCard(selector) {
  const card = document.querySelector(selector);

  if (!card) {
    return;
  }

  card.classList.remove("hit-flash");
  void card.offsetWidth;
  card.classList.add("hit-flash");
}

function enemyTurn() {
  if (!gameActive) {
    return;
  }

  const enemyDamage = randomNumber(enemy.damageMin, enemy.damageMax);
  const reducedDamage = Math.max(enemyDamage - player.defense, 0);

  player.hp -= reducedDamage;
  flashCard(".player-card");
  addLog(`${enemy.name} uses ${enemy.power} for ${enemyDamage} damage. ${player.name} blocks ${player.defense} and takes ${reducedDamage}.`);

  player.defense = 0;

  if (player.hp <= 0) {
    player.hp = 0;
    updateUi();
    finishAdventure(`${player.name} has fallen after winning ${player.wins} battle${player.wins === 1 ? "" : "s"}.`);
    return;
  }

  updateUi();
}

function attack() {
  if (!gameActive) {
    return;
  }

  let damage = randomNumber(player.attackMin, player.attackMax);

  if (player.classKey === "rogue" && Math.random() < 0.25) {
    damage += 10;
    addLog(`${player.name} lands a critical strike from the shadows!`);
  }

  if (player.classKey === "paladin" && Math.random() < 0.2) {
    const holyHeal = 6;
    player.hp = Math.min(player.hp + holyHeal, player.maxHp);
    addLog(`${player.name} is blessed and restores ${holyHeal} HP.`);
  }

  enemy.hp -= damage;
  flashCard(".enemy-card");
  addLog(`${player.name} attacks ${enemy.name} for ${damage} damage.`);

  if (enemy.hp <= 0) {
    enemy.hp = 0;
    updateUi();
    winBattle();
    return;
  }

  updateUi();
  enemyTurn();
}

function defend() {
  if (!gameActive) {
    return;
  }

  player.defense = randomNumber(player.defenseMin, player.defenseMax);

  if (player.classKey === "warrior") {
    player.defense += 2;
  }

  addLog(`${player.name} braces and gains ${player.defense} defense.`);
  updateUi();
  enemyTurn();
}

function useSpecial() {
  if (!gameActive || player.specialUsed) {
    return;
  }

  player.specialUsed = true;

  if (player.classKey === "warrior") {
    const damage = randomNumber(24, 34);
    enemy.hp -= damage;
    flashCard(".enemy-card");
    addLog(`${player.name} uses Heavy Strike and crushes ${enemy.name} for ${damage} damage!`);
  }

  if (player.classKey === "paladin") {
    const damage = randomNumber(18, 28);
    const healAmount = 10;
    enemy.hp -= damage;
    flashCard(".enemy-card");
    player.hp = Math.min(player.hp + healAmount, player.maxHp);
    addLog(`${player.name} uses Smite for ${damage} damage and restores ${healAmount} HP.`);
  }

  if (player.classKey === "mage") {
    const damage = randomNumber(26, 38);
    enemy.hp -= damage;
    flashCard(".enemy-card");
    addLog(`${player.name} casts Fireball and burns ${enemy.name} for ${damage} damage!`);
  }

  if (player.classKey === "rogue") {
    const damage = randomNumber(20, 30);
    enemy.hp -= damage;
    flashCard(".enemy-card");
    player.defense += 6;
    addLog(`${player.name} uses Backstab for ${damage} damage and slips into cover for +6 defense.`);
  }

  if (enemy.hp <= 0) {
    enemy.hp = 0;
    updateUi();
    winBattle();
    return;
  }

  updateUi();
  enemyTurn();
}

function heal() {
  if (!gameActive) {
    return;
  }

  if (player.healsLeft <= 0) {
    addLog(`${player.name} has no healing potions left.`);
    return;
  }

  let healAmount = randomNumber(player.healMin, player.healMax);

  if (player.classKey === "mage") {
    healAmount += 4;
  }

  player.hp = Math.min(player.hp + healAmount, player.maxHp);
  player.healsLeft -= 1;
  addLog(`${player.name} heals for ${healAmount} HP. Potions left: ${player.healsLeft}.`);
  updateUi();
  enemyTurn();
}

function runAway() {
  if (!gameActive) {
    return;
  }

  let escapeChance = 0.5;

  if (player.classKey === "rogue") {
    escapeChance = 0.75;
  }

  const escaped = Math.random() < escapeChance;

  if (escaped) {
    gameActive = false;
    awaitingNextBattle = true;
    setActionButtons(false);
    setAdventureButtons(true);
    addLog(`${player.name} escaped safely. Choose where to go next: cave, dungeon, tavern, or shop.`);

    if (player.wins > 0 && !runSaved) {
      saveDndRun();
    }

    updateUi();
  } else {
    addLog(`${player.name} tried to run, but ${enemy.name} blocked the path.`);
    enemyTurn();
  }
}

function resetGame() {
  if (adventureStarted && player.wins > 0 && !runSaved) {
    saveDndRun();
  }

  adventureStarted = false;
  awaitingNextBattle = false;
  gameActive = false;
  dangerLevel = 1;
  currentLocation = "road";
  runSaved = false;

  player = {
    name: "Hero",
    classKey: "warrior",
    classLabel: "Warrior",
    hp: 100,
    maxHp: 100,
    defense: 0,
    healsLeft: 3,
    wins: 0,
    gold: 0,
    attackMin: 14,
    attackMax: 22,
    defenseMin: 8,
    defenseMax: 14,
    healMin: 16,
    healMax: 26,
    specialName: "Heavy Strike",
    specialUsed: false
  };

  enemy = {
    name: "Goblin Raider",
    power: "Wild Slash",
    hp: 80,
    maxHp: 80,
    threat: 1,
    damageMin: 8,
    damageMax: 16,
    location: "road"
  };

  battleLog.innerHTML = "Enter your hero name, choose a class, and start the adventure.";
  setActionButtons(false);
  setAdventureButtons(false);
  updateUi();
}

function attachButtonListener(button, handler) {
  if (button) {
    button.addEventListener("click", handler);
  }
}

attachButtonListener(startGameBtn, startGame);
attachButtonListener(caveBtn, () => beginEncounter("cave"));
attachButtonListener(dungeonBtn, () => beginEncounter("dungeon"));
attachButtonListener(tavernBtn, () => beginEncounter("tavern"));
attachButtonListener(shopBtn, () => beginEncounter("shop"));
attachButtonListener(attackBtn, attack);
attachButtonListener(defendBtn, defend);
attachButtonListener(specialBtn, useSpecial);
attachButtonListener(healBtn, heal);
attachButtonListener(runBtn, runAway);
attachButtonListener(restartBtn, resetGame);

resetGame();
