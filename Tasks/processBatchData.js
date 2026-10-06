const BaseJob = require("../jobs/job");

// ---------------------------------------------------------------------------
//    Simulated Heavy Network/I-O Delay (~10-15 seconds)
//    Simulates downloading or calling external third-party services sequentially.
// ---------------------------------------------------------------------------
class ProcessBatchData extends BaseJob {
  static async handle(payload) {
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
}

module.exports = ProcessBatchData;