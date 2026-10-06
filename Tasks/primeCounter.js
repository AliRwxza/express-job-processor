const BaseJob = require("../jobs/job");

// ---------------------------------------------------------------------------
//    Heavy CPU Computation (~15-20 seconds)
//    Calculates prime numbers up to a high limit to burn CPU cycles.
// ---------------------------------------------------------------------------
class PrimeCounter extends BaseJob {
  static async handle (payload) {
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
}

module.exports = PrimeCounter;