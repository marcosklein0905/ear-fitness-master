let filters = []; // Stores filters for My EQ
let challengeFilters = []; // Stores filters for Challenge EQ
let sliderGains = {}; // Stores slider gain values
let challengeData = null; // Stores challenge frequency and gain

let myEQFilter = null; // Single filter for My EQ mode

let currentFilters = []; // Tracks active filters


export function applyEQ(context, sourceNode, challengeData) {
  if (!challengeData || !challengeData.frequency || !challengeData.gain) {
    console.error("Invalid or incomplete challenge data!");
    return;
  }

  const { frequency, gain, filterType = 'peaking', Q = 1 } = challengeData;

  console.trace(`applyEQ invoked with Frequency = ${frequency}, Gain = ${gain}, Filter Type = ${filterType}, Q = ${Q}`);

  // Clear existing filters
  currentFilters.forEach(filter => filter.disconnect());
  currentFilters = [];

  

  // Create and apply new filter
  const filter = context.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = frequency;
  filter.gain.value = gain;
  filter.Q.value = Q;

  currentFilters.push(filter);

  const preGainNode = context.createGain();
  preGainNode.gain.value = 0.25;

  sourceNode.disconnect();
  sourceNode.connect(preGainNode);

  currentFilters.forEach(filter => {
    preGainNode.connect(filter);
    filter.connect(context.destination);
  });

  console.log(`Applied EQ: Frequency = ${frequency}, Gain = ${gain}, Filter Type = ${filterType}, Q = ${Q}`);
}


export function bypass(context, sourceNode) {
    // Disconnect all filters
    currentFilters.forEach(filter => filter.disconnect());
    currentFilters = []; // Clear the filters array

    // Connect the source directly to the destination
    const preGainNode = context.createGain();
    preGainNode.gain.value = 0.25;

    sourceNode.disconnect();
    sourceNode.connect(preGainNode);
    preGainNode.connect(context.destination);

    console.log("Bypass activated. Filters cleared, source connected directly.");
}



export function connectMyEQFilters(context, sourceNode, frequency, gain, filterType = 'peaking', Q = 1) {
    // Clear existing filters
    currentFilters.forEach(filter => filter.disconnect());
    currentFilters = [];

    // Create and configure the filter
    const filter = context.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.gain.value = gain;
    filter.Q.value = Q;

    currentFilters.push(filter);

    const preGainNode = context.createGain();
    preGainNode.gain.value = 0.25;
  
    sourceNode.disconnect();
    sourceNode.connect(preGainNode);
  
    currentFilters.forEach(filter => {
      preGainNode.connect(filter);
      filter.connect(context.destination);
    });
  

    console.log(`My EQ Filter Applied: Frequency = ${frequency} Hz, Gain = ${gain} dB, Filter Type = ${filterType}, Q = ${Q}`);
}




export function updateFilterGain(event) {
    const freq = event.target.dataset.frequency; // Frequency associated with the slider
    const gain = parseFloat(event.target.value); // New gain value from the slider

    // Find the filter corresponding to the frequency
    const filter = filters.find(f => f.frequency.value == freq);
    if (filter) {
        filter.gain.value = gain; // Update the filter's gain
        console.log(`Filter updated: ${freq} Hz -> ${gain} dB`);
    }
}