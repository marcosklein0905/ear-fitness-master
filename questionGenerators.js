// for progressive mode state
let currentLevel = parseInt(localStorage.getItem('currentLevel'), 10) || 1;
let stars = parseInt(localStorage.getItem('stars'), 10) || 0;
export let levels = []; // Dynamically generated levels

// Error tracking for adaptive mode
const frequencyErrors = JSON.parse(localStorage.getItem('frequencyErrors')) || {};

// Increment error count for a frequency
export function trackError(frequency) {
  frequencyErrors[frequency] = (frequencyErrors[frequency] || 0) + 1;
  localStorage.setItem('frequencyErrors', JSON.stringify(frequencyErrors));
}

export function resetErrorStats() {
  localStorage.removeItem('frequencyErrors');
  Object.keys(frequencyErrors).forEach((key) => delete frequencyErrors[key]);
  console.log('Error stats reset successfully.');
}

// Random Question Generator
function randomGenerator(frequencies) {
  return frequencies[Math.floor(Math.random() * frequencies.length)];
}

// Adaptive Question Generator
function adaptiveGenerator(frequencies) {
  const weightedFrequencies = frequencies.flatMap((freq) =>
    Array((frequencyErrors[freq] || 0) + 1).fill(freq)
  );
  return weightedFrequencies[Math.floor(Math.random() * weightedFrequencies.length)];
}

// Algorithm Registry
const generators = {
  random: randomGenerator,
  adaptive: adaptiveGenerator,
};

// Get the generator function by mode
export function getGenerator(mode) {
  return generators[mode];
}


export function setupLevels(frequencies, maxLevel = 5) {
  if (!Array.isArray(frequencies) || frequencies.length === 0) {
    throw new Error('Frequencies array is required to setup levels.');
  }

  // Split frequencies evenly across levels
  const levelSize = Math.ceil(frequencies.length / maxLevel);
  levels = Array.from({ length: maxLevel }, (_, i) =>
    frequencies.slice(i * levelSize, (i + 1) * levelSize)
  );

  console.log('Levels Initialized:', levels);
  return levels;
}


export function progressiveGenerator(frequencies, currentPreset = null) {
  // Use preset-specific frequencies if a preset is active
  const levelFrequencies = currentPreset?.usedFrequencies || frequencies[currentLevel - 1];

  // Validate the level frequencies
  if (!levelFrequencies || levelFrequencies.length === 0) {
    console.error(`No frequencies available for current level: ${currentLevel}`);
    return undefined;
  }

  // Generate a question from the current level
  return levelFrequencies[Math.floor(Math.random() * levelFrequencies.length)];
}



// Increment level and award a star
export function incrementLevel() {
  if (currentLevel < levels.length) {
    currentLevel++;
    stars++;
    saveProgressiveState();
    console.log('Level Up! Current Level:', currentLevel, 'Stars:', stars);
  } else {
    console.log('Already at the highest level!');
  }
}

// Reset progressive mode
export function resetProgressiveMode() {
  currentLevel = 1;
  stars = 0;
  saveProgressiveState();
  console.log('Progressive mode reset to Level 1. Stars cleared.');
}

// Save Progressive State
export function saveProgressiveState() {
  localStorage.setItem('currentLevel', currentLevel);
  localStorage.setItem('stars', stars);
}

// Get current level and stars
export function getProgressiveState() {
  return { currentLevel, stars };
}

// Export the error object for visualization
export function getFrequencyErrors() {
  return frequencyErrors;
}
