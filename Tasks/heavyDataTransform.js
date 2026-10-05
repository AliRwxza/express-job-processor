// ---------------------------------------------------------------------------
//    Memory & Array Manipulation (~25-30 seconds)
//    Allocates arrays, transforms them, and aggregates data in chunks.
// ---------------------------------------------------------------------------

async function heavyDataTransform(payload = {}) {
  const iterations = payload.iterations || 30; // ~30 seconds total
  console.log(`[Task: heavyDataTransform] Running ${iterations} transformation cycles...`);
  
  const startTime = Date.now();

  for (let cycle = 1; cycle <= iterations; cycle++) {
    // 1. Allocate a large array in memory
    const largeArray = Array.from({ length: 1_000_000 }, () => Math.random() * 100);

    // 2. Perform transformations
    const transformed = largeArray
      .filter((num) => num > 50)
      .map((num) => Math.sqrt(num) * Math.sin(num));

    // 3. Aggregate
    const sum = transformed.reduce((acc, val) => acc + val, 0);

    // 4. Brief pause between cycles to prevent thread starvation
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    if (cycle % 5 === 0) {
      console.log(`[Task: heavyDataTransform] Cycle ${cycle}/${iterations} complete. Sample Sum: ${sum.toFixed(2)}`);
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  return {
    task: 'Heavy Data Transformation',
    completedCycles: iterations,
    durationSeconds: parseFloat(durationSec),
  };
}

module.exports = {
  type: "heavyDataTransform",
  handler: heavyDataTransform
};