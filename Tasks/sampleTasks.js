/**
 * Sample Task File with Time-Consuming Operations (10–30s)
 * Compatible with dynamic ESM import and your Worker Executor.
 */

// ---------------------------------------------------------------------------
// 1. DEFAULT EXPORT: Heavy CPU Computation (~15-20 seconds)
//    Calculates prime numbers up to a high limit to burn CPU cycles.
// ---------------------------------------------------------------------------
async function run(payload = {}) {
  const limit = payload.limit || 25_000_000;
  console.log(`[Task: Default] Starting prime calculation up to ${limit}...`);
  
  const startTime = Date.now();
  let primeCount = 0;

  for (let i = 2; i <= limit; i++) {
    let isPrime = true;
    const sqrt = Math.sqrt(i);
    for (let j = 2; j <= sqrt; j++) {
      if (i % j === 0) {
        isPrime = false;
        break;
      }
    }
    if (isPrime) primeCount++;
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[Task: Default] Completed in ${durationSec}s. Found ${primeCount} primes.`);

  return {
    task: 'Prime Calculation',
    limit,
    primesFound: primeCount,
    durationSeconds: parseFloat(durationSec),
  };
}

// ---------------------------------------------------------------------------
// 2. NAMED EXPORT: Simulated Heavy Network/I-O Delay (~10-15 seconds)
//    Simulates downloading or calling external third-party services sequentially.
// ---------------------------------------------------------------------------
async function processBatchData(payload = {}) {
  const itemsCount = payload.itemsCount || 12;
  const delayPerItemMs = payload.delayPerItemMs || 1000; // 1s per item = 12s total
  
  console.log(`[Task: processBatchData] Processing ${itemsCount} items sequentially...`);
  const startTime = Date.now();
  const processedItems = [];

  for (let i = 1; i <= itemsCount; i++) {
    // Artificial non-blocking async delay
    await new Promise((resolve) => setTimeout(resolve, delayPerItemMs));
    
    processedItems.push({
      itemId: `ITEM_${i}`,
      status: 'PROCESSED',
      timestamp: new Date().toISOString(),
    });

    console.log(`[Task: processBatchData] Step ${i}/${itemsCount} completed.`);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  
  if (payload.failure) {
    throw new Error("Test error");

  } else {
    return {
      task: 'Batch Data Processing',
      totalItems: processedItems.length,
      durationSeconds: parseFloat(durationSec),
      items: processedItems,
    };
  }
}

// ---------------------------------------------------------------------------
// 3. NAMED EXPORT: Memory & Array Manipulation (~25-30 seconds)
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
  run,
  processBatchData,
  heavyDataTransform
}